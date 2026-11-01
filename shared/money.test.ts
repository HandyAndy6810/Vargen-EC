import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  round2, num, unitSell, lineTotal, lineCost, gstRateFor, totalsFor, savedMarkupLabour,
  invoiceSplitTotal, remainingAfter, isFullyInvoiced, splitGst,
} from './money';

/**
 * The contract for every figure the app quotes or bills.
 *
 * The "regressions" block at the bottom is the important part: one test per money
 * bug that actually reached a build. Each is written from what went wrong in the
 * real app, so if the behaviour ever comes back the test says which bug returned
 * rather than just that a number changed.
 *
 * Run with: npm test
 */

describe('num', () => {
  test('reads text-field strings', () => {
    assert.equal(num('12.5'), 12.5);
    assert.equal(num('0'), 0);
  });
  test('anything unusable is zero, never NaN', () => {
    assert.equal(num(''), 0);
    assert.equal(num('abc'), 0);
    assert.equal(num(undefined), 0);
    assert.equal(num(null), 0);
    assert.equal(num(NaN), 0);
    assert.equal(num(Infinity), 0);
  });
});

describe('round2', () => {
  test('rounds to cents', () => {
    assert.equal(round2(2.344), 2.34);
    assert.equal(round2(2.346), 2.35);
  });

  // These are the values a naive Math.round(n * 100) / 100 gets wrong, because
  // 2.345 * 100 is 234.49999999999997 in binary floating point. This test is the
  // reason round2 shifts through the string exponent.
  test('an exact half-cent rounds up, not down', () => {
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(2.345), 2.35);
    assert.equal(round2(8.615), 8.62);
  });

  test('negatives round away from zero, same as positives', () => {
    assert.equal(round2(-2.345), -2.35);
    assert.equal(round2(-2.344), -2.34);
  });

  test('anything unusable is zero, never NaN', () => {
    assert.equal(round2(NaN), 0);
    assert.equal(round2(Infinity), 0);
  });
});

describe('unitSell', () => {
  test('a line with a cost takes the markup', () => {
    assert.equal(unitSell({ cost: '100' }, 20), 120);
    assert.equal(unitSell({ cost: '55' }, 0), 55);
  });

  test('a line with no cost keeps its own price and ignores the slider', () => {
    assert.equal(unitSell({ price: '90' }, 0), 90);
    assert.equal(unitSell({ price: '90' }, 50), 90);
  });

  test('a locked line is frozen wherever the slider goes', () => {
    const line = { cost: '100', markupLocked: true, lockedPrice: '150' };
    assert.equal(unitSell(line, 0), 150);
    assert.equal(unitSell(line, 80), 150);
  });

  test('a locked line with no locked price falls back to its price', () => {
    assert.equal(unitSell({ markupLocked: true, price: '42' }, 30), 42);
  });

  test('an at-cost line charges exactly its cost, whatever the markup', () => {
    // A permit, a tip fee, a council charge — passed straight through.
    assert.equal(unitSell({ cost: '250', noMarkup: true }, 0), 250);
    assert.equal(unitSell({ cost: '250', noMarkup: true }, 80), 250);
  });

  test('an at-cost line still follows its cost when the cost is corrected', () => {
    // This is what separates it from pinning: pinning freezes a figure, at-cost
    // tracks the real cost.
    assert.equal(unitSell({ cost: '250', noMarkup: true }, 30), 250);
    assert.equal(unitSell({ cost: '310', noMarkup: true }, 30), 310);
  });

  test('pinning beats at-cost, because it names an exact figure', () => {
    assert.equal(unitSell({ cost: '250', noMarkup: true, markupLocked: true, lockedPrice: '400' }, 30), 400);
  });

  test('an at-cost line with no cost keeps its typed price', () => {
    assert.equal(unitSell({ price: '90', noMarkup: true }, 50), 90);
  });

  test('an at-cost line earns nothing, and the totals say so', () => {
    const t = totalsFor([{ qty: '1', cost: '250', noMarkup: true }], { markupPct: 40, gstRate: 0 });
    assert.equal(t.subtotal, 250);
    assert.equal(t.totalCost, 250);
    assert.equal(t.profit, 0);
    assert.equal(t.uncostedLines, 0);
  });
});

describe('lineTotal and lineCost', () => {
  test('quantity multiplies', () => {
    assert.equal(lineTotal({ qty: '60', cost: '55' }, 0), 3300);
    assert.equal(lineCost({ qty: '16', cost: '55' }), 880);
  });

  test('fractional quantities survive', () => {
    assert.equal(lineTotal({ qty: '2.5', cost: '80' }, 0), 200);
  });
});

