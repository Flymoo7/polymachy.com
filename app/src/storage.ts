// Shared localStorage helpers, namespaced per system. Used by both the
// player sheet and the GM console so they read/write the same data.
import sampleDef from '../systems/sample-ashes-of-the-verge.json';
import type { CharacterDoc, RosterEntry } from './types';

const SYSID = (sampleDef as any).system.id as string;

export const KEY = (k: string) => `om:${SYSID}:${k}`;

export function save(k: string, v: unknown) {
  try { localStorage.setItem(KEY(k), JSON.stringify(v)); } catch { /* ignore */ }
}

export function rawLoad(k: string): any {
  try { const r = localStorage.getItem(KEY(k)); return r ? JSON.parse(r) : null; } catch { return null; }
}

export function load<T>(k: string, fallback: () => T): T {
  const v = rawLoad(k);
  return v == null ? fallback() : v as T;
}

export function remove(k: string) {
  try { localStorage.removeItem(KEY(k)); } catch { /* ignore */ }
}

export function loadRoster(): RosterEntry[] {
  return (rawLoad('roster') as RosterEntry[]) ?? [];
}

export function loadCharacter(id: string): CharacterDoc | null {
  return rawLoad(`char:${id}`) as CharacterDoc | null;
}
