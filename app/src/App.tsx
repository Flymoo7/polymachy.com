import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import type { SystemDefinition, CharacterDoc, LayoutDoc, LayoutBlock, RollResult, RosterEntry } from './types';
import { computeResolved, performRoll, rollResultText } from './engineBridge';
import { newCharacter, defaultLayout, genId } from './defaults';
import { Field } from './components/Field';
import { GmConsole } from './gm/GmConsole';
import { KEY, save, rawLoad } from './storage';
import { useSession } from './net/SessionProvider';
import { SessionBar } from './net/SessionBar';
import { ProposePanel } from './net/ProposePanel';

const Grid = WidthProvider(Responsive);

// migrate a pre-pages layout ({blocks}) into the paged shape
function migrateLayout(lo: any): LayoutDoc {
  if (lo && !lo.pages && Array.isArray(lo.blocks)) {
    return { ...lo, pages: [{ id: 'page-1', name: 'Sheet', blocks: lo.blocks }] };
  }
  return lo as LayoutDoc;
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function readFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { try { resolve(JSON.parse(String(r.result))); } catch (e) { reject(e); } };
    r.onerror = reject;
    r.readAsText(file);
  });
}

const SWATCHES = ['#c8a96e', '#7a1f1f', '#3a5a78', '#4a6b4a', '#6b4a6b', '#8a8a8a'];

// Initialise the roster, migrating any pre-roster single-character save.
function boot(def: SystemDefinition): { roster: RosterEntry[]; activeId: string; char: CharacterDoc; layout: LayoutDoc } {
  const sysId = def.system.id;
  const allRoster: RosterEntry[] = rawLoad('roster') ?? [];
  // keep only characters belonging to this system
  let roster = allRoster.filter((r) => {
    const c = rawLoad(`char:${r.id}`) as CharacterDoc | null;
    return c?.system === sysId;
  });
  // migration: single pre-roster character
  if (!roster.length) {
    const old = rawLoad('char') as CharacterDoc | null;
    if (old && old.system === sysId) {
      const id = old.id || genId();
      old.id = id;
      const lo = migrateLayout(rawLoad('layout') || defaultLayout(def));
      save(`char:${id}`, old); save(`layout:${id}`, lo);
      const entry = { id, name: old.meta.name };
      roster = [entry];
      save('roster', [...allRoster, entry]);
    }
  }
  if (!roster.length) {
    const c = newCharacter(def);
    save(`char:${c.id}`, c); save(`layout:${c.id}`, defaultLayout(def));
    const entry = { id: c.id, name: c.meta.name };
    roster = [entry];
    save('roster', [...allRoster, entry]);
  }
  let activeId: string = rawLoad('active');
  if (!activeId || !roster.find((r) => r.id === activeId)) activeId = roster[0].id;
  save('active', activeId);
  const char = (rawLoad(`char:${activeId}`) as CharacterDoc) ?? newCharacter(def);
  const layout = migrateLayout(rawLoad(`layout:${activeId}`) || defaultLayout(def));
  return { roster, activeId, char, layout };
}

