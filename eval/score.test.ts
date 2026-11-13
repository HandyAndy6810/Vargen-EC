import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  termRegex, scoreRun, priceOrigin, complianceClaims, factFound, tradesIn, lineSimilarity, consistency, hoursPair, quoteCostUsd, rawQuestionCount,
} from './score';
import type { EvalJob } from './types';

const JOBS: EvalJob[] = JSON.parse(readFileSync(new URL('./jobs.json', import.meta.url), 'utf8')).jobs;
const job = (id: string) => JOBS.find((j) => j.id === id)!;
const PRICING = { labourRate: 110, callOutFee: 0 };

const L = (description: string, quantity: number, unit: string, unitPrice: number, category = 'material', priceSource: string | null = 'estimate') =>
  ({ description, quantity, unit, unitPrice, category, ...(category === 'material' && priceSource ? { priceSource } : {}) });

const goodC1 = {
  jobTitle: 'Driveway replacement',
  summary: 'Remove the old driveway and pour a new 6 x 4 m slab.',
  items: [
    L('Labour – break out and remove old concrete driveway', 6, 'hr', 110, 'labour'),
    L('Labour – formwork, place SL72 mesh, pour and broom finish', 10, 'hr', 110, 'labour'),
    L('N25 premix concrete, 100mm slab', 2.6, 'm3', 290),
    L('SL72 reinforcing mesh sheet 6 x 2.4', 2, 'sheet', 95, 'material', 'yours'),
    L('Bar chairs 50mm', 1, 'bag', 30),
    L('Disposal of old concrete – tip fees', 1, 'lot', 350),
  ],
  questions: [],
  notes: 'Area 24 m², 100mm thick. Valid 14 days.',
};

describe('terms', () => {
  test('words at word boundaries, plurals allowed', () => {
    assert.ok(termRegex('post').test('Treated pine posts'));
    assert.ok(!termRegex('tap').test('Thread tape'));
    assert.ok(termRegex('tap').test('Kitchen taps'));
    assert.ok(termRegex('bar chair').test('Bar-chairs 50mm'));
    assert.ok(termRegex('re:\\bSL\\d{2}\\b').test('sl82 mesh'));
  });
});

describe('a full C1 run', () => {
  test('a good quote passes the structure checks', () => {
    const s = scoreRun(job('C1'), goodC1, PRICING);
    assert.equal(s.mustHavePass, true, JSON.stringify(s.mustHave.filter((m) => !m.ok)));
    assert.equal(s.mustNotPass, true);
    assert.deepEqual(s.trades.missing, []);
    assert.deepEqual(s.trades.extra, []);
    assert.equal(s.factsPass, true, JSON.stringify(s.facts));
    assert.equal(s.questions.score, 1);
    assert.equal(s.hardFail, false, JSON.stringify(s.hardFailReasons));
    assert.equal(s.shouldFound, 1); // bar chairs only
    assert.equal(s.subtotal, Math.round((16 * 110 + 2.6 * 290 + 190 + 30 + 350) * 100) / 100);
  });

  test('pump hire and a question are both caught', () => {
    const q = { ...goodC1, items: [...goodC1.items, L('Concrete line pump hire', 1, 'lot', 600)], questions: [{ q: 'Colour?', options: ['Grey'] }] };
    const s = scoreRun(job('C1'), q, PRICING);
    assert.equal(s.mustNotPass, false);
    assert.equal(s.questions.askedWhenShouldnt, true);
    assert.ok(s.questions.score < 1);
  });

  test('a missing must have fails, and is named', () => {
    const q = { ...goodC1, items: goodC1.items.filter((i) => !/mesh sheet/.test(i.description)) };
    const s = scoreRun(job('C1'), q, PRICING);
    assert.equal(s.mustHavePass, false);
    assert.deepEqual(s.mustHave.filter((m) => !m.ok).map((m) => m.label), ['mesh']);
  });
});

describe('invented prices (hard fail)', () => {
  test('where each price came from', () => {
    assert.equal(priceOrigin(L('mesh', 1, 'sheet', 90, 'material', 'yours') as any, PRICING).origin, 'price list');
    assert.equal(priceOrigin(L('mesh', 1, 'sheet', 90, 'material', 'estimate') as any, PRICING).origin, 'estimate');
    assert.equal(priceOrigin(L('mesh', 1, 'sheet', 90, 'material', null) as any, PRICING).origin, 'invented');
    assert.equal(priceOrigin(L('Labour', 4, 'hrs', 110, 'labour') as any, PRICING).origin, 'settings');
    assert.equal(priceOrigin(L('Labour', 4, 'hr', 95, 'labour') as any, PRICING).origin, 'invented');
    assert.equal(priceOrigin(L('Labour', 4, 'hr', 95, 'labour') as any, { labourRate: null, callOutFee: 0 }).why, 'hourly labour at a rate the model chose (no charge-out rate in settings)');
    assert.match(priceOrigin(L('Labour – supply and fit', 1, 'lot', 900, 'labour') as any, PRICING).why!, /lump sum/);
    assert.equal(priceOrigin(L('Call-out fee', 1, 'ea', 90, 'material', null) as any, { labourRate: 110, callOutFee: 90 }).origin, 'settings');
    assert.equal(priceOrigin(L('Customer-supplied tap', 1, 'ea', 0, 'material', null) as any, PRICING).origin, 'no price');
  });

  test('a material line with no source makes the run a hard fail', () => {
    const q = { ...goodC1, items: [...goodC1.items, { description: 'Expansion joint', quantity: 2, unit: 'lm', unitPrice: 8, category: 'material' }] };
    const s = scoreRun(job('C1'), q, PRICING);
    assert.equal(s.hardFail, true);
    assert.equal(s.invented.length, 1);
  });
});

