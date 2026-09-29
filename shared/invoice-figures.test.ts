import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  invoiceOwing, invoiceReceived, isInvoiceOverdue, isQuoteOverdue, summariseInvoices,
} from './invoice-figures';

const NOW = new Date('2026-09-29T00:00:00Z');
const PAST = '2026-09-01T00:00:00Z';
const FUTURE = '2026-10-30T00:00:00Z';

describe('invoiceOwing', () => {
  test('a sent invoice owes its total', () => {
    assert.equal(invoiceOwing({ status: 'sent', totalAmount: '2420.00', paidAmount: '0' }), 2420);
  });
  test('a part-paid invoice owes only the remainder', () => {
    assert.equal(invoiceOwing({ status: 'partial', totalAmount: '5000', paidAmount: '1000' }), 4000);
  });
  test('paid and draft invoices owe nothing', () => {
    assert.equal(invoiceOwing({ status: 'paid', totalAmount: '500', paidAmount: '500' }), 0);
    assert.equal(invoiceOwing({ status: 'draft', totalAmount: '500' }), 0);
  });
  test('never negative, and rounds to the cent', () => {
    assert.equal(invoiceOwing({ status: 'partial', totalAmount: '100', paidAmount: '120' }), 0);
    assert.equal(invoiceOwing({ status: 'sent', totalAmount: '659.5200000001', paidAmount: '0' }), 659.52);
  });
});

describe('invoiceReceived', () => {
  test('counts part-payments, not just paid invoices', () => {
    assert.equal(invoiceReceived({ status: 'partial', totalAmount: '5000', paidAmount: '1000' }), 1000);
    assert.equal(invoiceReceived({ status: 'paid', totalAmount: '5000', paidAmount: '5000' }), 5000);
    assert.equal(invoiceReceived({ status: 'sent', totalAmount: '5000', paidAmount: '0' }), 0);
  });
  test('a paid invoice counts its total even if paidAmount was never recorded', () => {
    assert.equal(invoiceReceived({ status: 'paid', totalAmount: '800', paidAmount: '0' }), 800);
  });
});

describe('isInvoiceOverdue', () => {
  test('the server-flagged status counts', () => {
    assert.equal(isInvoiceOverdue({ status: 'overdue', totalAmount: '10', dueDate: PAST }, NOW), true);
  });
  test('a part-paid invoice past due is overdue — the server never flips those', () => {
    assert.equal(isInvoiceOverdue({ status: 'partial', totalAmount: '10', paidAmount: '5', dueDate: PAST }, NOW), true);
  });
  test('not yet due, no due date, or nothing owed: not overdue', () => {
    assert.equal(isInvoiceOverdue({ status: 'sent', totalAmount: '10', dueDate: FUTURE }, NOW), false);
    assert.equal(isInvoiceOverdue({ status: 'sent', totalAmount: '10' }, NOW), false);
    assert.equal(isInvoiceOverdue({ status: 'paid', totalAmount: '10', dueDate: PAST }, NOW), false);
  });
});

describe('isQuoteOverdue', () => {
  test('sent or viewed, past expiry', () => {
    assert.equal(isQuoteOverdue({ status: 'sent', expiryDate: PAST }, NOW), true);
    assert.equal(isQuoteOverdue({ status: 'viewed', expiryDate: PAST }, NOW), true);
  });
  test('an "overdue" status is not how quotes work', () => {
    assert.equal(isQuoteOverdue({ status: 'overdue', expiryDate: PAST }, NOW), false);
  });
  test('accepted, not expired, or no expiry: not overdue', () => {
    assert.equal(isQuoteOverdue({ status: 'accepted', expiryDate: PAST }, NOW), false);
    assert.equal(isQuoteOverdue({ status: 'sent', expiryDate: FUTURE }, NOW), false);
    assert.equal(isQuoteOverdue({ status: 'sent' }, NOW), false);
  });
});

describe('summariseInvoices', () => {
  const list = [
    { status: 'paid',    totalAmount: '4840', paidAmount: '4840' },
    { status: 'partial', totalAmount: '5000', paidAmount: '1000', dueDate: FUTURE },
    { status: 'overdue', totalAmount: '2420', paidAmount: '0',    dueDate: PAST },
    { status: 'partial', totalAmount: '700',  paidAmount: '200',  dueDate: PAST },
    { status: 'draft',   totalAmount: '999' },
  ];
  const s = summariseInvoices(list, NOW);

  test('outstanding is what is still owed, part-paid included', () => {
    assert.equal(s.outstanding, 4000 + 2420 + 500);
    assert.equal(s.outstandingCount, 3);
  });
  test('overdue and current split outstanding exactly', () => {
    assert.equal(s.overdue, 2420 + 500);
    assert.equal(s.overdueCount, 2);
    assert.equal(s.current, 4000);
    assert.equal(s.overdue + s.current, s.outstanding);
  });
  test('received counts every dollar that came in', () => {
    assert.equal(s.received, 4840 + 1000 + 200);
  });
  test('an empty or missing list is all zeros', () => {
    assert.deepEqual(summariseInvoices(undefined), {
      outstanding: 0, overdue: 0, current: 0, received: 0, outstandingCount: 0, overdueCount: 0,
    });
  });
});
