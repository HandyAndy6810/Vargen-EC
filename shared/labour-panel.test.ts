import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHourlyUnit, labourPanel, applyLabourRate, applyLabourHours, type PanelLine } from './labour-panel';

// A typical AI quote: 4 hours at $85, plus a $150 call-out fee (qty 1, unit "ea").
const quote = (): PanelLine[] => [
  { name: 'Labour — install downlights', qty: '4', price: '85', unit: 'hr', category: 'labour' },
  { name: 'Call-out fee', qty: '1', price: '150', unit: 'ea', category: 'labour' },
  { name: 'LED downlight', qty: '6', price: '30', unit: 'ea', category: 'material' },
];
const makeLine = (qty: string, rate: string): PanelLine => ({ name: 'Labour', qty, price: rate, unit: 'hr', category: 'labour' });

test('only hour units are hourly', () => {
  for (const u of ['hr', 'hrs', 'hour', 'Hours', ' HR ']) assert.equal(isHourlyUnit(u), true, u);
  for (const u of ['ea', 'each', 'lot', 'job', '', undefined, null]) assert.equal(isHourlyUnit(u), false, String(u));
});

test('bug 1: a flat call-out fee is not counted as an hour', () => {
  const p = labourPanel(quote(), { rateField: 'price', settingsRate: 85 });
  assert.equal(p.hours, 4);                // was 5: the call-out's qty 1 counted as an hour
  assert.deepEqual(p.flat.map((l) => l.name), ['Call-out fee']);
  assert.equal(p.hourly.length, 1);
});

test('bug 2: the rate comes from the hourly lines, not labour[0]', () => {
  // The flat fee listed FIRST: labour[0] used to make the card read $150/hr.
  const lines = [quote()[1], quote()[0], quote()[2]];
  assert.equal(labourPanel(lines, { rateField: 'price', settingsRate: 80 }).rate, 85);
});

test('with no hourly lines the rate comes from settings', () => {
  const flatOnly = [quote()[1], quote()[2]];
  const p = labourPanel(flatOnly, { rateField: 'price', settingsRate: 80 });
  assert.equal(p.rate, 80);
  assert.equal(p.hours, 0);
  assert.equal(labourPanel(flatOnly, { rateField: 'price', settingsRate: null }).rate, 0);
});

test('the rate field follows "Mark up labour too" (cost when on)', () => {
  const lines: PanelLine[] = [{ name: 'Labour', qty: '2', price: '153', cost: '85', unit: 'hr', category: 'labour' }];
  assert.equal(labourPanel(lines, { rateField: 'cost', settingsRate: 80 }).rate, 85);
  assert.equal(labourPanel(lines, { rateField: 'price', settingsRate: 80 }).rate, 153);
});

test('typing a rate changes the hourly lines and never the call-out fee', () => {
  const out = applyLabourRate(quote(), 'price', '80');
  assert.equal(out[0].price, '80');
  assert.equal(out[1].price, '150');       // was overwritten with 80
  assert.equal(out[2].price, '30');
});

test('typing hours scales the hourly lines only', () => {
  const lines: PanelLine[] = [
    { name: 'Rough in', qty: '2', price: '85', unit: 'hr', category: 'labour' },
    { name: 'Fit off', qty: '6', price: '85', unit: 'hrs', category: 'labour' },
    { name: 'Call-out fee', qty: '1', price: '150', unit: 'ea', category: 'labour' },
  ];
  const out = applyLabourHours(lines, '4', { rate: 85, rateField: 'price', makeLine });
  assert.deepEqual(out.map((l) => l.qty), ['1', '3', '1']); // split 1:3 holds; the fee stays 1
  assert.equal(labourPanel(out, { rateField: 'price' }).hours, 4);
  // Bad input changes nothing.
  assert.equal(applyLabourHours(lines, 'abc', { rate: 85, rateField: 'price', makeLine }), lines);
  assert.equal(applyLabourHours(lines, '-1', { rate: 85, rateField: 'price', makeLine }), lines);
});

test('hours with no hourly line add one at the shown rate; zero hours add nothing', () => {
  const flatOnly = [quote()[1]];
  const out = applyLabourHours(flatOnly, '3', { rate: 80, rateField: 'price', makeLine });
  assert.equal(out.length, 2);
  assert.deepEqual(out[1], { name: 'Labour', qty: '3', price: '80', unit: 'hr', category: 'labour' });
  assert.equal(applyLabourHours(flatOnly, '0', { rate: 80, rateField: 'price', makeLine }), flatOnly);
});

test('hours on hourly lines that are all at 0 go on the first one', () => {
  const lines: PanelLine[] = [
    { name: 'A', qty: '0', price: '85', unit: 'hr', category: 'labour' },
    { name: 'B', qty: '', price: '85', unit: 'hr', category: 'labour' },
  ];
  assert.deepEqual(applyLabourHours(lines, '5', { rate: 85, rateField: 'price', makeLine }).map((l) => l.qty), ['5', '']);
});
