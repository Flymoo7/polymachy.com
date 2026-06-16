import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './styles.css';
import App from './App';
import { SessionProvider } from './net/SessionProvider';
import { SystemPicker } from './SystemPicker';
import type { SystemDefinition } from './types';

function Root() {
  const [def, setDef] = useState<SystemDefinition | null>(null);
  if (!def) return <SystemPicker onPick={setDef} />;
  return (
    <SessionProvider sysId={def.system.id}>
      <App def={def} onChangeDef={() => setDef(null)} />
    </SessionProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Root /></StrictMode>,
);
