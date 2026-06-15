import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePoolSuccess, rollPool, rollAndResolve } from './dice.mjs';

// mirrors the `dice` block in sample-ashes-of-the-verge.json
const config = {
  model: 'pool-success',
  die: 10,
  target: 6,
  double: { value: 10, perPair: 2 },
  complication: {
    enabled: true, label: 'Strain', fromField: 'strain',
    critOn: 10, botchOn: 1,
    critOutcome: 'overreach', botchOutcome: 'ruin',
  },
};

test('counts successes at or above target', () => {
  const r = resolvePoolSuccess({ faces: [6, 7, 5, 10, 2], config });
  // 6,7,10 are >= 6 -> 3 successes (single 10, no pair)
  assert.equal(r.successes, 3);
  assert.equal(r.success, true);
  assert.equal(r.critical, false);
});

test('a pair of 10s is a critical adding +2', () => {
  const r = resolvePoolSuccess({ faces: [10, 10, 5], config });
  // two 10s = 2 base successes + 2 crit bonus = 4
  assert.equal(r.successes, 4);
  assert.equal(r.critical, true);
});

test('total failure when no die meets target', () => {
  const r = resolvePoolSuccess({ faces: [1, 2, 3, 4, 5], config });
  assert.equal(r.successes, 0);
  assert.equal(r.success, false);
  assert.equal(r.complication, null);
});

test('overreach: critical that includes a complication 10', () => {
  const r = resolvePoolSuccess({ faces: [10], complication: [10], config });
  assert.equal(r.critical, true);
  assert.equal(r.success, true);
  assert.equal(r.complication, 'overreach');
});

test('ruin: failure with a 1 on a complication die', () => {
  const r = resolvePoolSuccess({ faces: [2, 3], complication: [1], config });
  assert.equal(r.success, false);
  assert.equal(r.complication, 'ruin');
});

test('no ruin when the roll succeeds even with a complication 1', () => {
  const r = resolvePoolSuccess({ faces: [8], complication: [1], config });
  assert.equal(r.success, true);
  assert.equal(r.complication, null);
});

test('rollPool respects count and bounds with a stub rng', () => {
  const faces = rollPool(5, 10, () => 0.55); // -> 1 + floor(5.5) = 6
  assert.equal(faces.length, 5);
  assert.ok(faces.every((f) => f === 6));
});

test('rollAndResolve splits strain dice out of the pool', () => {
  // rng always max -> every die is a 10
  const r = rollAndResolve({ pool: 4, strain: 1, config, rng: () => 0.999 });
  assert.equal(r.detail.faces.length, 3);
  assert.equal(r.detail.complicationFaces.length, 1);
  assert.equal(r.critical, true);          // four 10s -> two pairs
  assert.equal(r.complication, 'overreach'); // a strain die shows 10
});
