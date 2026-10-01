import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { receiptItems, receiptItemsTotal, receiptTotalMismatch } from './receipt-check';

// What the scanner actually stored for the Aomori Sushi receipt ($169.51 real).
const AOMORI = JSON.stringify([
  { description: 'Snow ball', amount: 12 }, { description: 'WINE Grass', amount: 16 },
  { description: 'Tiger', amount: 39 }, { description: '(Kids) cooked tuna', amount: 5 },
  { description: 'Fresh ginger', amount: 1.5 }, { description: 'T/A FRESH WASABI', amount: 1 },
  { description: 'Karage chicken (6pcs)', amount: 10 }, { description: '(10pcs) SALMON ROLL', amount: 16.5 },
  { description: '(small) Chicken Teriyaki', amount: 7.5 }, { description: 'H/H Fresh Masaba', amount: 1 },
  { description: 'AOMORI SUSHI SET', amount: 17.5 }, { description: 'CURRY - BEEF', amount: 20.5 },
]);

const OFFICEWORKS = [
  { description: 'Aluminium laptop stand', amount: 67 },
  { description: 'JB Stanton chair', amount: 259 },
];

describe('receiptItems', () => {
  test('reads the stored JSON string and arrays alike', () => {
    assert.equal(receiptItems(AOMORI).length, 12);
    assert.equal(receiptItems(OFFICEWORKS).length, 2);
  });
  test('bad or missing data is an empty list, not a crash', () => {
    assert.deepEqual(receiptItems('not json'), []);
    assert.deepEqual(receiptItems(null), []);
    assert.deepEqual(receiptItems('{"a":1}'), []);
  });
});

describe('receiptItemsTotal', () => {
  test('sums to the cent', () => {
    assert.equal(receiptItemsTotal(AOMORI), 147.5);
    assert.equal(receiptItemsTotal(OFFICEWORKS), 326);
  });
});

describe('receiptTotalMismatch', () => {
  test('the Aomori misread is flagged: $67 total, $147.50 of items', () => {
    assert.deepEqual(receiptTotalMismatch('67.00', AOMORI), { itemsTotal: 147.5, mismatch: true });
  });
  test('a total that matches its items is not', () => {
    assert.equal(receiptTotalMismatch(326, OFFICEWORKS).mismatch, false);
  });
  test('a card surcharge on top of the items is within tolerance', () => {
    // $167.00 of items, $169.51 total — the 1.5% surcharge on the real receipt.
    assert.equal(receiptTotalMismatch(169.51, [{ description: 'Food', amount: 167 }]).mismatch, false);
  });
  test('no items, or no total, means nothing to check', () => {
    assert.equal(receiptTotalMismatch(50, []).mismatch, false);
    assert.equal(receiptTotalMismatch(50, 'not json').mismatch, false);
    assert.equal(receiptTotalMismatch('', OFFICEWORKS).mismatch, false);
  });
});
