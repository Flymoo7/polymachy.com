import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import sampleDef from '../../systems/sample-ashes-of-the-verge.json';
import type { CharacterDoc } from '../types';

const SYS = (sampleDef as any).system.id as string;

// The one shared piece of infrastructure: a signalling server that only
// introduces peers (carries no game data). Public default for now; for
// production reliability self-host a tiny signalling server and list it
// here (see app/ARCHITECTURE.md open questions). Traffic between peers is
// end-to-end encrypted with the room code as the password.
const SIGNALING = ['wss://signaling.yjs.dev'];

export type Role = 'gm' | 'player';
export interface Identity { id: string; name: string; role: Role }
export interface LogEntry { at: number; text: string; by: string }
export interface Combatant { id: string; name: string; init: number }
export interface Initiative { list: Combatant[]; turn: number }

export type Status = 'offline' | 'connecting' | 'connected';

interface SessionAPI {
  status: Status;
  connected: boolean;
  room: string | null;
  identity: Identity | null;
  peers: Identity[];
  characters: Record<string, CharacterDoc>;
  log: LogEntry[];
  initiative: Initiative;
  statuses: Record<string, string[]>;
  host: (name: string) => string;
  join: (room: string, name: string, role: Role) => void;
  leave: () => void;
  publishCharacter: (char: CharacterDoc) => void;
  removeCharacter: (id: string) => void;
  appendLog: (text: string) => void;
  setInitiative: (init: Initiative) => void;
  setCharacterStatuses: (charId: string, list: string[]) => void;
}

const EMPTY_INIT: Initiative = { list: [], turn: 0 };
const Ctx = createContext<SessionAPI | null>(null);

const roomCode = () => {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const docRef = useRef<Y.Doc | null>(null);
  const provRef = useRef<WebrtcProvider | null>(null);

  const [status, setStatus] = useState<Status>('offline');
  const [room, setRoom] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [peers, setPeers] = useState<Identity[]>([]);
  const [characters, setCharacters] = useState<Record<string, CharacterDoc>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [initiative, setInit] = useState<Initiative>(EMPTY_INIT);
  const [statuses, setStatuses] = useState<Record<string, string[]>>({});

  const teardown = useCallback(() => {
    provRef.current?.destroy();
    docRef.current?.destroy();
    provRef.current = null;
    docRef.current = null;
    setStatus('offline'); setRoom(null); setIdentity(null); setPeers([]);
    setCharacters({}); setLog([]); setInit(EMPTY_INIT); setStatuses({});
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const connect = useCallback((code: string, id: Identity) => {
    teardown();
    const doc = new Y.Doc();
    const provider = new WebrtcProvider(`omni-${SYS}-${code}`, doc, {
      signaling: SIGNALING,
      password: code,
    });
    docRef.current = doc;
    provRef.current = provider;

    const charMap = doc.getMap('characters');
    const logArr = doc.getArray<LogEntry>('log');
    const sessMap = doc.getMap('session');

    const readChars = () => {
      const out: Record<string, CharacterDoc> = {};
      charMap.forEach((v, k) => { out[k] = v as CharacterDoc; });
      setCharacters(out);
    };
    const readLog = () => setLog((logArr.toArray() as LogEntry[]).slice());
    const readSess = () => {
      setInit((sessMap.get('initiative') as Initiative) ?? EMPTY_INIT);
      setStatuses((sessMap.get('statuses') as Record<string, string[]>) ?? {});
    };
    charMap.observe(readChars);
    logArr.observe(readLog);
    sessMap.observe(readSess);

    const aw = provider.awareness;
    aw.setLocalState(id);
    const readPeers = () => {
      const list: Identity[] = [];
      aw.getStates().forEach((s) => { if (s && (s as any).id) list.push(s as Identity); });
      setPeers(list);
    };
    aw.on('change', readPeers);

    setIdentity(id); setRoom(code); setStatus('connected');
    readChars(); readLog(); readSess(); readPeers();
  }, [teardown]);

  const host = useCallback((name: string) => {
    const code = roomCode();
    connect(code, { id: `gm-${Date.now().toString(36)}`, name: name || 'GM', role: 'gm' });
    return code;
  }, [connect]);

  const join = useCallback((code: string, name: string, role: Role) => {
    setStatus('connecting');
    connect(code.toUpperCase().trim(), { id: `${role}-${Date.now().toString(36)}`, name: name || 'Player', role });
  }, [connect]);

  const withDoc = (fn: (doc: Y.Doc) => void) => { if (docRef.current) docRef.current.transact(() => fn(docRef.current!)); };

  const publishCharacter = useCallback((char: CharacterDoc) => withDoc((d) => d.getMap('characters').set(char.id, char)), []);
  const removeCharacter = useCallback((id: string) => withDoc((d) => d.getMap('characters').delete(id)), []);
  const appendLog = useCallback((text: string) => withDoc((d) => {
    const by = (provRef.current?.awareness.getLocalState() as Identity)?.name ?? 'Someone';
    d.getArray<LogEntry>('log').push([{ at: Date.now(), text, by }]);
  }), []);
  const setInitiative = useCallback((init: Initiative) => withDoc((d) => d.getMap('session').set('initiative', init)), []);
  const setCharacterStatuses = useCallback((charId: string, list: string[]) => withDoc((d) => {
    const m = d.getMap('session');
    const cur = (m.get('statuses') as Record<string, string[]>) ?? {};
    m.set('statuses', { ...cur, [charId]: list });
  }), []);

  const api: SessionAPI = {
    status, connected: status === 'connected', room, identity, peers,
    characters, log, initiative, statuses,
    host, join, leave: teardown,
    publishCharacter, removeCharacter, appendLog, setInitiative, setCharacterStatuses,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
