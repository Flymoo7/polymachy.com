import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { CharacterDoc } from '../types';

// The one shared piece of infrastructure: a signalling server that only
// introduces peers (carries no game data). Public default for now; for
// production reliability self-host a tiny signalling server and list it
// here (see app/ARCHITECTURE.md open questions). Traffic between peers is
// end-to-end encrypted with the room code as the password.
const SIGNALING = ['wss://signaling.yjs.dev'];

export type Role = 'gm' | 'player';
export interface Identity { id: string; name: string; role: Role; charId?: string }
export interface LogEntry { at: number; text: string; by: string }
export interface Combatant { id: string; name: string; init: number }
export interface Initiative { list: Combatant[]; turn: number }
export interface Proposal {
  id: string; at: number; by: string; charId: string; charName: string;
  kind: 'roll' | 'action'; label: string; rollId?: string; text?: string;
}

export type Status = 'offline' | 'connecting' | 'connected';

type AwarenessChange = { added: number[]; updated: number[]; removed: number[] };

interface SessionAPI {
  status: Status;
  connected: boolean;
  isGm: boolean;
  room: string | null;
  identity: Identity | null;
  peers: Identity[];
  characters: Record<string, CharacterDoc>;
  log: LogEntry[];
  initiative: Initiative;
  statuses: Record<string, string[]>;
  background: string | null;
  proposals: Proposal[];
  host: (name: string) => string;
  join: (room: string, name: string, role: Role) => void;
  leave: () => void;
  publishCharacter: (char: CharacterDoc) => void;
  removeCharacter: (id: string) => void;
  appendLog: (text: string) => void;
  setInitiative: (init: Initiative) => void;
  setCharacterStatuses: (charId: string, list: string[]) => void;
  setBackground: (value: string | null) => void;
  propose: (p: Omit<Proposal, 'id' | 'at'>) => void;
  removeProposal: (id: string) => void;
}

const EMPTY_INIT: Initiative = { list: [], turn: 0 };
const Ctx = createContext<SessionAPI | null>(null);

