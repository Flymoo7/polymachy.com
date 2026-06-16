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
 * @param {number} [args.modifier]    flat modifier added to the sum (sum-banded only)
 */
export function rollAndResolve({ pool = 0, strain = 0, config, rng = defaultRng, modifier = 0 }) {
  if (config.model === 'sum-banded') {
    return rollSumBanded({
      count: config.count ?? 2,
      sides: config.die ?? 6,
      modifier,
      bands: config.bands ?? [],
      rng,
    });
  }
  // pool-success (existing logic unchanged)
  const sides = config.die ?? 10;
  const total = Math.max(0, Math.floor(pool));
  const compCount = Math.min(strain, total);
  const regCount = total - compCount;
  const faces = rollPool(regCount, sides, rng);
  const complication = rollPool(compCount, sides, rng);
  return resolvePoolSuccess({ faces, complication, config });
}

/**
 * Roll dice and resolve against a set of numbered bands (e.g. 2d6 + modifier).
 *
 * @param {object} args
 * @param {number} args.count         number of dice to roll
 * @param {number} args.sides         sides per die
 * @param {number} [args.modifier]    flat modifier added to the sum
 * @param {Array}  args.bands         sorted band array from the dice config
 * @param {Function} [args.rng]
 */
export function rollSumBanded({ count, sides, modifier = 0, bands, rng = defaultRng }) {
  const faces = Array.from({ length: Math.max(0, Math.floor(count)) }, () =>
    1 + Math.floor(rng() * sides));
  const total = faces.reduce((a, b) => a + b, 0) + modifier;
  const band = bands.find((b) => b.max === null || total <= b.max) ?? bands[bands.length - 1];
  return {
    total, modifier, faces,
    band: band.label,
    result: band.result,
    success: band.result !== 'miss',
    partial: band.result === 'partial',
  };
}
