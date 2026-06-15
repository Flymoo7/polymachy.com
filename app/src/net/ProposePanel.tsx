import { useState } from 'react';
import type { SystemDefinition } from '../types';
import { useSession } from './SessionProvider';

// Player-side: request a roll or propose an action for the GM to approve.
export function ProposePanel({ def, charId, charName }: { def: SystemDefinition; charId: string; charName: string }) {
  const s = useSession();
  const [rollId, setRollId] = useState<string>(Object.keys(def.rolls)[0] ?? '');
  const [text, setText] = useState('');

  if (!s.connected) return null;

  const requestRoll = () => {
    const r = def.rolls[rollId];
    if (!r) return;
    s.propose({ by: s.identity?.name ?? charName, charId, charName, kind: 'roll', label: r.label, rollId });
  };
  const proposeAction = () => {
    if (!text.trim()) return;
    s.propose({ by: s.identity?.name ?? charName, charId, charName, kind: 'action', label: text.trim(), text: text.trim() });
    setText('');
  };

  return (
    <div className="propose">
      <span className="propose-label">Ask the GM:</span>
      <select className="field-input" value={rollId} onChange={(e) => setRollId(e.target.value)}>
        {Object.entries(def.rolls).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
      </select>
      <button className="btn" onClick={requestRoll}>Request roll</button>
      <input className="field-input propose-text" placeholder="…or describe an action"
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') proposeAction(); }} />
      <button className="btn" onClick={proposeAction}>Propose</button>
      {s.proposals.length > 0 && <span className="propose-pending">{s.proposals.length} awaiting GM</span>}
    </div>
  );
}
