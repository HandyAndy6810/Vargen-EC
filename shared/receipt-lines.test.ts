import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanReceiptLines, cleanGstFlag, cleanReceiptDiscount, paidPerUnit } from './receipt-lines';
import { receiptItems, receiptTotalMismatch } from './receipt-check';

test('a trade receipt keeps quantity, unit and unit price as printed', () => {
  const lines = cleanReceiptLines([
    { description: 'SL82 MESH 6X2.4', quantity: 4, unit: 'EA', unitPrice: 128.5, amount: 514 },
    { description: 'N12 BAR 6M', quantity: '10', unit: 'LGTH', unitPrice: '$14.90', amount: '149.00' },
  ]);
  assert.deepEqual(lines, [
    { description: 'SL82 MESH 6X2.4', quantity: 4, unit: 'EA', unitPrice: 128.5, amount: 514 },
    { description: 'N12 BAR 6M', quantity: 10, unit: 'LGTH', unitPrice: 14.9, amount: 149 },
  ]);
});

test('nothing is invented: unit price only as printed, or amount / quantity when both are printed', () => {
  const [a, b, c] = cleanReceiptLines([
    { description: 'PINE TREATED 90X45 H3 4.8M', quantity: 6, amount: 107.4 },  // no unit price printed
    { description: 'RAPID SET CONCRETE 20KG', amount: 119.4 },                 // no quantity printed
    { description: 'SCREW BATTEN 14G BOX 100', amount: 0 },
  ]);
  assert.equal(a.unitPrice, 17.9);
  assert.equal(b.quantity, undefined);
  assert.equal(b.unitPrice, undefined);
  assert.equal(c.unitPrice, undefined);
});

test('payment, card and loyalty lines are dropped; long digit runs never stored', () => {
  const lines = cleanReceiptLines([
    { description: 'VISA ************4421', amount: 230 },
    { description: 'PowerPass 4000 1234 5678', amount: 0 },
    { description: 'Account no 12345678', amount: 0 },
    { description: 'GRAB RAIL 9300123456789 SS', quantity: 1, amount: 49 },
  ]);
  assert.deepEqual(lines.map((l) => l.description), ['GRAB RAIL SS']);
});

test('old receipts (description and amount only) still read and total exactly as before', () => {
  const old = JSON.stringify([{ description: 'Snow ball', amount: 12 }, { description: 'Tiger', amount: 39 }]);
  assert.deepEqual(cleanReceiptLines(old), [{ description: 'Snow ball', amount: 12 }, { description: 'Tiger', amount: 39 }]);
  // The expense side is untouched: same items, same mismatch check.
  const stored = JSON.stringify(cleanReceiptLines([{ description: 'SL82 MESH 6X2.4', quantity: 4, unit: 'EA', unitPrice: 128.5, amount: 514 }]));
  assert.deepEqual(receiptItems(stored), [{ description: 'SL82 MESH 6X2.4', amount: 514 }]);
  assert.equal(receiptTotalMismatch(514, stored).mismatch, false);
  assert.deepEqual(cleanReceiptLines('not json'), []);
});

test('a line discount keeps the price actually paid', () => {
  const [l] = cleanReceiptLines([{ description: 'TIE WIRE 1.25MM', quantity: 2, unit: 'EA', unitPrice: 15, amount: 27, lineDiscount: -3 }]);
  assert.equal(l.lineDiscount, 3);
  assert.deepEqual(paidPerUnit(l), { quantity: 2, perUnit: 13.5 });
});

test('paid per unit: from the total when it can; a printed unit price gives the count; otherwise nothing', () => {
  assert.deepEqual(paidPerUnit({ description: 'x', quantity: 4, amount: 514 }), { quantity: 4, perUnit: 128.5 });
  assert.deepEqual(paidPerUnit({ description: 'x', unitPrice: 9.95, amount: 119.4 }), { quantity: 12, perUnit: 9.95 });
  assert.equal(paidPerUnit({ description: 'x', unitPrice: 9.95, amount: 100 }), null); // not a clean count
  assert.equal(paidPerUnit({ description: 'x', amount: 49 }), null);
});

test('GST flag and receipt discount', () => {
  assert.equal(cleanGstFlag(true), true);
  assert.equal(cleanGstFlag('false'), false);
  assert.equal(cleanGstFlag(undefined), null);
  assert.equal(cleanReceiptDiscount('-12.50'), 12.5);
  assert.equal(cleanReceiptDiscount(0), null);
  assert.equal(cleanReceiptDiscount(''), null);
});