describe('compliance claims (hard fail)', () => {
  test('claims are caught', () => {
    assert.equal(complianceClaims({ notes: 'All work complies with AS 3600.' }).length, 1);
    assert.equal(complianceClaims({ notes: 'Installation will comply with AS/NZS 3000.' }).length, 1);
    assert.equal(complianceClaims({ notes: 'Board meets AS/NZS 3000 requirements' }).length, 1);
    assert.equal(complianceClaims({ summary: 'Installed in accordance with the NCC.' }).length, 1);
    assert.equal(complianceClaims({ items: [{ description: 'Fully compliant with Australian Standards' }] }).length, 1);
  });
  test('flags and certificates are not claims', () => {
    assert.deepEqual(complianceClaims({ notes: 'Engineering by others. Compliance certificate (CCEW) included. Compliance with the engineer\'s design is the builder\'s responsibility.' }), []);
  });
  test('a claim makes the run a hard fail', () => {
    const s = scoreRun(job('C1'), { ...goodC1, notes: 'Slab complies with AS 3600.' }, PRICING);
    assert.equal(s.hardFail, true);
    assert.match(s.hardFailReasons[0], /compliance claim/);
  });
});

describe('facts', () => {
  test('from a quantity in the right unit, or written in the text', () => {
    const area = { label: 'area', numbers: [{ value: 24, unit: 'm2' }] };
    assert.ok(factFound(area, { items: [{ description: 'Slab', quantity: 24, unit: 'sqm' }] }));
    assert.ok(factFound(area, { notes: 'Driveway 6m x 4m (24m²)' }));
    assert.ok(factFound(area, { notes: '24.0 square metres' }));
    assert.ok(!factFound(area, { notes: '124 m2' }));
    assert.ok(!factFound(area, { items: [{ description: 'Slab', quantity: 24, unit: 'hr' }] }));
  });
  test('alternatives: 1.8 m or 1800 mm', () => {
    const h = { label: 'height', numbers: [{ value: 1.8, unit: 'm' }, { value: 1800, unit: 'mm' }] };
    assert.ok(factFound(h, { items: [{ description: 'Colorbond panel 1800mm high' }] }));
    assert.ok(factFound(h, { notes: 'Fence height 1.8 m' }));
    assert.ok(!factFound(h, { notes: 'Fence height 1.5 m' }));
  });
  test('counts of things', () => {
    const d = { label: '8 downlights', numbers: [{ value: 8, unit: 'downlight' }] };
    assert.ok(factFound(d, { items: [{ description: 'LED downlight 10W', quantity: 8, unit: 'each' }] }));
    assert.ok(factFound(d, { summary: 'Supply and install 8 x LED downlights' }));
    assert.ok(!factFound(d, { summary: 'Supply and install 6 LED downlights' }));
  });
});

describe('trades', () => {
  test('post concrete on a fence is not concreting; an electric HWS is not electrical', () => {
    assert.deepEqual(tradesIn({ items: [{ description: 'Colorbond fence panels' }, { description: 'Rapid set post concrete 20kg' }] }), ['fencing']);
    assert.deepEqual(tradesIn({ items: [{ description: 'Rheem 250L electric hot water system' }] }), ['plumbing']);
  });
  test('optional trades are not counted as invented; missing ones are named', () => {
    const q = { items: [
      L('Demolition – strip out existing bathroom', 8, 'hr', 110, 'labour'), L('Skip bin 4m3', 1, 'ea', 450),
      L('Waterproofing membrane to floor and shower walls', 1, 'lot', 900), L('Exhaust fan', 1, 'ea', 180),
    ] };
    const s = scoreRun(job('M1'), q, PRICING);
    assert.deepEqual(s.trades.extra, []);
    assert.deepEqual(s.trades.missing.sort(), ['plumbing', 'tiling']);
  });
});