describe('gstRateFor', () => {
  test('registered by default, and when explicitly on', () => {
    assert.equal(gstRateFor(undefined), 0.1);
    assert.equal(gstRateFor(true), 0.1);
  });
  test('only an explicit false turns GST off', () => {
    assert.equal(gstRateFor(false), 0);
  });
});

describe('totalsFor', () => {
  const lines = [
    { qty: '10', cost: '70' },   // 700
    { qty: '1',  cost: '300' },  // 300
  ];

  test('subtotal, GST and total agree', () => {
    const t = totalsFor(lines, { markupPct: 0, gstRate: 0.1 });
    assert.equal(t.subtotal, 1000);
    assert.equal(t.gst, 100);
    assert.equal(t.total, 1100);
  });

  test('markup lifts the sell price but not the cost', () => {
    const t = totalsFor(lines, { markupPct: 20, gstRate: 0.1 });
    assert.equal(t.subtotal, 1200);
    assert.equal(t.totalCost, 1000);
    assert.equal(t.profit, 200);
  });

  test('round up lands on a whole dollar AND still reconciles', () => {
    const odd = [{ qty: '1', cost: '333.33' }];
    const t = totalsFor(odd, { markupPct: 0, gstRate: 0.1, roundUp: true });
    assert.equal(t.total, Math.ceil(t.total), 'total is a whole dollar');
    assert.equal(round2(t.subtotal + t.gst), t.total, 'subtotal + gst === total');
  });

  test('an empty quote is zero, not NaN', () => {
    const t = totalsFor([], { markupPct: 25, gstRate: 0.1 });
    assert.equal(t.total, 0);
    assert.equal(t.gst, 0);
    assert.equal(t.profit, 0);
  });

  test('counts lines that have a price but no cost', () => {
    const mixed = [{ qty: '1', cost: '100' }, { qty: '1', price: '90' }, { qty: '1', price: '0' }];
    assert.equal(totalsFor(mixed, {}).uncostedLines, 1);
  });
});

describe('invoiceSplitTotal', () => {
  test('a full invoice bills the whole job', () => {
    assert.equal(invoiceSplitTotal('full', { fullTotal: 2200 }), 2200);
  });

  test('a percentage deposit bills its share', () => {
    assert.equal(invoiceSplitTotal('deposit', { fullTotal: 2200, depositPercent: 50 }), 1100);
    assert.equal(invoiceSplitTotal('deposit', { fullTotal: 2200, depositPercent: 25 }), 550);
  });

  test('a fixed dollar deposit wins over the percentage', () => {
    const got = invoiceSplitTotal('deposit', { fullTotal: 2200, depositPercent: 50, depositAmount: '500' });
    assert.equal(got, 500);
  });

  test('a deposit can never exceed the job', () => {
    assert.equal(invoiceSplitTotal('deposit', { fullTotal: 2200, depositAmount: '9999' }), 2200);
  });

  test('a balance bills exactly what is left', () => {
    assert.equal(invoiceSplitTotal('balance', { fullTotal: 2200, priorInvoiced: 1100 }), 1100);
  });

  test('a balance on a fully billed job is zero, never negative', () => {
    assert.equal(invoiceSplitTotal('balance', { fullTotal: 2200, priorInvoiced: 2500 }), 0);
  });

  test('deposit then balance reconciles to the job exactly', () => {
    const full = 4840;
    const deposit = invoiceSplitTotal('deposit', { fullTotal: full, depositPercent: 50 });
    const balance = invoiceSplitTotal('balance', { fullTotal: full, priorInvoiced: deposit });
    assert.equal(round2(deposit + balance), full);
  });

  test('an odd total still reconciles', () => {
    const full = 1333.33;
    const deposit = invoiceSplitTotal('deposit', { fullTotal: full, depositPercent: 33 });
    const balance = invoiceSplitTotal('balance', { fullTotal: full, priorInvoiced: deposit });
    assert.equal(round2(deposit + balance), full);
  });
});

describe('remainingAfter and isFullyInvoiced', () => {
  test('remaining after a deposit', () => {
    assert.equal(remainingAfter({ fullTotal: 2200, priorInvoiced: 0 }, 1100), 1100);
  });
  test('remaining never goes negative', () => {
    assert.equal(remainingAfter({ fullTotal: 2200, priorInvoiced: 2000 }, 500), 0);
  });
  test('a quote is open until the whole value is billed', () => {
    assert.equal(isFullyInvoiced(2200, 1100), false);
    assert.equal(isFullyInvoiced(2200, 2200), true);
  });
  test('a cent of rounding does not leave a quote stuck open', () => {
    assert.equal(isFullyInvoiced(2200, 2199.995), true);
  });
});

