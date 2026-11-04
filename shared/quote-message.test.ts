import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { quoteMessage, quoteEmailUrl, quoteSmsUrl, invoiceMessage, invoiceEmailUrl, smsUrl } from './quote-message';

const q = {
  customerName: 'Sam Smith', businessName: 'Andy Plumbing', jobTitle: 'Hot water swap',
  total: 2706, includeGST: true, portalUrl: 'https://vargen.example/portal/abc-123',
};

describe('quoteMessage', () => {
  test('carries the total and the link, never "attached"', () => {
    const m = quoteMessage(q);
    assert.ok(m.includes('https://vargen.example/portal/abc-123'));
    assert.ok(m.includes('$2,706.00 inc. GST'));
    assert.ok(m.startsWith('Hi Sam,'));
    assert.ok(m.includes('Hot water swap'));
    assert.ok(!/attached/i.test(m));
  });
  test('no customer name or business still reads', () => {
    const m = quoteMessage({ total: 100, includeGST: false, portalUrl: 'https://x/portal/t' });
    assert.ok(m.startsWith('Hi there,'));
    assert.ok(m.includes('$100.00.'));
  });
});

describe('quoteEmailUrl', () => {
  test('encodes subject and body, and the link survives decoding', () => {
    const url = quoteEmailUrl('sam@example.com', q);
    assert.ok(url.startsWith('mailto:sam%40example.com?subject=Your%20quote%20from%20Andy%20Plumbing&body='));
    const body = decodeURIComponent(url.split('&body=')[1]);
    assert.equal(body, quoteMessage(q));
  });
});

describe('quoteSmsUrl', () => {
  test('iOS uses &body=, Android ?body=', () => {
    assert.ok(quoteSmsUrl('0412 345 678', q, 'ios').startsWith('sms:0412345678&body='));
    assert.ok(quoteSmsUrl('0412 345 678', q, 'android').startsWith('sms:0412345678?body='));
  });
  test('the body is fully encoded, so & and newlines in it are safe', () => {
    const url = quoteSmsUrl('+61412345678', { ...q, businessName: 'Smith & Sons' }, 'ios');
    const body = url.split('body=')[1];
    assert.ok(!/[\n&]/.test(body));
    assert.equal(decodeURIComponent(body), quoteMessage({ ...q, businessName: 'Smith & Sons' }));
  });
});

describe('invoiceMessage', () => {
  const i = { customerName: 'Sam Smith', businessName: 'Andy Plumbing', invoiceNumber: 'INV-0007', total: 330, includeGST: true, dueDate: '17 Nov 2026', invoiceUrl: 'https://vargen.example/invoice/tok' };
  test('amount, due date and the link to pay', () => {
    const m = invoiceMessage(i);
    assert.ok(m.includes('invoice INV-0007: $330.00 inc. GST, due 17 Nov 2026.'));
    assert.ok(m.includes('View and pay it here: https://vargen.example/invoice/tok'));
    assert.ok(!/attached/i.test(m));
  });
  test('email subject names the invoice and the business; the link survives encoding', () => {
    const url = invoiceEmailUrl('sam@example.com', i);
    assert.ok(url.startsWith('mailto:sam%40example.com?subject=Invoice%20INV-0007%20from%20Andy%20Plumbing&body='));
    assert.equal(decodeURIComponent(url.split('&body=')[1]), invoiceMessage(i));
  });
  test('SMS carries it the same way', () => {
    assert.equal(decodeURIComponent(smsUrl('0412 345 678', invoiceMessage(i), 'ios').split('&body=')[1]), invoiceMessage(i));
  });
});
