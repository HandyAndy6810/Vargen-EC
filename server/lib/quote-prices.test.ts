import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuoteMatches, matchLearnedEntries } from './quote-prices';
import { applyPriceMatches, type PriceRow } from '../../shared/price-list';

// The tradie's price list: one price from a receipt (Reece), one from an edit.
const rows: PriceRow[] = [
  { id: 1, item: 'Reinforcing mesh SL82 (6 × 2.4 m)', quantity: 4, unit: 'sheet', unitPrice: 128.5, priceDate: '2026-10-20T12:00:00Z', supplier: 'Reece' },
  { id: 2, item: 'Reo bar N12', quantity: 60, unit: 'm', unitPrice: 2.48, priceDate: '2026-10-20T12:00:00Z', supplier: 'Reece' },
];
// An AI quote whose line names differ from the tradie's.
const items = [
  { description: 'SL82 mesh sheet', quantity: 6, unit: 'sheet', unitPrice: 160, unitCost: 110, category: 'material' },
  { description: 'N12 reo bar 6M', quantity: 10, unit: 'length', unitPrice: 20, unitCost: 13, category: 'material' },
  { description: 'Builders plastic', quantity: 1, unit: 'roll', unitPrice: 120, unitCost: 80, category: 'material' },
  { description: 'Labour', quantity: 8, unit: 'hr', unitPrice: 85, category: 'labour' },
];
const quiet = () => {};
const ai = (matches: any[]) => async () => JSON.stringify({ matches });

test('a receipt price reaches a differently worded AI line through a confident match', async () => {
  let calls = 0;
  const complete = async (s: string, u: string) => { calls++; return ai([
    { line: 0, candidate: 0, category: 'material', confidence: 0.94 },
    { line: 1, candidate: 1, category: 'material', confidence: 0.9 },
    { line: 2, candidate: null, category: 'material', confidence: 0.2 },
  ])(); };
  const matches = await resolveQuoteMatches(items, rows, [], complete);
  assert.equal(calls, 1, 'one batched call per quote');
  const priced = applyPriceMatches(items, matches, 50);
  assert.equal(priced[0].priceSource, 'yours');
  assert.equal(priced[0].unitCost, 128.5);
  assert.equal(priced[0].priceSupplier, 'Reece');
  // A 6 m length at $2.48/m: $14.88 a length, at 50% markup.
  assert.equal(priced[1].unitCost, 14.88);
  assert.equal(priced[1].unitPrice, 22.32);
  assert.equal(priced[2].priceSource, 'estimate');
  assert.equal(priced[3].priceSource, undefined, 'labour untouched');
});

test('a low-confidence match leaves the line an estimate (never the Not sure list)', async () => {
  const matches = await resolveQuoteMatches(items.slice(0, 1), rows, [], ai([{ line: 0, candidate: 0, category: 'material', confidence: 0.6 }]));
  assert.equal(applyPriceMatches(items.slice(0, 1), matches, 0)[0].priceSource, 'estimate');
});

test('the quote still prices when the matching call fails: plain matches only', async () => {
  const plainItems = [{ description: 'Reinforcing mesh SL82 (6 × 2.4 m)', quantity: 2, unit: 'sheet', unitPrice: 160, category: 'material' }, ...items];
  const matches = await resolveQuoteMatches(plainItems, rows, [], async () => { throw new Error('provider down'); });
  const priced = applyPriceMatches(plainItems, matches, 0);
  assert.equal(priced[0].priceSource, 'yours');   // plain match still works
  assert.equal(priced[1].priceSource, 'estimate'); // needed the AI
});

test('no price list, no AI call', async () => {
  let calls = 0;
  const m = await resolveQuoteMatches(items, [], [], async () => { calls++; return '{}'; });
  assert.equal(calls, 0);
  assert.deepEqual(m, [undefined, undefined, undefined, undefined]);
});

test('an edit to a differently worded line updates the same item a receipt does', async () => {
  const learned = [{ item: 'SL82 mesh sheet', quantity: 6, unit: 'sheet', unitPrice: 131 }];
  const out = await matchLearnedEntries(learned, rows, [], ai([{ line: 0, candidate: 0, category: 'material', confidence: 0.95 }]));
  assert.deepEqual(out, [{ item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet', unitPrice: 131, quantity: 6 }]);
  // Converted to the item's unit: a length edit stored per metre.
  const bar = await matchLearnedEntries([{ item: 'N12 reo bar 6M', quantity: 10, unit: 'length', unitPrice: 15.6 }], rows, [], ai([{ line: 0, candidate: 1, category: 'material', confidence: 0.92 }]));
  assert.deepEqual(bar, [{ item: 'Reo bar N12', unit: 'm', unitPrice: 2.6, quantity: 60 }]);
  // No confident match: kept as learned.
  const kept = await matchLearnedEntries(learned, rows, [], async () => { throw new Error('down'); });
  assert.deepEqual(kept, learned);
});
