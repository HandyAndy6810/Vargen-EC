import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localMatch, decideAi, conversionFactor, resolutionFactor, parseAiMatches, matchPrompt, dedupeCandidates, cleanUnit, lineKey, supplierKey,
  AUTO_ACCEPT_CONFIDENCE, type Candidate, type Remembered, type Match,
} from './matcher';

// The tradie's candidates: their price list and their trade's catalogue.
const candidates: Candidate[] = [
  { item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet' },
  { item: 'Reo bar', unit: 'length' },
  { item: 'Treated pine joists (90 × 45)', unit: 'lineal m' },
  { item: 'Post concrete', unit: 'bag' },
  { item: 'Deck screws', unit: 'box' },
  { item: 'Tie wire', unit: 'roll' },
  { item: 'Reinforcing mesh', unit: 'm²' },
];
const noMemory: Remembered[] = [];

/** No match in this file ever carries a price: the engine only says which item, which unit, and a factor. */
const assertNoPrice = (m: Match) => {
  for (const k of ['price', 'unitPrice', 'cost', 'unitCost', 'amount']) assert.ok(!(k in m), `match has ${k}`);
  if (m.kind === 'unsure' && m.guess) for (const k of ['price', 'unitPrice', 'cost']) assert.ok(!(k in m.guess));
};

test('remembered: a line the tradie confirmed before, same supplier, no AI', () => {
  const mem: Remembered[] = [{ lineKey: lineKey('SL82 MESH 6X2.4'), supplierKey: supplierKey('Bunnings Trade'), item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet', factor: 1, ignore: false }];
  const m = localMatch({ text: 'SL82 MESH 6X2.4', unit: 'EA', supplier: 'BUNNINGS TRADE' }, candidates, mem);
  assert.deepEqual(m, { kind: 'matched', item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet', factor: 1, via: 'remembered' });
  assertNoPrice(m);
  // Another supplier's identical line text still uses it.
  assert.equal(localMatch({ text: 'sl82 mesh 6x2.4', unit: 'EA', supplier: 'Reece' }, candidates, mem).kind, 'matched');
});

test('remembered "not a material" is ignored with no AI call', () => {
  const mem: Remembered[] = [{ lineKey: lineKey('UNLEADED 91'), supplierKey: supplierKey('Ampol'), item: null, unit: null, factor: null, ignore: true }];
  assert.deepEqual(localMatch({ text: 'UNLEADED 91', unit: 'L', supplier: 'Ampol' }, candidates, mem), { kind: 'ignore', via: 'remembered' });
});

test('plain: same name after tidying, unit converts for certain', () => {
  const m = localMatch({ text: 'TIE WIRE', unit: 'RL' }, candidates, noMemory);
  assert.deepEqual(m, { kind: 'matched', item: 'Tie wire', unit: 'roll', factor: 1, via: 'plain' });
  // A different wording needs the AI.
  assert.deepEqual(localMatch({ text: 'SL82 MESH 6X2.4', unit: 'EA' }, candidates, noMemory), { kind: 'needs_ai' });
});

test('a confident AI match with a convertible unit is applied', () => {
  const m = decideAi({ text: 'SL82 MESH 6X2.4', unit: 'EA' }, { candidate: 0, category: 'material', confidence: 0.93, conversion: null }, candidates);
  assert.deepEqual(m, { kind: 'matched', item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet', factor: 1, via: 'ai' });
  assertNoPrice(m);
});

test('a low-confidence AI match goes to the list, with its guess', () => {
  const m = decideAi({ text: 'SL72 MESH 6X2.4', unit: 'EA' }, { candidate: 0, category: 'material', confidence: 0.7, conversion: null }, candidates);
  assert.equal(m.kind, 'unsure');
  if (m.kind === 'unsure') {
    assert.equal(m.reason, 'low_confidence');
    assert.equal(m.guess?.item, 'Reinforcing mesh SL82 (6 × 2.4 m)');
  }
  assertNoPrice(m);
  assert.equal(AUTO_ACCEPT_CONFIDENCE, 0.85);
});

test('a confident match whose unit has no known conversion goes to the list; the AI number is only a hint', () => {
  // Concrete sold by the m³ against an item priced per bag: no certain conversion.
  const m = decideAi({ text: 'PREMIX 25MPA', unit: 'M3' }, { candidate: 3, category: 'material', confidence: 0.95, conversion: 50 }, candidates);
  assert.equal(m.kind, 'unsure');
  if (m.kind === 'unsure') {
    assert.equal(m.reason, 'unit');
    assert.equal(m.guess?.factor, null);
    assert.equal(m.guess?.aiFactor, 50);
  }
});

test('a known conversion applies: a 6 × 2.4 sheet against an item priced per m²', () => {
  const m = decideAi({ text: 'SL82 MESH 6X2.4', unit: 'EA' }, { candidate: 6, category: 'material', confidence: 0.9, conversion: null }, candidates);
  assert.deepEqual(m, { kind: 'matched', item: 'Reinforcing mesh', unit: 'm²', factor: 14.4, via: 'ai' });
});

test('a non-material line is ignored when the AI is sure, and asked about when it isn\'t', () => {
  assert.deepEqual(decideAi({ text: 'UNLEADED 91', unit: 'L' }, { candidate: null, category: 'not_a_material', confidence: 0.98, conversion: null }, candidates), { kind: 'ignore', via: 'ai' });
  assert.equal(decideAi({ text: 'DELIVERY', unit: '' }, { candidate: null, category: 'not_a_material', confidence: 0.6, conversion: null }, candidates).kind, 'unsure');
  // No answer from the AI at all: unsure, never a guess.
  assert.deepEqual(decideAi({ text: 'X', unit: '' }, undefined, candidates), { kind: 'unsure', reason: 'ai_unavailable' });
});

test('the list of known unit conversions', () => {
  assert.equal(conversionFactor('TIE WIRE', 'EA', 'ea'), 1);
  assert.equal(conversionFactor('TIMBER', 'LM', 'lineal m'), 1);
  assert.equal(conversionFactor('SCREW BATTEN 14G BOX 100', 'EA', 'each'), 100);
  assert.equal(conversionFactor('PALING 10PK', 'PK', 'ea'), 10);
  assert.equal(conversionFactor('SL82 MESH 6X2.4', 'EA', 'm²'), 14.4);
  assert.equal(conversionFactor('N12 BAR 6M', 'EA', 'lineal m'), 6);
  assert.equal(conversionFactor('PINE TREATED 90X45 H3 4.8M', 'EA', 'm'), 4.8);
  assert.equal(conversionFactor('RAPID SET CONCRETE 20KG', 'BAG', 'kg'), 20);
  assert.equal(conversionFactor('SAND', 'KG', 'tonne'), 0.001);
  assert.equal(conversionFactor('SAND', 'TONNE', 'kg'), 1000);
  assert.equal(conversionFactor('BRICKS', 'per 1000', 'each'), 1000);
  assert.equal(conversionFactor('SL82 MESH 6X2.4', 'EA', 'sheet'), 1);       // counting unit to counting unit
  assert.equal(conversionFactor('N12 BAR 6M', 'LGTH', 'length'), 1);
  // Never a guess:
  assert.equal(conversionFactor('PREMIX 25MPA', 'M3', 'bag'), null);
  assert.equal(conversionFactor('PINE 90X45', 'EA', 'm²'), null);            // 90×45 is millimetres, not an area
  assert.equal(conversionFactor('PINE 90X45', 'EA', 'lineal m'), null);      // no length printed
  assert.equal(conversionFactor('CONCRETE', 'BAG', 'kg'), null);             // no weight printed
  assert.equal(conversionFactor('PAINT', 'L', 'm²'), null);
});

test('units: receipt spellings tidy to the price list\'s', () => {
  assert.equal(cleanUnit('LGTH'), 'length');
  assert.equal(cleanUnit('EA'), 'ea');
  assert.equal(cleanUnit(''), 'ea');
  assert.equal(cleanUnit('LM'), cleanUnit('lineal m'));
  assert.equal(cleanUnit('M2'), cleanUnit('m²'));
});

test('reading the AI answer: bad indexes dropped, confidence clamped, no prices kept', () => {
  const s = parseAiMatches({ matches: [
    { line: 0, candidate: 2, category: 'material', confidence: 1.4, unitPrice: 99 },
    { line: 1, candidate: 99, category: 'material', confidence: 0.9 },
    { line: 1, candidate: 1, category: 'material', confidence: 0.9 }, // a second answer for line 1 is ignored
    { line: 7, candidate: 0 },
    { line: 2, candidate: null, category: 'weird', confidence: 'x', conversion: -3 },
  ] }, 3, 3);
  assert.deepEqual(s, [
    { candidate: 2, category: 'material', confidence: 1, conversion: null },
    { candidate: null, category: 'material', confidence: 0.9, conversion: null },
    { candidate: null, category: 'unsure', confidence: 0, conversion: null },
  ]);
  assert.deepEqual(parseAiMatches('not json', 2, 5), [undefined, undefined]);
});

test('the AI prompt carries only line text, units and candidate names', () => {
  const p = matchPrompt([{ text: 'SL82 MESH 6X2.4', unit: 'EA', supplier: 'Bunnings Trade' }], [{ item: 'Tie wire', unit: 'roll' }]);
  const sent = JSON.parse(p.user);
  assert.deepEqual(sent, { lines: [{ line: 0, text: 'SL82 MESH 6X2.4', unit: 'EA' }], candidates: [{ candidate: 0, item: 'Tie wire', unit: 'roll' }] });
  assert.ok(!p.user.includes('Bunnings'));
});

test('candidates are deduplicated and capped', () => {
  const out = dedupeCandidates([{ item: 'Tie wire', unit: 'roll' }, { item: 'tie  wire', unit: 'rolls' }, { item: 'Tie wire', unit: 'ea' }]);
  assert.equal(out.length, 2);
  assert.equal(dedupeCandidates(Array.from({ length: 400 }, (_, i) => ({ item: `I${i}`, unit: 'ea' }))).length, 250);
});

test('sorting a line: a known conversion wins; otherwise the tradie\'s answer; otherwise ask', () => {
  assert.equal(resolutionFactor('SL82 MESH 6X2.4', 'EA', 'sheet', '7'), 1);
  assert.equal(resolutionFactor('PREMIX 25MPA', 'M3', 'bag', '50'), 50);
  assert.equal(resolutionFactor('PREMIX 25MPA', 'M3', 'bag', ''), null);
  assert.equal(resolutionFactor('PREMIX 25MPA', 'M3', 'bag', '-2'), null);
});