describe('checks that need more than a word', () => {
  test('P1: the customer\'s tap at $0 is fine, a priced tap is not, tap hoses are fittings', () => {
    const base = { items: [L('Labour – remove old mixer and fit customer\'s tap', 1.5, 'hr', 110, 'labour'), L('Braided flexi tap hoses x2', 2, 'ea', 18)] };
    assert.equal(scoreRun(job('P1'), { ...base, items: [...base.items, L('Kitchen mixer tap (customer supplied)', 1, 'ea', 0)] }, PRICING).mustNotPass, true);
    const bad = scoreRun(job('P1'), { ...base, items: [...base.items, L('Methven kitchen mixer tap', 1, 'ea', 250)] }, PRICING);
    assert.equal(bad.mustNotPass, false);
    assert.equal(scoreRun(job('P1'), base, PRICING).mustHavePass, true);
  });

  test('H1: three tasks on one line are not three separate tasks', () => {
    const one = { items: [L('Labour – hang 3 pictures, fix sticking door, replace 2 hinges', 2, 'hr', 110, 'labour'), L('Cabinet hinges', 2, 'ea', 12)] };
    const s = scoreRun(job('H1'), one, PRICING);
    assert.equal(s.mustHavePass, false);
    const sep = { items: [
      L('Labour – hang 3 pictures', 0.5, 'hr', 110, 'labour'), L('Labour – plane and adjust sticking door', 1, 'hr', 110, 'labour'),
      L('Labour – replace 2 cabinet hinges', 0.5, 'hr', 110, 'labour'), L('Soft-close cabinet hinges', 2, 'ea', 12),
    ] };
    assert.equal(scoreRun(job('H1'), sep, PRICING).mustHavePass, true);
  });

  test('C2: an assumed size is fine only when it asks and says so', () => {
    const items = [L('Premix concrete', 4, 'm3', 290), L('Labour – pour slab', 40, 'm2', 45, 'labour')];
    assert.equal(scoreRun(job('C2'), { items, questions: [] }, PRICING).mustNotPass, false);
    const asked = { items, questions: [{ q: 'Roughly how long and wide is the driveway?', assumption: 'Assumed 40 m² (8 x 5).' }] };
    const s = scoreRun(job('C2'), asked, PRICING);
    assert.equal(s.mustNotPass, true);
    assert.equal(s.mustHavePass, true);
    assert.equal(s.questions.keyCovered, true);
  });

  test('X1: any line item is a quote', () => {
    assert.equal(scoreRun(job('X1'), { items: [], questions: [{ q: 'What job do you need quoted?' }] }, PRICING).mustNotPass, true);
    assert.equal(scoreRun(job('X1'), { items: [L('General labour', 1, 'hr', 110, 'labour')] }, PRICING).mustNotPass, false);
  });

  test('P3: the call-out line is n/a when the call-out fee is off', () => {
    const q = { items: [L('Labour – clear blockage with auger', 1, 'hr', 110, 'labour')], questions: [{ q: 'Are other drains slow too?' }] };
    const off = scoreRun(job('P3'), q, PRICING);
    assert.equal(off.mustHave[0].ok, null);
    assert.equal(off.mustHavePass, true);
    const on = scoreRun(job('P3'), q, { labourRate: 110, callOutFee: 90 });
    assert.equal(on.mustHavePass, false);
    assert.equal(off.questions.keyCovered, true);
  });

  test('more than 3 questions from the model counts against it', () => {
    const raw = JSON.stringify({ questions: [{ q: 'a' }, { q: 'b' }, { q: 'c' }, { q: 'd' }] });
    assert.equal(rawQuestionCount(raw, 3), 4);
    const s = scoreRun(job('C3'), { items: [], questions: [{ q: 'a' }, { q: 'b' }, { q: 'c' }] }, PRICING, raw);
    assert.equal(s.questions.tooMany, true);
  });
});

describe('across runs', () => {
  test('line similarity and total spread', () => {
    assert.equal(lineSimilarity(['N25 premix concrete', 'SL72 mesh'], ['Premix concrete N25 100mm', 'Mesh SL72 sheet']), 1);
    assert.equal(lineSimilarity(['N25 premix concrete'], ['Turf']), 0);
    const c = consistency([{ lines: ['a premix'], subtotal: 1000 }, { lines: ['a premix'], subtotal: 1200 }, { lines: ['turf'], subtotal: 1100 }]);
    assert.ok(Math.abs(c.lineSimilarity! - 1 / 3) < 1e-9);
    assert.ok(Math.abs(c.totalSpreadPct! - (200 / 1100) * 100) < 1e-9);
    assert.deepEqual(consistency([{ lines: [], subtotal: 1 }]), { lineSimilarity: null, totalSpreadPct: null });
  });

  test('the hours pair: hours where both have them, a blind 3x is flagged', () => {
    const p = hoursPair({ hours: 30, dollars: 3300 }, { hours: 10, dollars: 1100 });
    assert.equal(p.measure, 'hours');
    assert.equal(p.pass, true);
    assert.equal(p.blindTriple, true);
    const q = hoursPair({ hours: 0, dollars: 2000 }, { hours: 10, dollars: 1100 });
    assert.equal(q.measure, 'dollars');
    assert.equal(hoursPair({ hours: 8, dollars: 0 }, { hours: 10, dollars: 0 }).pass, false);
  });

  test('cost per quote', () => {
    assert.equal(quoteCostUsd({ promptTokens: 1_000_000, completionTokens: 500_000 }, { input: 0.15, output: 0.6 }), 0.45);
    assert.equal(quoteCostUsd({ promptTokens: 1, completionTokens: 1 }, null), null);
  });
});
