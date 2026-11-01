import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shouldPersistQuery, trimSettingsForDevice } from './offline-cache';

describe('shouldPersistQuery', () => {
  test('keeps quotes, customers, jobs, invoices and settings', () => {
    for (const key of [
      ['/api/quotes'], ['/api/quotes/:id', 4], ['/api/quotes/4/items'],
      ['/api/customers'], ['/api/customers/:id', 2],
      ['/api/jobs'], ['/api/jobs/:id', 9],
      ['/api/invoices'], ['/api/invoices/:id', 1],
      ['/api/settings'],
    ]) assert.equal(shouldPersistQuery(key), true, JSON.stringify(key));
  });

  test('never keeps the user, messages, or anything else', () => {
    for (const key of [
      ['/api/auth/user'], ['/api/customers', 3, 'messages'], ['xero-status'],
      ['weather', 1, 2], ['/api/receipts'], ['/api/jobs/:id/reconciliation'], [42],
    ]) assert.equal(shouldPersistQuery(key), false, JSON.stringify(key));
  });
});

describe('trimSettingsForDevice', () => {
  const full = {
    businessName: 'Andy Plumbing', includeGST: true, labourRate: 150, markupPercent: 80,
    markupLabour: false, labourCostRate: 60, callOutFee: 80, quoteTemplate: 'classic',
    bankName: 'CBA', bsb: '062000', accountNumber: '12345678', accountName: 'A Y',
    pushToken: 'ExponentPushToken[abc]', userId: 'u1', stripeEnabled: true,
  };

  test('keeps what quoting and the PDF need', () => {
    const t = trimSettingsForDevice(full)!;
    assert.equal(t.businessName, 'Andy Plumbing');
    assert.equal(t.labourRate, 150);
    assert.equal(t.markupLabour, false);
    assert.equal(t.quoteTemplate, 'classic');
  });

  test('drops bank details, the push token and ids', () => {
    const raw = JSON.stringify(trimSettingsForDevice(full));
    for (const secret of ['062000', '12345678', 'CBA', 'ExponentPushToken', 'u1']) {
      assert.ok(!raw.includes(secret), secret);
    }
  });

  test('nothing in, nothing out', () => {
    assert.equal(trimSettingsForDevice(null), null);
    assert.equal(trimSettingsForDevice('x'), null);
  });
});
