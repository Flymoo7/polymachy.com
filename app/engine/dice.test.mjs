import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePoolSuccess, rollPool, rollAndResolve, rollSumBanded } from './dice.mjs';

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

// ── sum-banded (Shattered Meridian model) ────────────────────────────────────
const smBands = [
  { max: 6,   label: 'Miss',        result: 'miss' },
  { max: 9,   label: 'Partial hit', result: 'partial' },
  { max: null, label: 'Full hit',   result: 'success' },
];

test('rollSumBanded: faces sum below band threshold → Miss', () => {
  // two 6-sided dice always showing 1 -> sum 2, modifier 0 -> total 2 <= 6
  const r = rollSumBanded({ count: 2, sides: 6, modifier: 0, bands: smBands, rng: () => 0 });
  assert.equal(r.total, 2);
  assert.equal(r.band, 'Miss');
  assert.equal(r.result, 'miss');
  assert.equal(r.success, false);
});

test('rollSumBanded: faces sum in middle band → Partial hit', () => {
  // rng 0.5 -> 1 + floor(3) = 4 per die; two dice = 8, modifier 0; 6 < 8 <= 9
  const r = rollSumBanded({ count: 2, sides: 6, modifier: 0, bands: smBands, rng: () => 0.5 });
  assert.equal(r.total, 8);
  assert.equal(r.band, 'Partial hit');
  assert.equal(r.result, 'partial');
  assert.equal(r.partial, true);
});

test('rollSumBanded: faces sum above top band → Full hit', () => {
  // rng 0.999 -> 1 + floor(5.994) = 6 per die; two dice = 12 > 9
  const r = rollSumBanded({ count: 2, sides: 6, modifier: 0, bands: smBands, rng: () => 0.999 });
  assert.equal(r.total, 12);
  assert.equal(r.band, 'Full hit');
  assert.equal(r.result, 'success');
  assert.equal(r.success, true);
});

test('rollSumBanded: modifier shifts total into a higher band', () => {
  // rng 0 -> each die shows 1; two dice sum = 2; +5 modifier -> total 7; 6 < 7 <= 9 = Partial hit
  const r = rollSumBanded({ count: 2, sides: 6, modifier: 5, bands: smBands, rng: () => 0 });
  assert.equal(r.total, 7);
  assert.equal(r.modifier, 5);
  assert.equal(r.band, 'Partial hit');
  assert.equal(r.result, 'partial');
});
