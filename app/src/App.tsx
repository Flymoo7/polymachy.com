import { useMemo, useState, useCallback, useRef } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import sampleDef from '../systems/sample-ashes-of-the-verge.json';
import type { SystemDefinition, CharacterDoc, LayoutDoc, LayoutBlock, RollResult } from './types';
import { computeResolved, performRoll } from './engineBridge';
import { newCharacter, defaultLayout } from './defaults';
import { Field } from './components/Field';

const Grid = WidthProvider(Responsive);
const def = sampleDef as unknown as SystemDefinition;

const KEY = (k: string) => `om:${def.system.id}:${k}`;

function load<T>(k: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(KEY(k));
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback();
}

function save(k: string, v: unknown) {
  try { localStorage.setItem(KEY(k), JSON.stringify(v)); } catch { /* ignore */ }
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

// palette of accent colours the user can paint blocks with
const SWATCHES = ['#c8a96e', '#7a1f1f', '#3a5a78', '#4a6b4a', '#6b4a6b', '#8a8a8a'];

export default function App() {
  const [char, setChar] = useState<CharacterDoc>(() => load('char', () => newCharacter(def)));
  const [layout, setLayout] = useState<LayoutDoc>(() => load('layout', () => defaultLayout(def)));
  const [log, setLog] = useState<RollResult[]>([]);
  const [edit, setEdit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const resolved = useMemo(() => computeResolved(def, char.data), [char.data]);

  const persistChar = (next: CharacterDoc) => { save('char', next); return next; };
  const persistLayout = (next: LayoutDoc) => { save('layout', next); return next; };

  const updateField = useCallback((id: string, value: unknown) => {
    setChar((c) => persistChar({ ...c, data: { ...c.data, [id]: value }, meta: { ...c.meta, updated: new Date().toISOString() } }));
  }, []);

  const renameChar = (name: string) => setChar((c) => persistChar({ ...c, meta: { ...c.meta, name } }));

  const roll = useCallback((id: string) => {
    setLog((l) => [performRoll(def, id, resolved), ...l].slice(0, 50));
  }, [resolved]);

  const mutateBlocks = (fn: (b: LayoutBlock[]) => LayoutBlock[]) =>
    setLayout((lo) => persistLayout({ ...lo, blocks: fn(lo.blocks), meta: { ...lo.meta, updated: new Date().toISOString() } }));

  const onLayoutChange = useCallback((items: Layout[]) => {
    const byId = new Map(items.map((i) => [i.i, i]));
    mutateBlocks((blocks) => blocks.map((b) => {
      const it = byId.get(b.id);
      return it ? { ...b, x: it.x, y: it.y, w: it.w, h: it.h } : b;
    }));
  }, []);

  const setColour = (id: string, colour: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, colour } : b));
  const hideBlock = (id: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, hidden: true } : b));
  const showBlock = (id: string) => mutateBlocks((bs) => bs.map((b) => b.id === id ? { ...b, hidden: false } : b));

  const resetLayout = () => setLayout(persistLayout(defaultLayout(def)));

  const importDoc = async (file: File) => {
    try {
      const doc = await readFile(file) as any;
      if (doc && doc.blocks && doc.system === def.system.id) {
        setLayout(persistLayout(doc as LayoutDoc));
      } else if (doc && doc.data && doc.system === def.system.id) {
        setChar(persistChar(doc as CharacterDoc));
      } else {
        alert('That file is not a character or layout for this system.');
      }
    } catch { alert('Could not read that file.'); }
  };

  const hiddenBlocks = layout.blocks.filter((b) => b.hidden);
  const visibleBlocks = layout.blocks.filter((b) => !b.hidden);
  const rglLayout: Layout[] = visibleBlocks.map((b) => ({ i: b.id, x: b.x, y: b.y, w: b.w, h: b.h, minW: 2, minH: 2 }));

  return (
    <div className={`app ${edit ? 'editing' : ''}`}>
      <header className="topbar">
        <div className="brand">POLY<span>MACHY</span><em>Omni Matrix</em></div>
        <input className="char-name-input" value={char.meta.name}
          onChange={(e) => renameChar(e.target.value)} aria-label="Character name" />
        <div className="actions">
          <button className={`btn ${edit ? 'btn-on' : ''}`} onClick={() => setEdit((e) => !e)}>
            {edit ? 'Done arranging' : 'Arrange blocks'}
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

      {edit && showPalette && (
        <div className="palette">
          <span className="palette-label">Add a block:</span>
          {hiddenBlocks.length === 0 && <span className="muted">All blocks are on the sheet.</span>}
          {hiddenBlocks.map((b) => (
            <button key={b.id} className="chip" onClick={() => showBlock(b.id)}>+ {b.title}</button>
          ))}
        </div>
      )}

      <Grid
        className="canvas"
        layouts={{ lg: rglLayout, md: rglLayout, sm: rglLayout, xs: rglLayout, xxs: rglLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 2 }}
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
              <span className="block-title">{b.title}</span>
              {edit && (
                <span className="block-ctrl">
                  {SWATCHES.map((c) => (
                    <button key={c} className="swatch" style={{ background: c }} title={c}
                      onClick={() => setColour(b.id, c)} />
                  ))}
                  <button className="block-hide" title="Remove block" onClick={() => hideBlock(b.id)}>×</button>
                </span>
              )}
            </div>
            <div className="block-body">
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

              {b.source === 'log' && (
                <div className="rolllog">
                  {log.length === 0 && <p className="muted">No rolls yet.</p>}
                  {log.map((r, i) => (
                    <div key={i} className={`logentry ${r.success ? 'ok' : 'fail'}`}>
                      <strong>{r.label}</strong>
                      <span className="result">
                        {r.successes} success{r.successes === 1 ? '' : 'es'}
                        {r.critical ? ' · crit' : ''}
                        {r.complication ? ` · ${r.complication}` : ''}
                      </span>
                      <span className="faces">
                        [{r.faces.join(' ')}]{r.complicationFaces.length ? ` ⚠ [${r.complicationFaces.join(' ')}]` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </Grid>
    </div>
  );
}
