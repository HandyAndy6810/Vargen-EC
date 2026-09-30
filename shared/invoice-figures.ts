/**
 * The rules for "what's owed", "what's overdue" and "what came in", in one
 * place. Home, the Invoices tab and the Quotes tab each worked these out for
 * themselves and disagreed: Home looked for invoice statuses that don't exist
 * ("pending", "unpaid"), left part-paid invoices out of Outstanding entirely,
 * summed whole invoice totals rather than what was still owed, and counted
 * quotes with an "overdue" status no quote ever has. So the same business could
 * show two different Outstanding figures a tab apart.
 *
 * Pure functions over the rows the API returns, where money arrives as strings.
 */
import { round2 } from './money';

type Row = Record<string, any>;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Statuses that mean the customer still owes something. */
const OPEN_INVOICE = ['sent', 'partial', 'overdue'];

/** What's still owed on an invoice. A paid invoice owes nothing. */
export function invoiceOwing(inv: Row): number {
  if (!OPEN_INVOICE.includes(String(inv?.status))) return 0;
  return round2(Math.max(0, num(inv.totalAmount) - num(inv.paidAmount)));
}

/** Money actually received against an invoice, part-payments included. */
export function invoiceReceived(inv: Row): number {
  if (inv?.status === 'paid') return round2(num(inv.totalAmount));
  return round2(Math.max(0, num(inv?.paidAmount)));
}

/**
 * Overdue means money is still owed and the due date has passed. The server
 * flips "sent" invoices to "overdue" when the list loads, but not part-paid
 * ones, so a part-paid invoice past its due date counts here too.
 */
export function isInvoiceOverdue(inv: Row, now: Date = new Date()): boolean {
  if (invoiceOwing(inv) <= 0) return false;
  if (inv.status === 'overdue') return true;
  if (!inv.dueDate) return false;
  const due = new Date(inv.dueDate);
  return !isNaN(due.getTime()) && due < now;
}

/** A sent quote the customer hasn't answered, past its expiry date. */
export function isQuoteOverdue(q: Row, now: Date = new Date()): boolean {
  if (!['sent', 'viewed'].includes(String(q?.status)) || !q.expiryDate) return false;
  const exp = new Date(q.expiryDate);
  return !isNaN(exp.getTime()) && exp < now;
}

export type InvoiceSummary = {
  /** Still owed across every open invoice. */
  outstanding: number;
  /** The part of `outstanding` that is past due. */
  overdue: number;
  /** Owed but not yet due: outstanding minus overdue. */
  current: number;
  /** Everything received, part-payments included. */
  received: number;
  outstandingCount: number;
  overdueCount: number;
};

export function summariseInvoices(invoices: Row[] | null | undefined, now: Date = new Date()): InvoiceSummary {
  let outstanding = 0, overdue = 0, received = 0, outstandingCount = 0, overdueCount = 0;
  for (const inv of invoices ?? []) {
    received += invoiceReceived(inv);
    const owing = invoiceOwing(inv);
    if (owing <= 0) continue;
    outstanding += owing;
    outstandingCount++;
    if (isInvoiceOverdue(inv, now)) {
      overdue += owing;
      overdueCount++;
    }
  }
  return {
    outstanding: round2(outstanding),
    overdue: round2(overdue),
    current: round2(outstanding - overdue),
    received: round2(received),
    outstandingCount,
    overdueCount,
  };
}
