import { useRef } from 'react';
import type { SystemDefinition } from './types';
import aotvDef from '../systems/sample-ashes-of-the-verge.json';
import smDef from '../systems/sample-shattered-meridian.json';

const BUNDLED = [
  aotvDef as unknown as SystemDefinition,
  smDef as unknown as SystemDefinition,
];

export function SystemPicker({ onPick }: { onPick: (def: SystemDefinition) => void }) {
  const importRef = useRef<HTMLInputElement>(null);

  const importSystem = async (file: File) => {
    try {
      const text = await file.text();
      const def = JSON.parse(text) as SystemDefinition;
      if (!def?.system?.id || !def?.fields) { alert('Not a valid system definition file.'); return; }
      onPick(def);
    } catch { alert('Could not read that file.'); }
  };

  return (
    <div className="syspick">
      <header className="topbar">
        <div className="brand">POLY<span>MACHY</span><em>Omni Matrix</em></div>
      </header>
      <div className="syspick-body">
        <h1 className="syspick-heading">Choose a game system</h1>
        <p className="syspick-sub muted">Pick one of the bundled samples to get started, or import your own system definition.</p>
        <div className="syspick-grid">
          {BUNDLED.map((def) => (
            <button key={def.system.id} className="syspick-card" onClick={() => onPick(def)}>
              <div className="syspick-name">{def.system.name}</div>
              <div className="syspick-dice">{def.system.diceModel}</div>
              <div className="syspick-summary">{def.system.summary}</div>
            </button>
          ))}
          <button className="syspick-card syspick-card--import" onClick={() => importRef.current?.click()}>
            <div className="syspick-name">Import system…</div>
            <div className="syspick-summary">Load a custom system definition JSON file from your device.</div>
            <input ref={importRef} type="file" accept="application/json" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importSystem(f); e.target.value = ''; }} />
          </button>
        </div>
      </div>
    </div>
  );
}