describe('splitGst', () => {
  test('the parts add back to the total', () => {
    const { subtotal, gst } = splitGst(1100, 0.1);
    assert.equal(subtotal, 1000);
    assert.equal(gst, 100);
    assert.equal(round2(subtotal + gst), 1100);
  });
  test('with GST off the total is all subtotal', () => {
    const { subtotal, gst } = splitGst(1000, 0);
    assert.equal(subtotal, 1000);
    assert.equal(gst, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// One test per money bug that actually shipped. If one of these fails, that exact
// bug is back.
// ─────────────────────────────────────────────────────────────────────────────
describe('regressions', () => {
  test('a 50% deposit bills half, not the full amount', () => {
    // Shipped billing the full total: the phone computed the deposit and the server
    // stored whatever it was handed, so the customer was billed double the screen.
    assert.equal(invoiceSplitTotal('deposit', { fullTotal: 2000, depositPercent: 50 }), 1000);
  });

  test('a line Amount is quantity times unit price', () => {
    // The quote detail screen showed the UNIT price in the Amount column, so quote
    // 25 listed about $127 of items beneath a $4,840 total.
    assert.equal(lineTotal({ qty: '60', cost: '55' }, 0), 3300);
    assert.notEqual(lineTotal({ qty: '60', cost: '55' }, 0), 55);
  });

  test('GST off means no GST anywhere, not a relabelled 10%', () => {
    // Both create flows multiplied by 1.1 unconditionally, so a tradie under the
    // threshold still charged GST — not merely a display bug in Australia.
    const lines = [{ qty: '1', cost: '1000' }];
    const t = totalsFor(lines, { markupPct: 0, gstRate: gstRateFor(false) });
    assert.equal(t.gst, 0);
    assert.equal(t.total, t.subtotal);
    assert.equal(t.total, 1000);
  });

  test('GST on is unchanged by that fix', () => {
    const lines = [{ qty: '1', cost: '1000' }];
    const t = totalsFor(lines, { markupPct: 0, gstRate: gstRateFor(true) });
    assert.equal(t.total, 1100);
  });

  test('round up changes the headline total, not just a label', () => {
    // "Round up" appeared to do nothing because the card rendering the headline
    // total never received the flag.
    const lines = [{ qty: '1', cost: '99.55' }];
    const plain = totalsFor(lines, { gstRate: 0.1 });
    const rounded = totalsFor(lines, { gstRate: 0.1, roundUp: true });
    assert.notEqual(rounded.total, plain.total);
    assert.equal(rounded.total, Math.ceil(plain.total));
  });

  test('a fractional labour quantity is not rounded away', () => {
    // quote_items.quantity is a whole-number column and silently rounds 2.5 hours.
    // Nothing in this file may do the same.
    assert.equal(lineTotal({ qty: '2.5', cost: '70' }, 0), 175);
  });

  test('a line with no cost is not counted as cost', () => {
    // Every quote written before the cost engine has no unitCost on any item, so
    // Total cost read $0 beneath a four-figure job. Correct, but it must be
    // reported — uncostedLines is what the Review screen warns from.
    const legacy = [{ qty: '16', price: '90' }];
    const t = totalsFor(legacy, { gstRate: 0.1 });
    assert.equal(t.totalCost, 0);
    assert.equal(t.subtotal, 1440);
    assert.equal(t.uncostedLines, 1);
  });

  test('Edit line item and the totals use one markup: 73% vs 16% on the same quote', () => {
    // Device testing found the line editor saying "with your 73% markup" while the
    // slider read 16%. The editor's "Charged at $X each" is unitSell(line, markup)
    // and the slider's figures are totalsFor(lines, markup): with ONE markup value
    // passed to both they agree by construction, for every kind of line. (The
    // drift itself was the slider committing a stale value; see MarkupSlider.)
    const lines = [
      { qty: '3', cost: '40' },                                       // marked up
      { qty: '2', cost: '25', noMarkup: true },                       // at cost
      { qty: '1', cost: '90', markupLocked: true, lockedPrice: '150' }, // locked
      { qty: '4', price: '12.5' },                                    // no cost
    ];
    for (const markupPct of [0, 16, 30, 73]) {
      const fromEditor = round2(lines.reduce((sum, l) => sum + num(l.qty) * unitSell(l, markupPct), 0));
      assert.equal(totalsFor(lines, { markupPct, gstRate: 0.1, roundUp: false }).subtotal, fromEditor, `at ${markupPct}%`);
    }
    // And the two numbers in the report really are different quotes.
    assert.notEqual(unitSell({ cost: '40' }, 16), unitSell({ cost: '40' }, 73));
  });
});

describe('labour is a charge-out rate', () => {
  // A $150/hr charge-out rate, with what an hour costs the tradie ($60) recorded.
  const labour = { qty: '2', price: '150', cost: '60', category: 'labour' };
  const material = { qty: '1', cost: '100', category: 'material' };

  test('labour with a cost and markupLabour off sells at its own price', () => {
    assert.equal(unitSell(labour, 80), 150);
    assert.equal(unitSell(labour, 80, false), 150);
    assert.equal(lineTotal(labour, 80), 300);
  });

  test('the same line with markupLabour on is marked up, as before', () => {
    assert.equal(unitSell(labour, 80, true), 108); // 60 x 1.8
    // A legacy AI line held the rate as its cost too: that is the $270/hr bug.
    assert.equal(unitSell({ qty: '1', price: '150', cost: '150', category: 'labour' }, 80, true), 270);
  });

  test('a material line still takes the markup either way', () => {
    assert.equal(unitSell(material, 80), 180);
    assert.equal(unitSell(material, 80, true), 180);
  });

  test('a locked labour line keeps its locked price', () => {
    const locked = { ...labour, markupLocked: true, lockedPrice: '200' };
    assert.equal(unitSell(locked, 80), 200);
    assert.equal(unitSell(locked, 80, true), 200);
  });

  test('an at-cost labour line stays at cost', () => {
    const atCost = { ...labour, noMarkup: true };
    assert.equal(unitSell(atCost, 80), 60);
    assert.equal(unitSell(atCost, 80, true), 60);
  });

  test('labour with no cost: its price, and counted as uncosted', () => {
    const uncosted = { qty: '2', price: '150', category: 'labour' };
    assert.equal(unitSell(uncosted, 80), 150);
    assert.equal(totalsFor([uncosted], { markupPct: 80, gstRate: 0 }).uncostedLines, 1);
  });

  test('the brief: $150 rate, 80% markup, 2 hr labour is $300 off and $540 on', () => {
    // As the AI now builds the line: price = charge-out rate; with no "what an hour
    // costs you" set, no cost. With markupLabour on, the old rule marks up the rate.
    const aiLabour = { qty: '2', price: '150', cost: '150', category: 'labour' };
    const lines = [aiLabour, material];
    const off = totalsFor(lines, { markupPct: 80, gstRate: 0 });
    assert.equal(off.subtotal, 300 + 180);
    const on = totalsFor(lines, { markupPct: 80, gstRate: 0, markupLabour: true });
    assert.equal(on.subtotal, 540 + 180);
  });

  test('profit counts what an hour costs the tradie', () => {
    const t = totalsFor([labour, material], { markupPct: 80, gstRate: 0 });
    assert.equal(t.subtotal, 480);
    assert.equal(t.totalCost, 220); // 2 x 60 + 100
    assert.equal(t.profit, 260);
  });
});

describe('savedMarkupLabour', () => {
  test('a quote saved before the setting existed reads as true', () => {
    assert.equal(savedMarkupLabour({ markupPct: 80 }), true);
    assert.equal(savedMarkupLabour(null), true);
    assert.equal(savedMarkupLabour(undefined), true);
  });
  test('a saved value is used as is', () => {
    assert.equal(savedMarkupLabour({ markupLabour: false }), false);
    assert.equal(savedMarkupLabour({ markupLabour: true }), true);
  });

  test('a legacy quote reopens with the same total', () => {
    // Quote #27's shape: content saved with no markupLabour, labour at the $150 rate
    // held as its cost, marked up 80% to $270/hr. Reopening it re-derives every
    // figure from these lines, so it must use the rule it was saved under.
    const content = {
      markupPct: 80,
      roundUp: false,
      items: [
        { quantity: 2, unitPrice: 270, unitCost: 150, category: 'labour' },
        { quantity: 1, unitPrice: 180, unitCost: 100, category: 'material' },
      ],
      totalAmount: 792, // (540 + 180) x 1.1
    };
    const lines = content.items.map(it => ({
      qty: String(it.quantity), price: String(it.unitPrice), cost: String(it.unitCost), category: it.category,
    }));
    const reopened = totalsFor(lines, {
      markupPct: content.markupPct, gstRate: 0.1, roundUp: content.roundUp,
      markupLabour: savedMarkupLabour(content),
    });
    assert.equal(reopened.total, content.totalAmount);
    // And it keeps behaving as it did when moved: under the rule it was saved with,
    // labour follows the slider from its cost. Read under the new default instead,
    // labour would sit frozen at the old marked-up $270 whatever the slider said.
    const at50 = (markupLabour: boolean) =>
      totalsFor(lines, { markupPct: 50, gstRate: 0, markupLabour }).subtotal;
    assert.equal(at50(savedMarkupLabour(content)), 2 * 225 + 150);
    assert.equal(at50(false), 2 * 270 + 150);
  });
});
