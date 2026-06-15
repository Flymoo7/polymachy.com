import { useState } from 'react';
import type { SystemDefinition, CharacterDoc, RosterEntry, RollResult } from '../types';
import { loadRoster, loadCharacter, load, save } from '../storage';
import { genId } from '../defaults';
import { CharacterSummary } from './CharacterSummary';

interface Props {
  def: SystemDefinition;
  onExit: () => void;
  onOpenChar: (id: string) => void;
}

interface LogEntry { at: number; text: string }
interface Combatant { id: string; name: string; init: number }
interface Initiative { list: Combatant[]; turn: number }

const byInit = (a: Combatant, b: Combatant) => b.init - a.init;

export function GmConsole({ def, onExit, onOpenChar }: Props) {
  const [roster] = useState<RosterEntry[]>(loadRoster);
  const [chars] = useState<Record<string, CharacterDoc>>(() => {
    const m: Record<string, CharacterDoc> = {};
    for (const r of loadRoster()) { const c = loadCharacter(r.id); if (c) m[r.id] = c; }
    return m;
  });
  const [shown, setShown] = useState<string[]>(() => roster.slice(0, 2).map((r) => r.id));
  const [cols, setCols] = useState(2);
  const [log, setLog] = useState<LogEntry[]>(() => load('gm:log', () => []));
  const [statusMap, setStatusMap] = useState<Record<string, string[]>>(() => load('gm:status', () => ({})));
  const [init, setInit] = useState<Initiative>(() => load('gm:initiative', () => ({ list: [], turn: 0 })));
  const [noteText, setNoteText] = useState('');
  const [addName, setAddName] = useState('');
  const [addInit, setAddInit] = useState(10);

  const pushLog = (text: string) => setLog((l) => { const next = [{ at: Date.now(), text }, ...l].slice(0, 100); save('gm:log', next); return next; });
  const clearLog = () => { setLog([]); save('gm:log', []); };

  const onRoll = (charName: string, r: RollResult) => {
    pushLog(`${charName} · ${r.label}: ${r.successes} success${r.successes === 1 ? '' : 'es'}${r.critical ? ' · crit' : ''}${r.complication ? ` · ${r.complication}` : ''}  [${r.faces.join(' ')}${r.complicationFaces.length ? ' ⚠ ' + r.complicationFaces.join(' ') : ''}]`);
  };

  const toggleShown = (id: string) => setShown((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const toggleStatus = (charId: string, statusId: string) => setStatusMap((m) => {
    const cur = m[charId] ?? [];
    const next = { ...m, [charId]: cur.includes(statusId) ? cur.filter((x) => x !== statusId) : [...cur, statusId] };
    save('gm:status', next);
    const cName = chars[charId]?.meta.name ?? 'Character';
    const sName = ((def.statusEffects ?? []) as any[]).find((s) => s.id === statusId)?.label ?? statusId;
    pushLog(`${cName} ${cur.includes(statusId) ? 'cleared' : 'gained'} ${sName}`);
    return next;
  });

  const setInitiative = (next: Initiative) => { setInit(next); save('gm:initiative', next); };
  const addCombatant = (name: string, value: number) => {
    if (!name.trim()) return;
    const list = [...init.list, { id: genId('cb'), name: name.trim(), init: value }].sort(byInit);
    setInitiative({ list, turn: 0 });
  };
  const removeCombatant = (id: string) => setInitiative({ list: init.list.filter((c) => c.id !== id), turn: 0 });
  const nextTurn = () => { if (init.list.length) setInitiative({ ...init, turn: (init.turn + 1) % init.list.length }); };
  const clearInit = () => setInitiative({ list: [], turn: 0 });

  return (
    <div className="gm">
      <header className="topbar gm-topbar">
        <div className="brand">POLY<span>MACHY</span><em>GM Console</em></div>
        <div className="actions">
          <button className="btn" onClick={onExit}>← Player view</button>
        </div>
      </header>

      <div className="gm-body">
        <main className="gm-main">
          <div className="gm-controls">
            <span className="gm-ctl-label">Show:</span>
            {roster.length === 0 && <span className="muted">No characters yet — create one in Player view.</span>}
            {roster.map((r) => (
              <button key={r.id} className={`chip ${shown.includes(r.id) ? 'chip-on' : ''}`} onClick={() => toggleShown(r.id)}>{r.name}</button>
            ))}
            <span className="gm-ctl-label" style={{ marginLeft: 'auto' }}>Columns:</span>
            {[1, 2, 4].map((n) => (
              <button key={n} className={`chip ${cols === n ? 'chip-on' : ''}`} onClick={() => setCols(n)}>{n}</button>
            ))}
          </div>

          <div className="gm-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {shown.map((id) => chars[id] && (
              <CharacterSummary
                key={id} def={def} char={chars[id]}
                statuses={statusMap[id] ?? []}
                onRoll={onRoll}
                onToggleStatus={(sid) => toggleStatus(id, sid)}
                onOpen={() => onOpenChar(id)}
              />
            ))}
            {shown.length === 0 && <p className="muted">Pick characters above to display them side by side.</p>}
          </div>
        </main>

        <aside className="gm-rail">
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
              {init.list.map((c, i) => (
                <li key={c.id} className={`init-row ${i === init.turn ? 'turn' : ''}`}>
                  <span className="init-val">{c.init}</span>
                  <span className="init-name">{c.name}</span>
                  <button className="row-del" onClick={() => removeCombatant(c.id)}>×</button>
                </li>
              ))}
              {init.list.length === 0 && <p className="muted">No combatants.</p>}
            </ol>
            {init.list.length > 0 && (
              <div className="init-controls">
                <button className="btn btn-on" onClick={nextTurn}>Next turn →</button>
                <button className="btn" onClick={clearInit}>Clear</button>
              </div>
            )}
          </section>

          <section className="gm-panel">
            <h3 className="gm-panel-title">Action log</h3>
            <div className="init-add">
              <input className="field-input" placeholder="Add a note…" value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && noteText.trim()) { pushLog(noteText.trim()); setNoteText(''); } }} />
              <button className="btn" onClick={() => { if (noteText.trim()) { pushLog(noteText.trim()); setNoteText(''); } }}>Note</button>
            </div>
            <div className="gm-log">
              {log.length === 0 && <p className="muted">Nothing logged yet.</p>}
              {log.map((e, i) => (
                <div className="gm-log-row" key={i}>
                  <span className="gm-log-time">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="gm-log-text">{e.text}</span>
                </div>
              ))}
            </div>
            {log.length > 0 && <button className="btn" onClick={clearLog}>Clear log</button>}
          </section>
        </aside>
      </div>
    </div>
  );
}
