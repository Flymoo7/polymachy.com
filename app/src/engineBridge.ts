// Bridges the React app to the dependency-free engine modules. The engine
// is the single source of truth for automation; this file only marshals
// character data into the `vars` the evaluator expects and back out.

// @ts-ignore - JS engine module, typed loosely on purpose
import { evaluate } from '../engine/expression.mjs';
// @ts-ignore
import { rollAndResolve } from '../engine/dice.mjs';
import type { SystemDefinition, FieldDef, Resolved, RollResult } from './types';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const numericType = (t: string) => t === 'dots' || t === 'number';

function maybeDerived(x: unknown): string | null {
  if (x && typeof x === 'object' && 'derived' in (x as any)) return (x as any).derived;
  return null;
}

/**
 * Resolve every field's display value from the raw character data, running
 * derived formulas to a fixpoint so derived-of-derived settle.
 */
export function computeResolved(def: SystemDefinition, data: Record<string, unknown>): Resolved {
  const vars: Resolved = {};

  // seed raw values / defaults
  for (const [id, f] of Object.entries(def.fields)) {
    const raw = data[id];
    if (f.type === 'pool') {
      vars[id] = { current: isNum(raw) ? raw : (isNum(f.default) ? f.default : 0), max: 0 };
    } else if (f.type === 'track' || f.type === 'list') {
      vars[id] = Array.isArray(raw) ? raw : (Array.isArray(f.default) ? f.default : []);
    } else if (numericType(f.type)) {
      vars[id] = isNum(raw) ? raw : (isNum(f.default) ? f.default : 0);
    } else {
      vars[id] = raw ?? f.default ?? '';
    }
  }

  // fixpoint passes for derived scalars, pool maxes, track lengths
  for (let pass = 0; pass < 10; pass++) {
    for (const [id, f] of Object.entries(def.fields)) {
      if (typeof f.derived === 'string') vars[id] = evaluate(f.derived, vars);
      if (f.type === 'pool') {
        const d = maybeDerived(f.max);
        if (d) {
          const m = evaluate(d, vars);
          vars[id] = { current: Math.min(vars[id].current ?? 0, m), max: m };
        } else if (isNum(f.max)) {
          vars[id] = { current: Math.min(vars[id].current ?? 0, f.max), max: f.max };
        }
      }
    }
  }
  return vars;
}

/** Desired box count for a track field (honours derived length). */
export function trackLength(f: FieldDef, vars: Resolved): number {
  const d = maybeDerived(f.length);
  if (d) return Math.max(0, Math.round(evaluate(d, vars)));
  if (isNum(f.length)) return f.length;
  return 0;
}

/** Build a dice pool from a roll expression and resolve it. */
export function performRoll(
  def: SystemDefinition, id: string, vars: Resolved,
): RollResult {
  const roll = def.rolls[id];
  const pool = Math.max(0, Math.round(Number(evaluate(roll.pool, vars)) || 0));
  const strainField = def.dice.complication?.fromField;
  const strain = strainField && isNum(vars[strainField]) ? vars[strainField] : 0;
  const res = rollAndResolve({ pool, strain, config: def.dice });
  return {
    id, label: roll.label, pool, strain,
    successes: res.successes, critical: res.critical, success: res.success,
    complication: res.complication,
    faces: res.detail.faces, complicationFaces: res.detail.complicationFaces,
    at: Date.now(),
  };
}