const roomCode = () => {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

export function SessionProvider({ children, sysId }: { children: ReactNode; sysId: string }) {
  const docRef = useRef<Y.Doc | null>(null);
  const provRef = useRef<WebrtcProvider | null>(null);
  const ownedRef = useRef<string | null>(null);
  // tracks clientId → charId so GM can prune on abrupt disconnect
  const peerCharsRef = useRef<Map<number, string>>(new Map());

  const [status, setStatus] = useState<Status>('offline');
  const [room, setRoom] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [peers, setPeers] = useState<Identity[]>([]);
  const [characters, setCharacters] = useState<Record<string, CharacterDoc>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [initiative, setInit] = useState<Initiative>(EMPTY_INIT);
  const [statuses, setStatuses] = useState<Record<string, string[]>>({});
  const [background, setBg] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const teardown = useCallback(() => {
    provRef.current?.destroy();
    docRef.current?.destroy();
    provRef.current = null;
    docRef.current = null;
    ownedRef.current = null;
    peerCharsRef.current = new Map();
    setStatus('offline'); setRoom(null); setIdentity(null); setPeers([]);
    setCharacters({}); setLog([]); setInit(EMPTY_INIT); setStatuses({}); setBg(null); setProposals([]);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  // best-effort: drop our own character from the session if the tab closes
  useEffect(() => {
    const onUnload = () => {
      if (docRef.current && ownedRef.current) {
        try { docRef.current.getMap('characters').delete(ownedRef.current); } catch { /* ignore */ }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const connect = useCallback((code: string, id: Identity) => {
    teardown();
    const doc = new Y.Doc();
    const provider = new WebrtcProvider(`omni-${sysId}-${code}`, doc, {
      signaling: SIGNALING,
      password: code,
    });
    docRef.current = doc;
    provRef.current = provider;

    const charMap = doc.getMap('characters');
    const logArr = doc.getArray<LogEntry>('log');
    const sessMap = doc.getMap('session');
    const propArr = doc.getArray<Proposal>('proposals');

    const readChars = () => {
      const out: Record<string, CharacterDoc> = {};
      charMap.forEach((v, k) => { out[k] = v as CharacterDoc; });
      setCharacters(out);
    };
    const readLog = () => setLog((logArr.toArray() as LogEntry[]).slice());
    const readSess = () => {
      setInit((sessMap.get('initiative') as Initiative) ?? EMPTY_INIT);
      setStatuses((sessMap.get('statuses') as Record<string, string[]>) ?? {});
      setBg((sessMap.get('background') as string) ?? null);
    };
    const readProps = () => setProposals((propArr.toArray() as Proposal[]).slice());
    charMap.observe(readChars);
    logArr.observe(readLog);
    sessMap.observe(readSess);
    propArr.observe(readProps);

    const aw = provider.awareness;
    aw.setLocalState(id);
    const readPeers = () => {
      const list: Identity[] = [];
      aw.getStates().forEach((s) => { if (s && (s as any).id) list.push(s as Identity); });
      setPeers(list);
    };
    aw.on('change', ({ removed }: AwarenessChange) => {
      // keep peerCharsRef up to date for current peers
      aw.getStates().forEach((s, clientId) => {
        const charId = (s as any)?.charId as string | undefined;
        if (charId) peerCharsRef.current.set(clientId, charId);
      });
      // GM removes characters whose owner just disconnected abruptly
      if (id.role === 'gm' && removed.length > 0 && docRef.current) {
        const d = docRef.current;
        removed.forEach((clientId) => {
          const charId = peerCharsRef.current.get(clientId);
          if (charId) {
            try { d.transact(() => d.getMap('characters').delete(charId)); } catch { /* ignore */ }
            peerCharsRef.current.delete(clientId);
          }
        });
      }
      readPeers();
    });

    setIdentity(id); setRoom(code); setStatus('connected');
    readChars(); readLog(); readSess(); readProps(); readPeers();
  }, [teardown]);

  const leave = useCallback(() => {
    if (docRef.current && ownedRef.current) {
      try { docRef.current.getMap('characters').delete(ownedRef.current); } catch { /* ignore */ }
    }
    // small delay so the deletion can propagate before we tear down
    setTimeout(teardown, 200);
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

  const publishCharacter = useCallback((char: CharacterDoc) => {
    ownedRef.current = char.id;
    provRef.current?.awareness.setLocalStateField('charId', char.id);
    withDoc((d) => d.getMap('characters').set(char.id, char));
  }, []);
  const removeCharacter = useCallback((id: string) => withDoc((d) => d.getMap('characters').delete(id)), []);

  const propose = useCallback((p: Omit<Proposal, 'id' | 'at'>) => withDoc((d) =>
    d.getArray<Proposal>('proposals').push([{ ...p, id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now() }])), []);
  const removeProposal = useCallback((id: string) => withDoc((d) => {
    const arr = d.getArray<Proposal>('proposals');
    const items = arr.toArray() as Proposal[];
    const i = items.findIndex((x) => x.id === id);
    if (i >= 0) arr.delete(i, 1);
  }), []);
  const appendLog = useCallback((text: string) => withDoc((d) => {
    const by = (provRef.current?.awareness.getLocalState() as Identity)?.name ?? 'Someone';
    const arr = d.getArray<LogEntry>('log');
    arr.push([{ at: Date.now(), text, by }]);
    const MAX_LOG = 200;
    if (arr.length > MAX_LOG) arr.delete(0, arr.length - MAX_LOG);
  }), []);
  const setInitiative = useCallback((init: Initiative) => withDoc((d) => d.getMap('session').set('initiative', init)), []);
  const setCharacterStatuses = useCallback((charId: string, list: string[]) => withDoc((d) => {
    const m = d.getMap('session');
    const cur = (m.get('statuses') as Record<string, string[]>) ?? {};
    m.set('statuses', { ...cur, [charId]: list });
  }), []);
  const setBackground = useCallback((value: string | null) => withDoc((d) => {
    const m = d.getMap('session');
    if (value) m.set('background', value); else m.delete('background');
  }), []);

  const api: SessionAPI = {
    status, connected: status === 'connected', isGm: identity?.role === 'gm', room, identity, peers,
    characters, log, initiative, statuses, background, proposals,
    host, join, leave,
    publishCharacter, removeCharacter, appendLog, setInitiative, setCharacterStatuses, setBackground,
    propose, removeProposal,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
