import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QUICK_SETUP_TRADES } from './quick-setup-items';
import { parsePrice, quickSetupEntries, cleanSuggestions, changedEntries, entryKey, MAX_SUGGESTIONS } from './quick-setup';

test('the item lists match the design doc exactly', () => {
  const md = fs.readFileSync(path.join(process.cwd(), 'docs', 'pricing-design.md'), 'utf8');
  const sec = md.slice(md.indexOf('## Quick setup item lists (draft)'), md.indexOf('## Build order'));
  const fromDoc: { trade: string; items: [string, string][] }[] = [];
  for (const line of sec.split('\n')) {
    const h = line.match(/^#### (.+)$/);
    if (h) { fromDoc.push({ trade: h[1].trim(), items: [] }); continue; }
    const r = line.match(/^\| (.+?) \| (.+?) \|$/);
    if (r && fromDoc.length && r[1] !== 'Item' && !r[1].startsWith('---')) fromDoc[fromDoc.length - 1].items.push([r[1].trim(), r[2].trim()]);
  }
  assert.equal(fromDoc.length, 13);
  assert.deepEqual(
    QUICK_SETUP_TRADES.map((t) => ({ trade: t.trade, items: t.items.map((i) => [i.item, i.unit]) })),
    fromDoc,
  );
  assert.deepEqual(QUICK_SETUP_TRADES.filter((t) => t.launch).map((t) => t.trade),
    ['Concreting', 'Fencing', 'Landscaping', 'Plumbing', 'Electrical', 'Carpentry', 'Handyman']);
});

test('typed prices', () => {
  assert.equal(parsePrice('12.5'), 12.5);
  assert.equal(parsePrice(' $1,250 '), 1250);
  assert.equal(parsePrice('12.345'), 12.35);
  for (const bad of ['', ' ', 'abc', '0', '-3', null, undefined]) assert.equal(parsePrice(bad), null, String(bad));
});

test('a save keeps good entries, drops junk and duplicates, holds back absurd prices', () => {
  const { entries, heldBack } = quickSetupEntries({
    entries: [
      { item: 'Premix concrete, 25 MPa', unit: 'm³', unitPrice: '290' },
      { item: 'premix concrete 25 MPa', unit: 'm3', unitPrice: 300 }, // same item and unit: first wins
      { item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet', unitPrice: '$128.50' },
      { item: '', unit: 'bag', unitPrice: 10 },
      { item: 'Bar chairs', unit: '', unitPrice: 10 },
      { item: 'Tie wire', unit: 'roll', unitPrice: '' },
      { item: 'Colour oxide', unit: 'bag', unitPrice: 999999 },
      { item: 'Tiles', unit: 'm²', unitPrice: 2 }, // sanity band: tiles at $2/m² is a slip
    ],
  });
  assert.deepEqual(entries, [
    { item: 'Premix concrete, 25 MPa', quantity: null, unit: 'm³', unitPrice: 290 },
    { item: 'Reinforcing mesh SL82 (6 × 2.4 m)', quantity: null, unit: 'sheet', unitPrice: 128.5 },
  ]);
  assert.deepEqual(heldBack, ['Tiles']);
  assert.deepEqual(quickSetupEntries(null), { entries: [], heldBack: [] });
});

test('AI suggestions: names and units only, deduplicated, capped', () => {
  const out = cleanSuggestions({
    items: [
      { item: 'Dog shampoo', unit: 'bottle', unitPrice: 20 },
      { item: 'dog shampoo', unit: 'bottle' },
      { item: '  Grooming session ', unit: '' },
      { item: '', unit: 'each' },
      'junk',
    ],
  });
  assert.deepEqual(out, [{ item: 'Dog shampoo', unit: 'bottle' }, { item: 'Grooming session', unit: 'each' }]);
  assert.ok(!('unitPrice' in out[0]));
  const many = { items: Array.from({ length: 40 }, (_, i) => ({ item: `Item ${i}`, unit: 'each' })) };
  assert.equal(cleanSuggestions(many).length, MAX_SUGGESTIONS);
  assert.deepEqual(cleanSuggestions('nonsense'), []);
});

test('saving again sends only prices that changed', () => {
  const saved = new Map([[entryKey('Tie wire', 'roll'), 12], [entryKey('Bar chairs', 'bag'), 20]]);
  assert.deepEqual(changedEntries([
    { item: 'Tie wire', unit: 'roll', price: '12' },     // unchanged
    { item: 'Bar chairs', unit: 'bag', price: '22.50' }, // changed
    { item: 'Road base', unit: 'tonne', price: '' },     // empty
    { item: 'Colour oxide', unit: 'bag', price: '35' },  // new
  ], saved), [
    { item: 'Bar chairs', unit: 'bag', unitPrice: 22.5 },
    { item: 'Colour oxide', unit: 'bag', unitPrice: 35 },
  ]);
});
