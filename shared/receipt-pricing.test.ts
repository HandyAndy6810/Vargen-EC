import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingSkip, pricedLines, priceFromMatch, receiptPriceDate, type ReceiptForPricing } from './receipt-pricing';

// Made-up receipts in supplier style. Totals include GST.
const TRADE: ReceiptForPricing = {
  vendor: 'Bunnings Trade', receiptDate: '2026-10-20', category: 'Materials', totalAmount: '1083.40',
  items: [
    { description: 'SL82 MESH 6X2.4', quantity: 4, unit: 'EA', unitPrice: 141.35, amount: 565.40 },
    { description: 'N12 BAR 6M', quantity: 10, unit: 'EA', unitPrice: 16.39, amount: 163.90 },
    { description: 'PINE TREATED 90X45 H3 4.8M', quantity: 6, unit: 'EA', unitPrice: 19.69, amount: 118.14 },
    { description: 'RAPID SET CONCRETE 20KG', quantity: 12, unit: 'BAG', unitPrice: 10.95, amount: 131.40 },
    { description: 'SCREW BATTEN 14G BOX 100', quantity: 1, unit: 'EA', unitPrice: 54.56, amount: 54.56 },
    { description: 'TIE WIRE 1.25MM', quantity: 2, unit: 'EA', unitPrice: 27.50, amount: 50.00, lineDiscount: 5 },
  ],
};

test('a sound trade receipt teaches; mismatch, receipt discount and fuel/food receipts teach nothing', () => {
  assert.equal(pricingSkip(TRADE), null);
  assert.equal(pricingSkip({ ...TRADE, totalAmount: '108.34' }), 'mismatch');
  assert.equal(pricingSkip({ ...TRADE, receiptDiscount: '25.00' }), 'receipt_discount');
  assert.equal(pricingSkip({ ...TRADE, category: 'Fuel', items: [{ description: 'UNLEADED 91', quantity: 52.1, unit: 'L', amount: 98.99 }], totalAmount: '98.99' }), 'not_materials');
  assert.equal(pricingSkip({ ...TRADE, category: 'Food' }), 'not_materials');
  assert.equal(pricingSkip({ ...TRADE, items: [] }), 'no_lines');
});

test('only lines with a quantity and a price paid can price', () => {
  const lines = pricedLines({ ...TRADE, items: [...(TRADE.items as any[]), { description: 'DELIVERY', amount: 45 }] });
  assert.equal(lines.length, 6);
  // The line discount is in the price paid: $50 for 2 = $25 each, not the $27.50 printed.
  assert.equal(lines[5].perUnit, 25);
});

test('GST: divided out when the receipt says it\'s included, and when it doesn\'t say; kept when it says ex GST', () => {
  const p = { quantity: 4, perUnit: 141.35 };
  const m = { item: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet', factor: 1 };
  assert.equal(priceFromMatch({ ...TRADE, pricesIncludeGst: true }, p, m)?.unitPrice, 128.5);
  assert.equal(priceFromMatch({ ...TRADE, pricesIncludeGst: null }, p, m)?.unitPrice, 128.5);
  assert.equal(priceFromMatch({ ...TRADE, pricesIncludeGst: false }, p, m)?.unitPrice, 141.35);
});

test('converted to the matched item\'s unit, quantity too', () => {
  // A 6m bar at $16.39 inc GST, item priced per metre: $14.90 ex GST / 6 = $2.48/m, 60 m.
  assert.deepEqual(
    priceFromMatch(TRADE, { quantity: 10, perUnit: 16.39 }, { item: 'Reo bar N12', unit: 'm', factor: 6 }),
    { item: 'Reo bar N12', quantity: 60, unit: 'm', unitPrice: 2.48 },
  );
  // A box of 100 screws at $54.56 inc GST, item priced each.
  assert.equal(priceFromMatch(TRADE, { quantity: 1, perUnit: 54.56 }, { item: 'Batten screws', unit: 'each', factor: 100 })?.unitPrice, 0.5);
});

test('a price outside the sanity bands is held back', () => {
  // Tiles at $2.20 a m² inc GST: an order-of-magnitude slip.
  assert.equal(priceFromMatch(TRADE, { quantity: 20, perUnit: 2.2 }, { item: 'Tiles', unit: 'm²', factor: 1 }), null);
  assert.equal(priceFromMatch(TRADE, { quantity: 1, perUnit: 10 }, { item: 'x', unit: 'ea', factor: 0 }), null);
});

test('the price is dated by the receipt, not the scan', () => {
  assert.equal(receiptPriceDate(TRADE).toISOString(), '2026-10-20T12:00:00.000Z');
  assert.equal(receiptPriceDate({ createdAt: '2026-11-01T03:00:00Z' }).toISOString(), '2026-11-01T03:00:00.000Z');
});
