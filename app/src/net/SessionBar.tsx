import { useState } from 'react';
import { useSession } from './SessionProvider';

// Host/join controls + presence. Shown in both player and GM views.
export function SessionBar({ defaultName = '', hostOnly = false }: { defaultName?: string; hostOnly?: boolean }) {
  const s = useSession();
  const [mode, setMode] = useState<null | 'host' | 'join'>(null);
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState('');
  const [hostedCode, setHostedCode] = useState('');

  if (s.connected) {
    return (
      <div className="sessbar online">
        <span className="sess-pill live">● Live</span>
        <span className="sess-room">Room <b>{s.room}</b></span>
        <span className="sess-role">{s.identity?.role === 'gm' ? 'Hosting (GM)' : 'Player'}</span>
        <span className="sess-peers">
          {s.peers.length} connected:
          {s.peers.map((p) => (
            <span key={p.id} className={`peer ${p.role}`} title={p.role}>{p.name}</span>
          ))}
        </span>
        <button className="btn" onClick={s.leave}>Leave</button>
      </div>
    );
  }

  return (
    <div className="sessbar">
      <span className="sess-pill">○ Offline</span>
      {!mode && (
        <>
          <button className="btn" onClick={() => { setMode('host'); setName(defaultName || 'GM'); }}>Host session (GM)</button>
          {!hostOnly && <button className="btn" onClick={() => { setMode('join'); setName(defaultName); }}>Join session</button>}
        </>
      )}

      {mode === 'host' && (
        <>
          <input className="field-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-on" onClick={() => setHostedCode(s.host(name))}>Start hosting</button>
          <button className="btn" onClick={() => setMode(null)}>Cancel</button>
          {hostedCode && <span className="sess-room">Share code <b>{hostedCode}</b></span>}
        </>
      )}

      {mode === 'join' && (
        <>
          <input className="field-input sess-code" placeholder="Room code" value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} />
          <input className="field-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-on" disabled={!code.trim()} onClick={() => s.join(code, name, 'player')}>Join</button>
          <button className="btn" onClick={() => setMode(null)}>Cancel</button>
        </>
      )}
    </div>
  );
}
