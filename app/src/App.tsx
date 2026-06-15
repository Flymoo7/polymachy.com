import { useMemo, useState, useCallback } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import sampleDef from '../systems/sample-ashes-of-the-verge.json';
import type { SystemDefinition, CharacterDoc, LayoutDoc, RollResult } from './types';
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

export default function App() {
  const [char, setChar] = useState<CharacterDoc>(() => load('char', () => newCharacter(def)));
  const [layout, setLayout] = useState<LayoutDoc>(() => load('layout', () => defaultLayout(def)));
  const [log, setLog] = useState<RollResult[]>([]);
  const [edit, setEdit] = useState(false);

  const resolved = useMemo(() => computeResolved(def, char.data), [char.data]);

  const updateField = useCallback((id: string, value: unknown) => {
    setChar((c) => {
      const next = { ...c, data: { ...c.data, [id]: value }, meta: { ...c.meta, updated: new Date().toISOString() } };
      save('char', next);
      return next;
    });
  }, []);

  const roll = useCallback((id: string) => {
    setLog((l) => [performRoll(def, id, resolved), ...l].slice(0, 50));
  }, [resolved]);

  const onLayoutChange = useCallback((items: Layout[]) => {
    setLayout((lo) => {
      const byId = new Map(items.map((i) => [i.i, i]));
      const blocks = lo.blocks.map((b) => {
        const it = byId.get(b.id);
        return it ? { ...b, x: it.x, y: it.y, w: it.w, h: it.h } : b;
      });
      const next = { ...lo, blocks, meta: { ...lo.meta, updated: new Date().toISOString() } };
      save('layout', next);
      return next;
    });
  }, []);

  const resetLayout = () => { const lo = defaultLayout(def); setLayout(lo); save('layout', lo); };

  const rglLayout: Layout[] = layout.blocks
    .filter((b) => !b.hidden)
    .map((b) => ({ i: b.id, x: b.x, y: b.y, w: b.w, h: b.h, minW: 2, minH: 2 }));

  return (
    <div className={`app ${edit ? 'editing' : ''}`}>
      <header className="topbar">
        <div className="brand">POLY<span>MACHY</span><em>Omni Matrix</em></div>
        <div className="char-name">{char.meta.name}</div>
        <div className="actions">
          <button className={`btn ${edit ? 'btn-on' : ''}`} onClick={() => setEdit((e) => !e)}>
            {edit ? 'Done arranging' : 'Arrange blocks'}
          </button>
          {edit && <button className="btn" onClick={resetLayout}>Reset layout</button>}
          <button className="btn" onClick={() => download('character.json', char)}>Export character</button>
          <button className="btn" onClick={() => download('layout.json', layout)}>Export layout</button>
        </div>
      </header>

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
        onLayoutChange={onLayoutChange}
      >
        {layout.blocks.filter((b) => !b.hidden).map((b) => (
          <section
            key={b.id}
            className="block"
            style={b.colour ? ({ ['--block-accent' as any]: b.colour }) : undefined}
          >
            <div className="block-head">
              <span className="block-title">{b.title}</span>
              {edit && <span className="drag-hint">⠿</span>}
            </div>
            <div className="block-body">
              {b.source === 'group' && (b.fields ?? []).map((fid) => {
                const fdef = def.fields[fid];
                if (!fdef) return null;
                return (
                  <Field key={fid} id={fid} def={fdef} raw={char.data[fid]} resolved={resolved} onChange={updateField} />
                );
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
