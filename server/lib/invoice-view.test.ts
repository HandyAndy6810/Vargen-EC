import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildInvoiceView, withInvoiceUrl } from './invoice-view';

const invoice = {
  id: 7, userId: 'owner-secret-id', customerId: 3, quoteId: 12, invoiceNumber: 'INV-0007', status: 'sent',
  items: JSON.stringify([{ description: 'Labour', quantity: 2, unitPrice: 150 }]),
  subtotal: '300', gstAmount: '30', totalAmount: '330', paidAmount: '0', notes: 'Thanks',
  shareToken: 'tok-secret', stripePaymentLinkId: 'plink_secret', stripePaymentLinkUrl: 'https://buy.stripe.com/x',
  squarePaymentLinkId: 'sq_secret', xeroInvoiceId: 'xero-secret', xeroInvoiceNumber: 'X-1', invoiceType: 'full',
  createdAt: '2026-11-03T00:00:00Z', dueDate: '2026-11-17T00:00:00Z',
};
const customer = { id: 3, userId: 'owner-secret-id', name: 'Sam Smith', email: 'sam@example.com', phone: '0412', address: '1 St', notes: 'private note', xeroContactId: 'xc-secret', companyName: 'Smith Strata', abn: '51824753556', billingAddress: 'PO Box 9, Sydney', accessNotes: 'gate code 1234' };
const settings = {
  userId: 'owner-secret-id', businessName: 'Andy Plumbing', abn: '12 345', tradeType: 'Plumber',
  bankName: 'CBA', bsb: '062000', accountNumber: '1234', accountName: 'A Y',
  expoPushToken: 'ExponentPushToken[secret]', markupPercent: 80, labourCostRate: 60,
};

const allKeys = (o: unknown, out = new Set<string>()): Set<string> => {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { out.add(k); allKeys(v, out); }
  return out;
};

describe('buildInvoiceView', () => {
  const view = buildInvoiceView({ invoice, customer, settings });
  const raw = JSON.stringify(view);

  test('carries what the invoice shows, and how to pay', () => {
    assert.equal(view.invoice.invoiceNumber, 'INV-0007');
    assert.equal(view.invoice.totalAmount, '330');
    assert.equal(view.customer?.name, 'Sam Smith');
    assert.equal(view.business.businessName, 'Andy Plumbing');
    assert.equal(view.business.bsb, '062000');
    assert.equal(view.invoice.payByCardUrl, 'https://buy.stripe.com/x');
  });

  for (const leak of ['userId', 'customerId', 'quoteId', 'shareToken', 'stripePaymentLinkId', 'squarePaymentLinkId',
    'xeroInvoiceId', 'xeroContactId', 'expoPushToken', 'markupPercent', 'labourCostRate', 'notes_private', 'id']) {
    test(`no "${leak}" anywhere`, () => assert.ok(!allKeys(view).has(leak), leak));
  }
  test('no private values anywhere', () => {
    for (const v of ['owner-secret-id', 'tok-secret', 'plink_secret', 'sq_secret', 'xero-secret', 'xc-secret', 'private note', 'ExponentPushToken']) {
      assert.ok(!raw.includes(v), v);
    }
  });
});

describe('withInvoiceUrl', () => {
  test('a link once there is a token, none before', () => {
    assert.equal(withInvoiceUrl({ shareToken: 'abc' }, 'https://x').invoiceUrl, 'https://x/invoice/abc');
    assert.equal('invoiceUrl' in withInvoiceUrl({ shareToken: null }, 'https://x'), false);
  });
});

test('the customer block: company, formatted ABN, and the billing address when set', () => {
  const view = buildInvoiceView({ invoice, customer, settings });
  assert.equal(view.customer?.companyName, 'Smith Strata');
  assert.equal(view.customer?.abn, '51 824 753 556');
  assert.equal(view.customer?.address, 'PO Box 9, Sydney');
  const noBilling = buildInvoiceView({ invoice, customer: { ...customer, billingAddress: null }, settings });
  assert.equal(noBilling.customer?.address, '1 St');
  assert.ok(!JSON.stringify(view).includes('gate code'), 'access notes stay private');
});
