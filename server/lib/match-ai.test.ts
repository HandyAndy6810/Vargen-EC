import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiMatchLines } from './match-ai';

const lines = [{ text: 'SL82 MESH 6X2.4', unit: 'EA' }];
const candidates = [{ item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet' }];
const quiet = () => {};

test('a stubbed AI answer is read into suggestions', async () => {
  const out = await aiMatchLines(async () => JSON.stringify({ matches: [{ line: 0, candidate: 0, category: 'material', confidence: 0.92 }] }), lines, candidates, { log: quiet });
  assert.deepEqual(out, [{ candidate: 0, category: 'material', confidence: 0.92, conversion: null }]);
});

test('a failing, slow or empty AI never throws: every line gets no suggestion', async () => {
  assert.deepEqual(await aiMatchLines(async () => { throw new Error('down'); }, lines, candidates, { log: quiet }), [undefined]);
  assert.deepEqual(await aiMatchLines(() => new Promise(() => {}), lines, candidates, { timeoutMs: 20, log: quiet }), [undefined]);
  assert.deepEqual(await aiMatchLines(async () => 'nonsense', lines, candidates, { log: quiet }), [undefined]);
});

test('no lines or no candidates: no call at all', async () => {
  let called = false;
  const complete = async () => { called = true; return '{}'; };
  assert.deepEqual(await aiMatchLines(complete, [], candidates), []);
  assert.deepEqual(await aiMatchLines(complete, lines, []), [undefined]);
  assert.equal(called, false);
});