export default function App({ def, onChangeDef }: { def: SystemDefinition; onChangeDef: () => void }) {
  const [start] = useState(() => boot(def));
  const [roster, setRoster] = useState<RosterEntry[]>(start.roster);
  const [activeId, setActiveId] = useState<string>(start.activeId);
  const [char, setChar] = useState<CharacterDoc>(start.char);
  const [layout, setLayout] = useState<LayoutDoc>(start.layout);
  const [log, setLog] = useState<RollResult[]>([]);
  const [edit, setEdit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [configBlock, setConfigBlock] = useState<string | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [view, setView] = useState<'player' | 'gm'>('player');
  const importRef = useRef<HTMLInputElement>(null);
  const session = useSession();

  const resolved = useMemo(() => computeResolved(def, char.data), [char.data]);

  // when in a live session, share the active character and keep it updated
  useEffect(() => {
    if (session.connected) session.publishCharacter(char);
  }, [session.connected, char]);

  const persistChar = (next: CharacterDoc) => { save(`char:${activeId}`, next); return next; };
  const persistLayout = (next: LayoutDoc) => { save(`layout:${activeId}`, next); return next; };
  const persistRoster = (next: RosterEntry[]) => { save('roster', next); return next; };

  const idx = Math.min(pageIdx, layout.pages.length - 1);
  const page = layout.pages[idx];

  const updateField = useCallback((id: string, value: unknown) => {
    setChar((c) => persistChar({ ...c, data: { ...c.data, [id]: value }, meta: { ...c.meta, updated: new Date().toISOString() } }));
  }, [activeId]);

  const renameChar = (name: string) => {
    setChar((c) => persistChar({ ...c, meta: { ...c.meta, name } }));
    setRoster((r) => persistRoster(r.map((x) => x.id === activeId ? { ...x, name } : x)));
  };

  // ---- roster / character ops ----
  const openChar = (id: string) => {
    setActiveId(id); save('active', id);
    setChar((rawLoad(`char:${id}`) as CharacterDoc) ?? newCharacter(def));
    setLayout(migrateLayout(rawLoad(`layout:${id}`) || defaultLayout(def)));
    setPageIdx(0); setLog([]); setConfigBlock(null);
  };

  const switchChar = (id: string) => { if (id !== activeId) openChar(id); };

  const addCharacter = () => {
    const c = newCharacter(def); const l = defaultLayout(def);
    save(`char:${c.id}`, c); save(`layout:${c.id}`, l);
    setRoster((r) => persistRoster([...r, { id: c.id, name: c.meta.name }]));
    setActiveId(c.id); save('active', c.id);
    setChar(c); setLayout(l); setPageIdx(0); setLog([]); setConfigBlock(null);
  };

  const deleteCharacter = (id: string) => {
    if (roster.length <= 1) return;
    if (!confirm('Delete this character? This cannot be undone.')) return;
    localStorage.removeItem(KEY(`char:${id}`));
    localStorage.removeItem(KEY(`layout:${id}`));
    const next = roster.filter((r) => r.id !== id);
    setRoster(persistRoster(next));
    if (id === activeId) openChar(next[0].id);
  };

  const roll = useCallback((id: string) => {
    const r = performRoll(def, id, resolved);
    if (session.connected) {
      session.appendLog(`${char.meta.name} · ${r.label}: ${rollResultText(r, def.dice.model)}`);
    } else {
      setLog((l) => [r, ...l].slice(0, 50));
    }
  }, [resolved, session.connected, char.meta.name]);

  // ---- block ops (scoped to the active page) ----
  const mutateBlocks = (fn: (b: LayoutBlock[]) => LayoutBlock[]) =>
    setLayout((lo) => {
      const i = Math.min(pageIdx, lo.pages.length - 1);
      const pages = lo.pages.map((p, pi) => pi === i ? { ...p, blocks: fn(p.blocks) } : p);
      return persistLayout({ ...lo, pages, meta: { ...lo.meta, updated: new Date().toISOString() } });
    });

  const onLayoutChange = useCallback((items: Layout[]) => {
    const byId = new Map(items.map((i) => [i.i, i]));
    mutateBlocks((blocks) => blocks.map((b) => {
      const it = byId.get(b.id);
      return it ? { ...b, x: it.x, y: it.y, w: it.w, h: it.h } : b;
    }));
  }, [pageIdx, activeId]);

  const setColour = (id: string, colour: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, colour } : b));
  const hideBlock = (id: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, hidden: true } : b));
  const showBlock = (id: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, hidden: false } : b));
  const setTitle = (id: string, title: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, title } : b));

  const toggleField = (id: string, fid: string) => mutateBlocks((bs) => bs.map((b) => {
    if (b.id !== id) return b;
    const cur = b.fields ?? [];
    return { ...b, fields: cur.includes(fid) ? cur.filter((f) => f !== fid) : [...cur, fid] };
  }));

  const addNewBlock = () => {
    const maxY = page.blocks.reduce((m, b) => (b.hidden ? m : Math.max(m, b.y + b.h)), 0);
    const id = `group:custom-${Date.now()}`;
    mutateBlocks((bs) => [...bs, { id, source: 'group', title: 'New block', fields: [], x: 0, y: maxY, w: 4, h: 5, hidden: false }]);
    setConfigBlock(id);
  };

  // ---- page ops ----
  const addPage = () => {
    const newIdx = layout.pages.length;
    setLayout((lo) => persistLayout({
      ...lo,
      pages: [...lo.pages, { id: `page:custom-${Date.now()}`, name: `Page ${lo.pages.length + 1}`, blocks: [] }],
      meta: { ...lo.meta, updated: new Date().toISOString() },
    }));
    setPageIdx(newIdx);
  };
  const renamePage = (i: number, name: string) =>
    setLayout((lo) => persistLayout({ ...lo, pages: lo.pages.map((p, pi) => pi === i ? { ...p, name } : p) }));
  const deletePage = (i: number) => {
    if (layout.pages.length <= 1) return;
    setLayout((lo) => persistLayout({ ...lo, pages: lo.pages.filter((_, pi) => pi !== i) }));
    setPageIdx((cur) => Math.max(0, cur > i ? cur - 1 : cur));
  };

  const resetLayout = () => { setLayout(persistLayout(defaultLayout(def))); setPageIdx(0); };

  const importDoc = async (file: File) => {
    try {
      const doc = await readFile(file) as any;
      if (doc && (doc.pages || doc.blocks) && doc.system === def.system.id) {
        // layout import applies to the active character
        setLayout(persistLayout(migrateLayout(doc))); setPageIdx(0);
      } else if (doc && doc.data && doc.system === def.system.id) {
        // character import becomes a new roster entry (fresh id avoids clashes)
        const c = doc as CharacterDoc; c.id = genId();
        save(`char:${c.id}`, c); save(`layout:${c.id}`, defaultLayout(def));
        setRoster((r) => persistRoster([...r, { id: c.id, name: c.meta.name }]));
        openChar(c.id);
      } else {
        alert('That file is not a character or layout for this system.');
      }
    } catch { alert('Could not read that file.'); }
  };

  const hiddenBlocks = page.blocks.filter((b) => b.hidden);
  const visibleBlocks = page.blocks.filter((b) => !b.hidden);
  const rglLayout: Layout[] = visibleBlocks.map((b) => ({ i: b.id, x: b.x, y: b.y, w: b.w, h: b.h, minW: 2, minH: 2 }));

  if (view === 'gm') return (
    <GmConsole def={def} onExit={() => setView('player')}
      onOpenChar={(id) => { openChar(id); setView('player'); }} />
  );

  return (
    <div className={`app ${edit ? 'editing' : ''}`}>
      <header className="topbar">
        <div className="brand">POLY<span>MACHY</span><em>Omni Matrix</em></div>
        <div className="charbar">
          <select className="char-select" value={activeId} onChange={(e) => switchChar(e.target.value)} aria-label="Switch character">
            {roster.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input className="char-name-input" value={char.meta.name}
            onChange={(e) => renameChar(e.target.value)} aria-label="Character name" />
          <button className="char-mini" title="New character" onClick={addCharacter}>+</button>
          {roster.length > 1 && (
            <button className="char-mini danger" title="Delete character" onClick={() => deleteCharacter(activeId)}>🗑</button>
          )}
        </div>
        <div className="actions">
          <button className="btn" onClick={onChangeDef}>Change system</button>
          <button className="btn" onClick={() => setView('gm')}>GM view</button>
          <button className={`btn ${edit ? 'btn-on' : ''}`} onClick={() => setEdit((e) => !e)}>
            {edit ? 'Done editing' : 'Edit / Arrange blocks'}
          </button>
          {edit && <button className="btn" onClick={() => setShowPalette((s) => !s)}>Add block ({hiddenBlocks.length})</button>}
          {edit && <button className="btn" onClick={resetLayout}>Reset layout</button>}
          <button className="btn" onClick={() => importRef.current?.click()}>Import</button>
          <button className="btn" onClick={() => download('character.json', char)}>Export character</button>
          <button className="btn" onClick={() => download('layout.json', layout)}>Export layout</button>
          <input ref={importRef} type="file" accept="application/json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importDoc(f); e.target.value = ''; }} />
        </div>
      </header>

      <SessionBar defaultName={char.meta.name} />
      <ProposePanel def={def} charId={char.id} charName={char.meta.name} />

      <nav className="pagebar">
        {layout.pages.map((p, i) => (
          <span key={p.id} className={`page-tab ${i === idx ? 'on' : ''}`}>
            {edit && i === idx
              ? <input className="page-name-input" value={p.name} onChange={(e) => renamePage(i, e.target.value)} aria-label="Page name" />
              : <button className="page-name" onClick={() => setPageIdx(i)}>{p.name}</button>}
            {edit && i === idx && layout.pages.length > 1 && (
              <button className="page-del" title="Delete page" onClick={() => deletePage(i)}>×</button>
            )}
          </span>
        ))}
        {edit && <button className="page-add" title="Add page" onClick={addPage}>+ Page</button>}
      </nav>

      {edit && showPalette && (
        <div className="palette">
          <span className="palette-label">Add a block to “{page.name}”:</span>
          <button className="chip chip-new" onClick={addNewBlock}>+ New empty block</button>
          {hiddenBlocks.map((b) => (
            <button key={b.id} className="chip" onClick={() => showBlock(b.id)}>+ {b.title}</button>
          ))}
        </div>
      )}

      {/* canvas-scroll lets the grid maintain min-width and scroll horizontally
          rather than reflowing into broken 2-col layouts when zoomed in */}
      <div className="canvas-scroll"><Grid
        className="canvas"
        // key forces a clean remount per page so positions never bleed across pages
        key={page.id}
        layouts={{ lg: rglLayout, md: rglLayout }}
        breakpoints={{ lg: 600, md: 0 }}
        cols={{ lg: 12, md: 12 }}
        rowHeight={34}
        margin={[12, 12]}
        isDraggable={edit}
        isResizable={edit}
        draggableHandle=".block-head"
        draggableCancel=".block-ctrl"
        onLayoutChange={onLayoutChange}
      >
        {visibleBlocks.map((b) => (
          <section key={b.id} className="block" style={{ ['--block-accent' as any]: b.colour ?? 'var(--accent)' }}>
            <div className="block-head">
              {edit
                ? <input className="block-title-input block-ctrl" value={b.title ?? ''}
                    onChange={(e) => setTitle(b.id, e.target.value)} aria-label="Block title" />
                : <span className="block-title">{b.title}</span>}
              {edit && (
                <span className="block-ctrl">
                  {b.source === 'group' && (
                    <button className={`block-cfg ${configBlock === b.id ? 'on' : ''}`} title="Choose fields"
                      onClick={() => setConfigBlock((c) => c === b.id ? null : b.id)}>⚙</button>
                  )}
                  {SWATCHES.map((c) => (
                    <button key={c} className="swatch" style={{ background: c }} title={c}
                      onClick={() => setColour(b.id, c)} />
                  ))}
                  <button className="block-hide" title="Remove block" onClick={() => hideBlock(b.id)}>×</button>
                </span>
              )}
            </div>
            <div className="block-body">
              {edit && configBlock === b.id && b.source === 'group' && (
                <div className="fieldpick">
                  <div className="fieldpick-head">Show fields in “{b.title}”</div>
                  {def.sections.map((sec, si) => (
                    <div key={sec.tab ?? si} className="fieldpick-group">
                      <div className="fieldpick-tab">{sec.tab}</div>
                      {sec.groups.flatMap((g) => g.fields).map((fid) => {
                        const fd = def.fields[fid];
                        if (!fd) return null;
                        return (
                          <label key={fid} className="pick">
                            <input type="checkbox" checked={(b.fields ?? []).includes(fid)}
                              onChange={() => toggleField(b.id, fid)} />
                            <span>{fd.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {b.source === 'group' && (b.fields ?? []).map((fid) => {
                const fdef = def.fields[fid];
                if (!fdef) return null;
                return <Field key={fid} id={fid} def={fdef} raw={char.data[fid]} resolved={resolved} onChange={updateField} />;
              })}

              {b.source === 'rolls' && (
                <div className="rolls">
                  {Object.entries(def.rolls).map(([id, r]) => (
                    <button key={id} className="roll-btn" onClick={() => roll(id)}>{r.label}</button>
                  ))}
                </div>
              )}

              {b.source === 'log' && session.connected && (
                <div className="rolllog">
                  {session.log.length === 0 && <p className="muted">No rolls yet.</p>}
                  {[...session.log].reverse().map((e, i) => (
                    <div key={i} className="logentry ok">
                      <span className="result">{e.text}</span>
                      <span className="faces">— {e.by}</span>
                    </div>
                  ))}
                </div>
              )}

              {b.source === 'log' && !session.connected && (
                <div className="rolllog">
                  {log.length === 0 && <p className="muted">No rolls yet.</p>}
                  {log.map((r, i) => (
                    <div key={i} className={`logentry ${r.success ? 'ok' : 'fail'}`}>
                      <strong>{r.label}</strong>
                      {def.dice.model === 'sum-banded'
                        ? <><span className="result">{r.total} → <strong>{r.band}</strong></span><span className="faces">[{r.faces?.join(' ')}]{r.modifier != null ? ` +${r.modifier}` : ''}</span></>
                        : <><span className="result">{r.successes ?? 0} success{(r.successes ?? 0) === 1 ? '' : 'es'}{r.critical ? ' · crit' : ''}{r.complication ? ` · ${r.complication}` : ''}</span><span className="faces">[{r.faces?.join(' ')}]{r.complicationFaces?.length ? ` ⚠ [${r.complicationFaces.join(' ')}]` : ''}</span></>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </Grid></div>
    </div>
  );
}
