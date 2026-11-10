import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnedPrices, newestPrices, priceFor, applyPriceList, priceAge, itemKey, unitKey, type PriceRow } from './price-list';

// What the AI gave: concrete, mesh, bar chairs, labour and a call-out.
const ai = JSON.stringify({
  items: [
    { description: 'Premix concrete 25 MPa', quantity: 3, unit: 'm³', unitPrice: 405, unitCost: 270, category: 'material' },
    { description: 'Reinforcing mesh SL82', quantity: 4, unit: 'sheet', unitPrice: 165, unitCost: 110, category: 'material' },
    { description: 'Bar chairs', quantity: 2, unit: 'bag', unitPrice: 30, unitCost: 20, category: 'material' },
    { description: 'Labour', quantity: 8, unit: 'hr', unitPrice: 85, unitCost: 0, category: 'labour' },
    { description: 'Call-out fee', quantity: 1, unit: 'ea', unitPrice: 150, unitCost: 0, category: 'labour' },
  ],
});
const sent = (items: any[]) => JSON.stringify({ customerName: 'Sarah Johnson', jobTitle: '12 Smith St slab', items });
const aiItems = JSON.parse(ai).items;

test('untouched AI lines never count', () => {
  assert.deepEqual(learnedPrices([ai], sent(aiItems)), []);
});

test('a corrected cost counts; only item, quantity, unit and price are kept', () => {
  const items = aiItems.map((it: any) => (it.description === 'Reinforcing mesh SL82' ? { ...it, unitCost: 128.5, unitPrice: 192.75 } : it));
  const learned = learnedPrices([ai], sent(items));
  assert.deepEqual(learned, [{ item: 'Reinforcing mesh SL82', quantity: 4, unit: 'sheet', unitPrice: 128.5 }]);
  // Nothing from the quote itself (customer, job title) ends up in an entry.
  assert.deepEqual(Object.keys(learned[0]).sort(), ['item', 'quantity', 'unit', 'unitPrice']);
});

test('a line the tradie added counts; a renamed AI line still at the AI figure does not', () => {
  const items = [
    ...aiItems.filter((it: any) => it.description !== 'Bar chairs'),
    { description: 'Bar chairs 65/75', quantity: 2, unit: 'bag', unitPrice: 30, unitCost: 20 }, // renamed, AI cost kept
    { description: 'Builders plastic 200um', quantity: 1, unit: 'roll', unitPrice: 135, unitCost: 90 }, // added by the tradie
  ];
  assert.deepEqual(learnedPrices([ai], sent(items)).map((e) => e.item), ['Builders plastic 200um']);
});

test('labour, call-out, pinned lines and lines with no cost never count', () => {
  const items = [
    { description: 'Labour', quantity: 8, unit: 'hr', unitPrice: 80, unitCost: 60, category: 'labour' },
    { description: 'Call-out fee', quantity: 1, unit: 'ea', unitPrice: 120, unitCost: 0, category: 'labour' },
    { description: 'Pump hire', quantity: 1, unit: 'job', unitPrice: 450, unitCost: 300, markupLocked: true },
    { description: 'Skip bin', quantity: 1, unit: 'ea', unitPrice: 380, unitCost: 0 },
  ];
  assert.deepEqual(learnedPrices([ai], sent(items)), []);
});

test('a figure the sanity check flags is held back', () => {
  // A 5 L tin of paint at $2 is the order-of-magnitude slip the bands catch.
  const items = [{ description: 'Paint 10L tin', quantity: 2, unit: 'ea', unitPrice: 3, unitCost: 2 }];
  assert.deepEqual(learnedPrices([ai], sent(items)), []);
});

test('every generation behind the quote counts as the AI (clarify reruns)', () => {
  const second = JSON.stringify({ items: [{ description: 'Edge formwork', quantity: 30, unit: 'lm', unitPrice: 9, unitCost: 6 }] });
  const items = [{ description: 'Edge formwork', quantity: 30, unit: 'm', unitPrice: 9, unitCost: 6 }];
  assert.deepEqual(learnedPrices([ai, second], sent(items)), [], 'lm and m are the same unit; the rerun gave this cost');
});

test('no AI generation, or unreadable JSON: nothing is learned', () => {
  assert.deepEqual(learnedPrices([], sent([{ description: 'Mesh', quantity: 1, unit: 'sheet', unitCost: 120 }])), []);
  assert.deepEqual(learnedPrices(['not json'], 'also not json'), []);
});

test('matching ignores case, spacing, punctuation and unit spelling', () => {
  assert.equal(itemKey('  Reinforcing   Mesh, SL82 '), itemKey('reinforcing mesh sl82'));
  assert.equal(unitKey('m²'), unitKey('sqm'));
  assert.equal(unitKey('each'), unitKey('ea'));
  assert.notEqual(unitKey('sheet'), unitKey('m2'));
});

test('the newest price wins; a different unit is a different price', () => {
  const rows: PriceRow[] = [
    { id: 1, item: 'Reinforcing mesh SL82', quantity: 4, unit: 'sheet', unitPrice: 110, priceDate: '2026-09-01T00:00:00Z' },
    { id: 2, item: 'reinforcing mesh sl82', quantity: 6, unit: 'sheets', unitPrice: 128.5, priceDate: '2026-10-20T00:00:00Z' },
    { id: 3, item: 'Reinforcing mesh SL82', quantity: 40, unit: 'm2', unitPrice: 9, priceDate: '2026-11-01T00:00:00Z' },
  ];
  const list = newestPrices(rows);
  assert.equal(priceFor(list, { description: 'Reinforcing Mesh SL82', unit: 'sheet' })?.unitPrice, 128.5);
  assert.equal(priceFor(list, { description: 'Reinforcing mesh SL82', unit: 'm²' })?.unitPrice, 9);
  assert.equal(priceFor(list, { description: 'Reinforcing mesh SL72', unit: 'sheet' }), undefined);
});

test('applying the list: your price as the cost at the quote markup, the rest marked estimate, labour untouched', () => {
  const list = newestPrices([{ item: 'Reinforcing mesh SL82', quantity: 4, unit: 'sheet', unitPrice: 128.5, priceDate: '2026-10-20T00:00:00Z' }]);
  const out = applyPriceList(aiItems.map((it: any, i: number) => (i === 1 ? { ...it, priceNote: 'Looks low' } : it)), list, 50);
  assert.equal(out[1].priceSource, 'yours');
  assert.equal(out[1].unitCost, 128.5);
  assert.equal(out[1].unitPrice, 192.75);
  assert.equal(out[1].priceNote, undefined);
  assert.equal(out[1].priceDate, '2026-10-20T00:00:00.000Z');
  assert.equal(out[0].priceSource, 'estimate');
  assert.equal(out[0].unitCost, 270);
  assert.equal(out[3].priceSource, undefined);
  assert.equal(out[4].priceSource, undefined);
});

test('price age reads in plain words', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  assert.equal(priceAge('2026-11-10T08:00:00Z', now), 'today');
  assert.equal(priceAge('2026-11-09T08:00:00Z', now), 'yesterday');
  assert.equal(priceAge('2026-11-05T08:00:00Z', now), '5 days ago');
  assert.equal(priceAge('2026-10-20T08:00:00Z', now), '3 weeks ago');
  assert.equal(priceAge('2026-08-01T08:00:00Z', now), '3 months ago');
  assert.equal(priceAge('2025-06-01T08:00:00Z', now), 'over a year ago');
});
