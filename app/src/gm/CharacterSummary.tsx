import { useMemo } from 'react';
import type { SystemDefinition, CharacterDoc } from '../types';
import { computeResolved, performRoll, trackLength } from '../engineBridge';
import type { RollResult } from '../types';

interface Props {
  def: SystemDefinition;
  char: CharacterDoc;
  statuses: string[];
  onRoll: (charName: string, result: RollResult) => void;
  onToggleStatus: (statusId: string) => void;
  onOpen?: () => void;
}

// A compact, read-only view of a character for the GM multi-sheet overview.
export function CharacterSummary({ def, char, statuses, onRoll, onToggleStatus, onOpen }: Props) {
  const vars = useMemo(() => computeResolved(def, char.data), [char.data]);

  const entries = Object.entries(def.fields);
  const dots = entries.filter(([, f]) => f.type === 'dots');
  const pools = entries.filter(([, f]) => f.type === 'pool');
  const tracks = entries.filter(([, f]) => f.type === 'track');

  const statusDefs = (def.statusEffects ?? []) as { id: string; label: string; help?: string }[];

  return (
    <div className="gm-card">
      <div className="gm-card-head">
        <span className="gm-card-name">{char.meta.name}</span>
        {onOpen && <button className="gm-open" title="Open in player view" onClick={onOpen}>open ↗</button>}
      </div>

      <div className="gm-traits">
        {dots.map(([id, f]) => (
          <span className="gm-trait" key={id}><b>{vars[id] ?? 0}</b> {f.label}</span>
        ))}
      </div>

      {(pools.length > 0 || tracks.length > 0) && (
        <div className="gm-meters">
          {pools.map(([id, f]) => (
            <span className="gm-meter pool" key={id}>{f.label} {vars[id]?.current ?? 0}/{vars[id]?.max ?? 0}</span>
          ))}
          {tracks.map(([id, f]) => {
            const len = trackLength(f, vars);
            const arr = (vars[id] as string[]) ?? [];
            const filled = arr.filter((v) => v && v !== (f.states?.[0] ?? 'ok')).length;
            return <span className="gm-meter track" key={id}>{f.label} {filled}/{len}</span>;
          })}
        </div>
      )}

      {statusDefs.length > 0 && (
        <div className="gm-statuses">
          {statusDefs.map((s) => (
            <button
              key={s.id}
              className={`gm-status ${statuses.includes(s.id) ? 'on' : ''}`}
              title={s.help} onClick={() => onToggleStatus(s.id)}
            >{s.label}</button>
          ))}
        </div>
      )}

      <div className="gm-rolls">
        {Object.entries(def.rolls).map(([id, r]) => (
          <button key={id} className="gm-roll" onClick={() => onRoll(char.meta.name, performRoll(def, id, vars))}>{r.label}</button>
        ))}
      </div>
    </div>
  );
}
