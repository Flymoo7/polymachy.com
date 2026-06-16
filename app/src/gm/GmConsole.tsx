import { useState } from 'react';
import type { SystemDefinition, CharacterDoc, RosterEntry, RollResult } from '../types';
import { loadRoster, loadCharacter, load, save } from '../storage';
import { genId } from '../defaults';
import { CharacterSummary } from './CharacterSummary';
import { useSession } from '../net/SessionProvider';
import type { LogEntry, Initiative, Proposal } from '../net/SessionProvider';
import { SessionBar } from '../net/SessionBar';
import { computeResolved, performRoll, rollResultText } from '../engineBridge';
import { BG_PRESETS } from '../backgrounds';
import { downscaleImage } from '../image';

interface Props {
  def: SystemDefinition;
  onExit: () => void;
  onOpenChar: (id: string) => void;
}

const byInit = (a: { init: number }, b: { init: number }) => b.init - a.init;
const EMPTY_INIT: Initiative = { list: [], turn: 0 };

export function GmConsole({ def, onExit, onOpenChar }: Props) {
  const s = useSession();

  // local (offline) state
  const [localRoster] = useState<RosterEntry[]>(loadRoster);
  const [localChars] = useState<Record<string, CharacterDoc>>(() => {
    const m: Record<string, CharacterDoc> = {};
    for (const r of loadRoster()) { const c = loadCharacter(r.id); if (c) m[r.id] = c; }
    return m;
  });
  const [shown, setShown] = useState<string[]>(() => loadRoster().slice(0, 2).map((r) => r.id));
  const [cols, setCols] = useState(2);
  const [localLog, setLocalLog] = useState<LogEntry[]>(() => load('gm:log', () => []));
  const [localStatuses, setLocalStatuses] = useState<Record<string, string[]>>(() => load('gm:status', () => ({})));
  const [localInit, setLocalInit] = useState<Initiative>(() => load('gm:initiative', () => EMPTY_INIT));
  const [noteText, setNoteText] = useState('');
  const [addName, setAddName] = useState('');
  const [addInit, setAddInit] = useState(10);

  // when live, everything comes from / goes to the shared session
  const live = s.connected;
  const characters = live ? s.characters : localChars;
  const roster: RosterEntry[] = live
    ? Object.values(s.characters).map((c) => ({ id: c.id, name: c.meta.name }))
    : localRoster;
  const log = live ? s.log : localLog;
  const initiative = live ? s.initiative : localInit;
  const statuses = live ? s.statuses : localStatuses;
  const displayed = live ? Object.keys(characters) : shown;

  const pushLog = (text: string) => {
    if (live) { s.appendLog(text); return; }
    setLocalLog((l) => { const next = [{ at: Date.now(), text, by: 'GM' }, ...l].slice(0, 100); save('gm:log', next); return next; });
  };
  const clearLog = () => { if (live) return; setLocalLog([]); save('gm:log', []); };

  const onRoll = (charName: string, r: RollResult) => {
    pushLog(`${charName} · ${r.label}: ${rollResultText(r, def.dice.model)}`);
  };

  const toggleShown = (id: string) => setShown((sh) => sh.includes(id) ? sh.filter((x) => x !== id) : [...sh, id]);

  const toggleStatus = (charId: string, statusId: string) => {
    const cur = statuses[charId] ?? [];
    const next = cur.includes(statusId) ? cur.filter((x) => x !== statusId) : [...cur, statusId];
    const cName = characters[charId]?.meta.name ?? 'Character';
    const sName = ((def.statusEffects ?? []) as any[]).find((x) => x.id === statusId)?.label ?? statusId;
    if (live) { s.setCharacterStatuses(charId, next); }
    else { const m = { ...localStatuses, [charId]: next }; setLocalStatuses(m); save('gm:status', m); }
    pushLog(`${cName} ${cur.includes(statusId) ? 'cleared' : 'gained'} ${sName}`);
  };

  const approve = (p: Proposal) => {
    if (p.kind === 'roll' && p.rollId) {
      const char = characters[p.charId];
      if (char) {
        const r = performRoll(def, p.rollId, computeResolved(def, char.data));
        pushLog(`✔ ${p.charName} · ${r.label}: ${rollResultText(r, def.dice.model)}`);
      } else {
        pushLog(`✔ approved ${p.charName} · ${p.label}`);
      }
    } else {
      pushLog(`✔ ${p.charName}: ${p.label} (approved)`);
    }
    s.removeProposal(p.id);
  };
  const deny = (p: Proposal) => { pushLog(`✗ ${p.charName}: ${p.label} (denied)`); s.removeProposal(p.id); };

  const uploadBackground = async (file: File) => {
    try { s.setBackground(await downscaleImage(file, 1600, 0.72)); }
    catch { alert('Could not read that image.'); }
  };

  const commitInit = (next: Initiative) => { if (live) s.setInitiative(next); else { setLocalInit(next); save('gm:initiative', next); } };
  const addCombatant = (name: string, value: number) => {
    if (!name.trim()) return;
    commitInit({ list: [...initiative.list, { id: genId('cb'), name: name.trim(), init: value }].sort(byInit), turn: 0 });
  };
  const removeCombatant = (id: string) => commitInit({ list: initiative.list.filter((c) => c.id !== id), turn: 0 });
  const nextTurn = () => { if (initiative.list.length) commitInit({ ...initiative, turn: (initiative.turn + 1) % initiative.list.length }); };
  const clearInit = () => commitInit(EMPTY_INIT);

  return (
    <div className="gm">
      <header className="topbar gm-topbar">
        <div className="brand">POLY<span>MACHY</span><em>GM Console</em></div>
        <div className="actions">
          <button className="btn" onClick={onExit}>← Player view</button>
        </div>
      </header>

      <SessionBar defaultName="GM" hostOnly />

      <div className="gm-body">
        <main className="gm-main">
          <div className="gm-controls">
            {!live && (
              <>
                <span className="gm-ctl-label">Show:</span>
                {roster.length === 0 && <span className="muted">No characters yet — create one in Player view.</span>}
                {roster.map((r) => (
                  <button key={r.id} className={`chip ${shown.includes(r.id) ? 'chip-on' : ''}`} onClick={() => toggleShown(r.id)}>{r.name}</button>
                ))}
              </>
            )}
            {live && <span className="gm-ctl-label">Live session · showing all {roster.length} character(s)</span>}
            <span className="gm-ctl-label" style={{ marginLeft: 'auto' }}>Columns:</span>
            {[1, 2, 4].map((n) => (
              <button key={n} className={`chip ${cols === n ? 'chip-on' : ''}`} onClick={() => setCols(n)}>{n}</button>
            ))}
          </div>

          <div className="gm-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {displayed.map((id) => characters[id] && (
              <CharacterSummary
                key={id} def={def} char={characters[id]}
                statuses={statuses[id] ?? []}
                onRoll={onRoll}
                onToggleStatus={(sid) => toggleStatus(id, sid)}
                onOpen={live ? undefined : () => onOpenChar(id)}
              />
            ))}
            {displayed.length === 0 && <p className="muted">{live ? 'Waiting for players to join and share their characters…' : 'Pick characters above to display them side by side.'}</p>}
          </div>
        </main>

        <aside className="gm-rail">
          {live && (
            <section className="gm-panel">
              <h3 className="gm-panel-title">Requests {s.proposals.length > 0 && <span className="req-count">{s.proposals.length}</span>}</h3>
              {s.proposals.length === 0 && <p className="muted">No pending requests.</p>}
              {s.proposals.map((p) => (
                <div className="req-row" key={p.id}>
                  <div className="req-info">
                    <span className="req-by">{p.charName}</span>
                    <span className="req-label">{p.kind === 'roll' ? `🎲 ${p.label}` : p.label}</span>
                  </div>
                  <div className="req-actions">
                    <button className="btn btn-on" onClick={() => approve(p)}>Approve</button>
                    <button className="btn" onClick={() => deny(p)}>Deny</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {live && (
            <section className="gm-panel">
              <h3 className="gm-panel-title">Table background</h3>
              <p className="muted" style={{ marginBottom: '0.5rem' }}>Sets the backdrop for every player at the table.</p>
              <div className="bgpick-grid">
                <button className={`bgpick-cell bgpick-none ${!s.background ? 'on' : ''}`}
                  title="None" onClick={() => s.setBackground(null)}>None</button>
                {BG_PRESETS.map((p) => (
                  <button key={p.id} title={p.label}
                    className={`bgpick-cell ${s.background === `preset:${p.id}` ? 'on' : ''}`}
                    style={{ backgroundImage: p.css }}
                    onClick={() => s.setBackground(`preset:${p.id}`)}>
                    <span className="bgpick-label">{p.label}</span>
                  </button>
                ))}
              </div>
              <label className="btn bgpick-upload">
                Upload image…
                <input type="file" accept="image/*" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBackground(f); e.target.value = ''; }} />
              </label>
              {s.background?.startsWith('data:') && <span className="muted bgpick-current">Custom image set ✓</span>}
            </section>
          )}

          <section className="gm-panel">
            <h3 className="gm-panel-title">Initiative</h3>
            <div className="init-add">
              <input className="field-input" placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} />
              <input className="field-input init-num" type="number" value={addInit} onChange={(e) => setAddInit(Number(e.target.value))} />
              <button className="btn" onClick={() => { addCombatant(addName, addInit); setAddName(''); }}>Add</button>
            </div>
            <div className="init-quick">
              {roster.map((r) => <button key={r.id} className="chip" onClick={() => addCombatant(r.name, addInit)}>+ {r.name}</button>)}
            </div>
            <ol className="init-list">
              {initiative.list.map((c, i) => (
                <li key={c.id} className={`init-row ${i === initiative.turn ? 'turn' : ''}`}>
                  <span className="init-val">{c.init}</span>
                  <span className="init-name">{c.name}</span>
                  <button className="row-del" onClick={() => removeCombatant(c.id)}>×</button>
                </li>
              ))}
              {initiative.list.length === 0 && <p className="muted">No combatants.</p>}
            </ol>
            {initiative.list.length > 0 && (
              <div className="init-controls">
                <button className="btn btn-on" onClick={nextTurn}>Next turn →</button>
                <button className="btn" onClick={clearInit}>Clear</button>
              </div>
            )}
          </section>

          <section className="gm-panel">
            <h3 className="gm-panel-title">Action log{live ? ' · live' : ''}</h3>
            <div className="init-add">
              <input className="field-input" placeholder="Add a note…" value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && noteText.trim()) { pushLog(noteText.trim()); setNoteText(''); } }} />
              <button className="btn" onClick={() => { if (noteText.trim()) { pushLog(noteText.trim()); setNoteText(''); } }}>Note</button>
            </div>
            <div className="gm-log">
              {log.length === 0 && <p className="muted">Nothing logged yet.</p>}
              {(live ? [...log].reverse() : log).map((e, i) => (
                <div className="gm-log-row" key={i}>
                  <span className="gm-log-time">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="gm-log-text">{e.text}{live && e.by ? ` — ${e.by}` : ''}</span>
                </div>
              ))}
            </div>
            {!live && log.length > 0 && <button className="btn" onClick={clearLog}>Clear log</button>}
          </section>
        </aside>
      </div>
    </div>
  );
}
