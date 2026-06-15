import type { FieldDef, Resolved } from '../types';
import { trackLength } from '../engineBridge';

interface Props {
  id: string;
  def: FieldDef;
  raw: unknown;            // value from character.data (editable fields)
  resolved: Resolved;     // full resolved vars (for derived/track length)
  onChange: (id: string, value: unknown) => void;
}

export function Field({ id, def, raw, resolved, onChange }: Props) {
  const readOnly = def.editable === 'none' || typeof def.derived === 'string';
  const rv = resolved[id];

  // ----- read-only / derived -----
  if (readOnly) {
    const shown = def.type === 'pool' ? `${rv?.current ?? 0}/${rv?.max ?? 0}` : String(rv ?? 0);
    return (
      <label className="field field-ro">
        <span className="field-label">{def.label}</span>
        <span className="field-derived">{shown}</span>
      </label>
    );
  }

  switch (def.type) {
    case 'dots': {
      const max = typeof def.max === 'number' ? def.max : 5;
      const min = def.min ?? 0;
      const val = typeof raw === 'number' ? raw : 0;
      return (
        <div className="field field-dots">
          <span className="field-label">{def.label}</span>
          <div className="dots" role="slider" aria-valuenow={val} aria-valuemax={max}>
            {Array.from({ length: max }, (_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  className={`dot ${val >= n ? 'on' : ''}`}
                  title={`${def.label} ${n}`}
                  onClick={() => onChange(id, val === n && n > min ? n - 1 : n)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    case 'number': {
      const val = typeof raw === 'number' ? raw : 0;
      return (
        <label className="field">
          <span className="field-label">{def.label}</span>
          <input
            type="number" className="field-input" value={val}
            min={def.min} max={typeof def.max === 'number' ? def.max : undefined} step={def.step}
            onChange={(e) => onChange(id, Number(e.target.value))}
          />
        </label>
      );
    }

    case 'pool': {
      const cur = typeof raw === 'number' ? raw : (rv?.current ?? 0);
      const mx = rv?.max ?? 0;
      const set = (n: number) => onChange(id, Math.max(0, Math.min(mx, n)));
      return (
        <div className="field field-pool">
          <span className="field-label">{def.label}</span>
          <div className="pool-row">
            <button type="button" className="step" onClick={() => set(cur - 1)}>−</button>
            <div className="pool-pips">
              {Array.from({ length: mx }, (_, i) => (
                <span key={i} className={`pip ${i < cur ? 'on' : ''}`} />
              ))}
            </div>
            <button type="button" className="step" onClick={() => set(cur + 1)}>+</button>
            <span className="pool-count">{cur}/{mx}</span>
          </div>
        </div>
      );
    }

    case 'track': {
      const states = def.states ?? ['empty', 'filled'];
      const len = trackLength(def, resolved);
      const arr = Array.isArray(raw) ? (raw as string[]) : [];
      const cycle = (i: number) => {
        const cur = arr[i] ?? states[0];
        const next = states[(states.indexOf(cur) + 1) % states.length];
        const copy = arr.slice();
        while (copy.length < len) copy.push(states[0]);
        copy[i] = next;
        onChange(id, copy.slice(0, len));
      };
      return (
        <div className="field field-track">
          <span className="field-label">{def.label}</span>
          <div className="track">
            {Array.from({ length: len }, (_, i) => {
              const st = arr[i] ?? states[0];
              return (
                <button
                  key={i} type="button"
                  className={`box state-${states.indexOf(st)}`}
                  title={st} onClick={() => cycle(i)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    case 'text':
      return (
        <label className="field">
          <span className="field-label">{def.label}</span>
          <input
            className="field-input" type="text" value={String(raw ?? '')}
            onChange={(e) => onChange(id, e.target.value)}
          />
        </label>
      );

    case 'longtext':
      return (
        <label className="field field-wide">
          <span className="field-label">{def.label}</span>
          <textarea
            className="field-input" rows={4} value={String(raw ?? '')}
            onChange={(e) => onChange(id, e.target.value)}
          />
        </label>
      );

    case 'select':
      return (
        <label className="field">
          <span className="field-label">{def.label}</span>
          <select className="field-input" value={String(raw ?? '')} onChange={(e) => onChange(id, e.target.value)}>
            <option value="" />
            {(def.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );

    case 'toggle':
      return (
        <label className="field field-toggle">
          <input type="checkbox" checked={!!raw} onChange={(e) => onChange(id, e.target.checked)} />
          <span className="field-label">{def.label}</span>
        </label>
      );

    case 'list': {
      const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      const item = def.item ?? {};
      const addRow = () => {
        const blank: Record<string, unknown> = {};
        for (const [k, sub] of Object.entries(item)) blank[k] = sub.default ?? (sub.type === 'number' || sub.type === 'dots' ? 0 : '');
        onChange(id, [...rows, blank]);
      };
      const setCell = (ri: number, key: string, v: unknown) => {
        const copy = rows.map((r) => ({ ...r }));
        copy[ri][key] = v;
        onChange(id, copy);
      };
      const removeRow = (ri: number) => onChange(id, rows.filter((_, i) => i !== ri));
      return (
        <div className="field field-list field-wide">
          <span className="field-label">{def.label}</span>
          {rows.map((row, ri) => (
            <div className="list-row" key={ri}>
              {Object.entries(item).map(([k, sub]) => (
                <input
                  key={k}
                  className="field-input list-cell"
                  type={sub.type === 'number' || sub.type === 'dots' ? 'number' : 'text'}
                  placeholder={sub.label}
                  value={String(row[k] ?? '')}
                  onChange={(e) => setCell(ri, k, sub.type === 'number' || sub.type === 'dots' ? Number(e.target.value) : e.target.value)}
                />
              ))}
              <button type="button" className="row-del" onClick={() => removeRow(ri)}>×</button>
            </div>
          ))}
          <button type="button" className="row-add" onClick={addRow}>+ Add</button>
        </div>
      );
    }

    default:
      return null;
  }
}
