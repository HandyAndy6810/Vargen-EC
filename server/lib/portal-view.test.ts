import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildPortalView, sanitisePortalContent } from './portal-view';

/**
 * The contract for what a customer holding a share link can see.
 *
 * The important tests are the negative ones. A quote's content carries the
 * tradie's cost prices and margin, and the row carries internal identifiers — all
 * of it went over the wire to anyone with the link. These assert it cannot again,
 * by walking the entire serialised response rather than checking known fields, so
 * a leak nested anywhere still fails.
 */

/** Every key appearing anywhere in the response, at any depth. */
function allKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach(v => allKeys(v, found));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      found.add(k);
      allKeys(v, found);
    }
  }
  return found;
}

/** A quote shaped like a real one, carrying everything that must not escape. */
const realQuote = {
  id: 25,
  userId: '16326cfe-d292-4969-b7ad-a3261ef00fd5',
  jobId: null,
  customerId: 7,
  status: 'sent',
  totalAmount: '4840',
  createdAt: '2026-09-12T08:55:41.623Z',
  shareToken: 'a-secret-token',
  xeroInvoiceId: 'xero-123',
  xeroInvoiceNumber: 'INV-9',
  followUpSchedule: '[{"day":3,"status":"pending"}]',
  sentAt: '2026-09-13T00:00:00.000Z',
  jobTitle: 'Timber Hardwood Floorboard Replacement',
  content: JSON.stringify({
    jobTitle: 'Timber Hardwood Floorboard Replacement',
    summary: 'Strip and replace 60 sqm of hardwood flooring.',
    notes: 'Price assumes the substrate is sound.',
    subtotal: 4400,
    gstAmount: 440,
    totalAmount: 4840,
    includeGST: true,
    markupPct: 15,
    roundUp: false,
    assumptions: ['Floor area is 60 sqm'],
    lines: [{ name: 'Floorboards', qty: '60', price: '63.25', cost: '55' }],
    items: [
      {
        description: 'Timber hardwood floorboards',
        quantity: 60,
        unit: 'sqm',
        unitPrice: 55,
        unitCost: 44,
        category: 'material',
        markupLocked: false,
        lockedPrice: undefined,
        needsPrice: true,
      },
    ],
  }),
};

const realCustomer = {
  id: 7,
  userId: '16326cfe-d292-4969-b7ad-a3261ef00fd5',
  name: 'Sarah Whitfield',
  email: 'sarah@example.com',
  phone: '0412 345 678',
  address: '14 Beaumont Street',
  notes: 'Prefers morning appointments',
  xeroContactId: 'xero-contact-9',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const view = buildPortalView({
  quote: realQuote,
  customer: realCustomer,
  business: { name: 'Vargen', phone: '0400 000 000', email: 'a@b.com', address: '1 Trade St' },
});
const keys = allKeys(JSON.parse(JSON.stringify({ ...view, content: JSON.parse(view.quote.content!) })));

describe('nothing private escapes', () => {
  for (const leak of [
    'unitCost', 'cost', 'markupPct', 'markupLocked', 'lockedPrice', 'lines',
    'userId', 'shareToken', 'followUpSchedule', 'sentAt', 'jobId', 'needsPrice',
    'category', 'assumptions', 'roundUp', 'notes_internal',
  ]) {
    test(`no "${leak}" anywhere in the response`, () => {
      assert.equal(keys.has(leak), false, `"${leak}" reached the customer`);
    });
  }

  test('no Xero identifier survives', () => {
    const serialised = JSON.stringify(view);
    assert.equal(/xero/i.test(serialised), false);
    assert.equal(serialised.includes('xero-123'), false);
    assert.equal(serialised.includes('xero-contact-9'), false);
  });

  test('the customer\'s private notes do not come back to them', () => {
    assert.equal(JSON.stringify(view).includes('Prefers morning appointments'), false);
  });

  test('the share token is not echoed', () => {
    assert.equal(JSON.stringify(view).includes('a-secret-token'), false);
  });
});

describe('what the page needs still arrives', () => {
  test('the quote fields Portal.tsx reads', () => {
    assert.equal(view.quote.id, 25);
    assert.equal(view.quote.status, 'sent');
    assert.equal(view.quote.totalAmount, '4840');
    assert.ok(view.quote.createdAt);
  });

  test('content still parses, the way parseContent does', () => {
    const c = JSON.parse(view.quote.content!);
    assert.equal(c.jobTitle, 'Timber Hardwood Floorboard Replacement');
    assert.equal(c.subtotal, 4400);
    assert.equal(c.gstAmount, 440);
    assert.equal(c.totalAmount, 4840);
    assert.equal(c.includeGST, true);
    assert.match(c.summary, /hardwood/);
    assert.match(c.notes, /substrate/);
  });

  test('line items keep description, quantity, unit and price', () => {
    const c = JSON.parse(view.quote.content!);
    assert.equal(c.items.length, 1);
    assert.deepEqual(c.items[0], {
      description: 'Timber hardwood floorboards',
      quantity: 60,
      unitPrice: 55,
      unit: 'sqm',
    });
  });

  test('the customer gets their own contact details', () => {
    assert.deepEqual(view.customer, {
      name: 'Sarah Whitfield',
      email: 'sarah@example.com',
      phone: '0412 345 678',
      address: '14 Beaumont Street',
    });
  });

  test('business details come through', () => {
    assert.equal(view.businessName, 'Vargen');
    assert.equal(view.businessPhone, '0400 000 000');
  });
});

describe('edges', () => {
  test('a quote with no customer', () => {
    const v = buildPortalView({ quote: realQuote, customer: null, business: {} });
    assert.equal(v.customer, null);
    assert.equal(v.businessName, '');
  });

  test('unreadable content becomes null rather than being forwarded', () => {
    // If it cannot be parsed it cannot be checked, and an unchecked blob is
    // exactly what this file exists to prevent.
    assert.equal(sanitisePortalContent('{not json'), null);
    assert.equal(sanitisePortalContent(''), null);
    assert.equal(sanitisePortalContent(null), null);
  });

  test('content with no items yields an empty list, not a crash', () => {
    const c = JSON.parse(sanitisePortalContent(JSON.stringify({ jobTitle: 'X' }))!);
    assert.deepEqual(c.items, []);
    assert.equal(c.jobTitle, 'X');
  });

  test('a string quantity from older data still comes through as a number', () => {
    const c = JSON.parse(sanitisePortalContent(JSON.stringify({
      items: [{ description: 'Labour', quantity: '2.5', unitPrice: '70' }],
    }))!);
    assert.equal(c.items[0].quantity, 2.5);
    assert.equal(c.items[0].unitPrice, 70);
  });
});
