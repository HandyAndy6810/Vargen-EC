import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { quoteItemRowsFromContent, quoteItemRowsTotal } from './quote-items';

describe('quoteItemRowsFromContent', () => {
  test('keeps a fractional quantity', () => {
    // The whole reason this exists: quote_items.quantity was an integer, so a
    // 0.5 hr cleanup line failed to insert and was silently dropped.
    const rows = quoteItemRowsFromContent(JSON.stringify({
      items: [{ description: 'Cleanup', quantity: 0.5, unitPrice: 70 }],
    }));
    assert.equal(rows![0].quantity, 0.5);
    assert.equal(quoteItemRowsTotal(rows!), 35);
  });

  test('uses the SELL price, not the cost', () => {
    const rows = quoteItemRowsFromContent(JSON.stringify({
      items: [{ description: 'Floorboards', quantity: 60, unitPrice: 55, unitCost: 44 }],
    }));
    assert.equal(rows![0].price, 55);
    assert.equal(quoteItemRowsTotal(rows!), 3300);
  });

  test('rows reconcile to the quote subtotal', () => {
    const rows = quoteItemRowsFromContent(JSON.stringify({
      subtotal: 4400,
      items: [
        { description: 'Call-out', quantity: 1, unitPrice: 50 },
        { description: 'Labour', quantity: 13, unitPrice: 70 },
        { description: 'Floorboards', quantity: 60, unitPrice: 55 },
        { description: 'Disposal', quantity: 60, unitPrice: 2 },
        { description: 'Consumables', quantity: 1, unitPrice: 20 },
      ],
    }));
    assert.equal(quoteItemRowsTotal(rows!), 4400);
  });

  test('no items array means "leave the rows alone", not "delete them"', () => {
    assert.equal(quoteItemRowsFromContent(JSON.stringify({ jobTitle: 'X' })), null);
    assert.equal(quoteItemRowsFromContent('{not json'), null);
    assert.equal(quoteItemRowsFromContent(null), null);
    assert.equal(quoteItemRowsFromContent(undefined), null);
  });

  test('an empty items array DOES mean no rows', () => {
    assert.deepEqual(quoteItemRowsFromContent(JSON.stringify({ items: [] })), []);
  });

  test('blank lines are skipped, the way the old mobile loop did', () => {
    const rows = quoteItemRowsFromContent(JSON.stringify({
      items: [
        { description: '', quantity: 1, unitPrice: 0 },
        { description: 'Real line', quantity: 2, unitPrice: 10 },
      ],
    }));
    assert.equal(rows!.length, 1);
    assert.equal(rows![0].description, 'Real line');
  });

  test('a priced line with no description is kept, not thrown away', () => {
    const rows = quoteItemRowsFromContent(JSON.stringify({
      items: [{ description: '', quantity: 1, unitPrice: 250 }],
    }));
    assert.equal(rows!.length, 1);
    assert.equal(rows![0].description, 'Item');
    assert.equal(rows![0].price, 250);
  });

  test('string figures from older content still parse', () => {
    const rows = quoteItemRowsFromContent(JSON.stringify({
      items: [{ description: 'Labour', quantity: '1.5', unitPrice: '70' }],
    }));
    assert.equal(rows![0].quantity, 1.5);
    assert.equal(rows![0].price, 70);
  });

  test('a missing quantity defaults to 1 rather than zeroing the line', () => {
    const rows = quoteItemRowsFromContent(JSON.stringify({
      items: [{ description: 'Permit', unitPrice: 150 }],
    }));
    assert.equal(rows![0].quantity, 1);
    assert.equal(quoteItemRowsTotal(rows!), 150);
  });

  test('accepts an already-parsed object as well as a string', () => {
    const rows = quoteItemRowsFromContent({ items: [{ description: 'A', quantity: 2, unitPrice: 5 }] });
    assert.equal(quoteItemRowsTotal(rows!), 10);
  });
});
