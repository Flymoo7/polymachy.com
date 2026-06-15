/**
 * Configurable dice resolver for the Omni Matrix engine.
 *
 * Implements generic, parameterized dice models so no game's specifics are
 * hard-coded (see ../systems/SYSTEM-FORMAT.md). The first model is
 * `pool-success` (d10-style success pools with criticals and an optional
 * "complication" sub-pool). Rolling is split from resolving so results are
 * deterministic and testable: pass explicit faces to the resolver, or use
 * `rollPool` with an injectable RNG.
 *
 * Dependency-free ES module; ports directly to the TS app.
 */

/** Default RNG; inject a seeded one in tests. */
export function defaultRng() { return Math.random(); }

/** Roll `n` dice of `sides`, returning an array of faces (1..sides). */
export function rollPool(n, sides, rng = defaultRng) {
  const out = [];
  for (let i = 0; i < Math.max(0, Math.floor(n)); i++) {
    out.push(1 + Math.floor(rng() * sides));
  }
  return out;
}

/**
 * Resolve a `pool-success` roll.
 *
 * @param {object} args
 * @param {number[]} args.faces        regular dice faces
 * @param {number[]} [args.complication]  complication ("Strain"-type) dice faces
 * @param {object} args.config         the system definition's `dice` block
 * @returns {{
 *   successes:number, critical:boolean, success:boolean,
 *   complication: null | string,        // e.g. "overreach" | "ruin"
 *   detail: { faces:number[], complicationFaces:number[], target:number }
 * }}
 */
export function resolvePoolSuccess({ faces = [], complication = [], config }) {
  const target = config.target ?? 6;
  const doubleCfg = config.double ?? null;          // { value, perPair }
  const comp = config.complication ?? null;

  const all = [...faces, ...complication];

  // base successes: each die >= target counts once
  let successes = all.filter((f) => f >= target).length;

  // criticals: each PAIR of `double.value` faces adds `perPair`
  let critical = false;
  if (doubleCfg) {
    const matches = all.filter((f) => f === doubleCfg.value).length;
    const pairs = Math.floor(matches / 2);
    if (pairs > 0) {
      successes += pairs * doubleCfg.perPair;
      critical = true;
    }
  }

  const success = successes > 0;

  // complication outcomes from the complication sub-pool
  let complicationOutcome = null;
  if (comp && comp.enabled && complication.length) {
    const hasCrit = complication.some((f) => f === comp.critOn);
    const hasBotch = complication.some((f) => f === comp.botchOn);
    if (success && critical && hasCrit) {
      complicationOutcome = comp.critOutcome ?? 'overreach';
    } else if (!success && hasBotch) {
      complicationOutcome = comp.botchOutcome ?? 'ruin';
    }
  }

  return {
    successes,
    critical,
    success,
    complication: complicationOutcome,
    detail: { faces, complicationFaces: complication, target },
  };
}

/**
 * Build and resolve a pool in one call.
 *
 * @param {object} args
 * @param {number} args.pool          total dice to roll
 * @param {number} [args.strain]      how many of the pool are complication dice
 * @param {object} args.config        the `dice` definition block
 * @param {Function} [args.rng]
 */
export function rollAndResolve({ pool, strain = 0, config, rng = defaultRng }) {
  const sides = config.die ?? 10;
  const total = Math.max(0, Math.floor(pool));
  const compCount = Math.min(strain, total);
  const regCount = total - compCount;
  const faces = rollPool(regCount, sides, rng);
  const complication = rollPool(compCount, sides, rng);
  return resolvePoolSuccess({ faces, complication, config });
}
