import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tradesFor, receiptCandidates } from './match-candidates';

test('trades come from the price list and settings; nothing known means every trade', () => {
  assert.deepEqual(tradesFor([{ item: 'Tie wire' }], 'General'), ['Concreting']);
  assert.deepEqual(tradesFor([], 'Plumbing'), ['Plumbing']);
  assert.equal(tradesFor([], 'General').length, 13);
});

test('candidates: their list first, then their trades\' catalogue, deduplicated', () => {
  const c = receiptCandidates([{ item: 'Tie wire', unit: 'roll' }, { item: 'Custom formply', unit: 'sheet' }], null);
  assert.deepEqual(c.slice(0, 2), [{ item: 'Tie wire', unit: 'roll' }, { item: 'Custom formply', unit: 'sheet' }]);
  assert.ok(c.some((x) => x.item === 'Reinforcing mesh SL82 (6 × 2.4 m)'));
  assert.equal(c.filter((x) => x.item === 'Tie wire').length, 1);
  assert.ok(!c.some((x) => x.item === 'Toilet suite'), 'only their trade');
});
