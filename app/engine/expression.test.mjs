import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, dependencies, ExpressionError } from './expression.mjs';

test('arithmetic and precedence', () => {
  assert.equal(evaluate('1 + 2 * 3'), 7);
  assert.equal(evaluate('(1 + 2) * 3'), 9);
  assert.equal(evaluate('10 % 3'), 1);
  assert.equal(evaluate('7 / 2'), 3.5);
  assert.equal(evaluate('2 - -3'), 5);
});

test('variable resolution', () => {
  const vars = { might: 3, melee: 2 };
  assert.equal(evaluate('might + melee', vars), 5);
  assert.equal(evaluate('3 + vigor', { vigor: 4 }), 7);
  // unknown identifiers resolve to 0 (partial sheets must not crash)
  assert.equal(evaluate('unknown + 1'), 1);
});

test('member access on pools and tracks', () => {
  const vars = {
    resolve: { current: 5, max: 7 },
    vitality: ['ok', 'grazed', 'broken', 'ok'],
  };
  assert.equal(evaluate('resolve.current', vars), 5);
  assert.equal(evaluate('resolve.max - resolve.current', vars), 2);
  assert.equal(evaluate('vitality.length', vars), 4);
  assert.equal(evaluate('vitality.filled', vars), 2); // grazed + broken
});

test('comparisons, logicals and ternary', () => {
  assert.equal(evaluate('3 > 2 && 1 < 2'), true);
  assert.equal(evaluate('5 == 5'), true);
  assert.equal(evaluate('5 != 5'), false);
  assert.equal(evaluate('!(1 > 2)'), true);
  assert.equal(evaluate('might >= 3 ? 10 : 0', { might: 3 }), 10);
  assert.equal(evaluate('might >= 3 ? 10 : 0', { might: 1 }), 0);
});

test('whitelisted functions', () => {
  assert.equal(evaluate('max(1, 5, 3)'), 5);
  assert.equal(evaluate('min(1, 5, 3)'), 1);
  assert.equal(evaluate('clamp(12, 0, 10)'), 10);
  assert.equal(evaluate('floor(3.9)'), 3);
  assert.equal(evaluate('ceil(3.1)'), 4);
  assert.equal(evaluate('round(3.5)'), 4);
  assert.equal(evaluate('abs(-4)'), 4);
});

test('sum and count over a list field', () => {
  const vars = {
    gear: [{ weight: 2 }, { weight: 3 }, { weight: 0 }],
  };
  assert.equal(evaluate('sum(gear, "weight")', vars), 5);
  assert.equal(evaluate('count(gear)', vars), 3);
  assert.equal(evaluate('sum(missing, "weight")', vars), 0);
});

test('division by zero is safe', () => {
  assert.equal(evaluate('5 / 0'), 0);
  assert.equal(evaluate('5 % 0'), 0);
});

test('dependency extraction', () => {
  const deps = dependencies('3 + composure + wits').sort();
  assert.deepEqual(deps, ['composure', 'wits']);
  const deps2 = dependencies('resolve.current + might').sort();
  assert.deepEqual(deps2, ['might', 'resolve']);
});

test('rejects malformed / unsafe input', () => {
  assert.throws(() => evaluate('1 +'), ExpressionError);
  assert.throws(() => evaluate('foo(1)'), ExpressionError); // unknown function
  assert.throws(() => evaluate('1 2'), ExpressionError);    // trailing input
  assert.throws(() => evaluate('"unterminated'), ExpressionError);
});

test('sample-system derived formulas', () => {
  // mirrors sample-ashes-of-the-verge.json
  const vars = {
    vigor: 2, composure: 3, wits: 2, presence: 4,
    gear: [{ weight: 1 }, { weight: 2 }],
  };
  assert.equal(evaluate('3 + vigor', vars), 5);              // vitality_len
  assert.equal(evaluate('composure + wits', vars), 5);       // resolve_max
  assert.equal(evaluate('presence + 1', vars), 5);           // focus_pool max
  assert.equal(evaluate('sum(gear, "weight")', vars), 3);    // load
});
