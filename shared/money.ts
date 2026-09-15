/**
 * Every figure the app quotes, bills or displays is computed here and nowhere else.
 *
 * This file exists because the same arithmetic used to live in three places — the
 * quote draft on the phone, the invoice draft on the phone, and the invoice split on
 * the server — and they drifted. A deposit billed the full amount. A quote listed
 * $127 of line items under a $4,840 total. The GST switch in settings changed
 * nothing because two of the three places multiplied by 1.1 regardless. None of
 * those were hard bugs; they were the same sum written out more than once.
 *
 * Rules for anything added here:
 *  - **Pure.** No React, no network, no database, no Date.now(). Given the same
 *    input it returns the same output, so it can be tested without a device.
 *  - **No imports.** Mobile, server and shared all pull this in; a dependency on
 *    any one of them breaks the other two.
 *  - **Every function gets a test** in money.test.ts. That suite is the contract.
 *
 * Money is held as a JavaScript number and rounded to cents at each step, which is
 * safe at the sizes a trade job reaches. Do not accumulate unrounded floats across
 * many lines and round once at the end — that is how totals end up a cent out from
 * the lines that made them.
 */

/** Round to whole cents. The only rounding this file does, apart from roundUp. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Parse a value that may be a string from a text field, a number, or nothing.
 * Anything unusable — empty, NaN, Infinity — is 0, because a blank price field
 * means "no charge", never "not a number".
 */
export function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * A line as the money code needs to see it. Both the quote and invoice drafts hold
 * their lines as strings from text inputs, so every field is deliberately loose.
 *
 * `cost` is what the tradie pays; `price` is what they charge. The markup engine
 * works from cost — without one, a "margin" can only ever be a fixed ratio of the
 * price, which is what made the original slider useless.
 */
export type MoneyLine = {
  qty?: string | number;
  price?: string | number;
  cost?: string | number;
  /** Pinned: the job-level markup slider skips this line, it still counts in totals. */
  markupLocked?: boolean;
  lockedPrice?: string | number;
};

/**
 * What the customer pays per unit.
 *
 * Three cases, in order:
 *  - locked → the price it held when it was pinned, whatever the slider does since
 *  - has a cost → cost plus markup
 *  - no cost → its own typed price, unmoved by the slider
 *
 * The last case is why "Total cost" can sit below the sum of the lines: such a line
 * adds to what the customer pays and nothing to cost, so it reads as pure profit.
 * That is correct arithmetic on incomplete data, and the Review screen says so.
 */
export function unitSell(line: MoneyLine, markupPct: number): number {
  if (line.markupLocked) {
    const locked = num(line.lockedPrice);
    return locked > 0 ? locked : num(line.price);
  }
  const cost = num(line.cost);
  if (cost > 0) return round2(cost * (1 + num(markupPct) / 100));
  return num(line.price);
}

/** Quantity times unit sell. The figure that belongs in a line's Amount column. */
export function lineTotal(line: MoneyLine, markupPct: number): number {
  return round2(num(line.qty) * unitSell(line, markupPct));
}

/** What the line cost the tradie, before any markup. */
export function lineCost(line: MoneyLine): number {
  return round2(num(line.qty) * num(line.cost));
}

/** 10% for a GST-registered tradie, 0 for one who is not. */
export function gstRateFor(includeGST: boolean | undefined): number {
  return includeGST === false ? 0 : 0.1;
}

export type Totals = {
  /** Before tax. */
  subtotal: number;
  /** 0 when the tradie is not GST-registered. */
  gst: number;
  /** What the customer pays. */
  total: number;
  /** What the job costs the tradie, across lines that have a cost recorded. */
  totalCost: number;
  /** subtotal − totalCost. Overstated when lines carry no cost; see unitSell. */
  profit: number;
  /** Lines with a price but no cost, so the caller can warn that profit is partial. */
  uncostedLines: number;
};

export type TotalsOptions = {
  markupPct?: number;
  /** Use gstRateFor(settings.includeGST) rather than hardcoding. */
  gstRate?: number;
  /** Land the customer-facing total on a whole dollar. */
  roundUp?: boolean;
};

/**
 * Every figure on the Review screen, from the lines and the slider position.
 *
 * With roundUp the TOTAL is the fixed point and the subtotal is re-derived from it,
 * so total = subtotal + gst still holds exactly. Rounding the subtotal instead and
 * recomputing the total would land on a whole dollar that then stopped reconciling.
 */
export function totalsFor(lines: MoneyLine[], opts: TotalsOptions = {}): Totals {
  const markupPct = num(opts.markupPct);
  const gstRate = opts.gstRate === undefined ? 0.1 : num(opts.gstRate);
  const list = Array.isArray(lines) ? lines : [];

  const rawSubtotal = round2(list.reduce((s, l) => s + num(l.qty) * unitSell(l, markupPct), 0));
  const rawTotal = round2(rawSubtotal * (1 + gstRate));

  const total = opts.roundUp ? Math.ceil(rawTotal) : rawTotal;
  const subtotal = opts.roundUp ? round2(total / (1 + gstRate)) : rawSubtotal;
  const gst = round2(total - subtotal);

  const totalCost = round2(list.reduce((s, l) => s + num(l.qty) * num(l.cost), 0));

  const uncostedLines = list.filter(
    l => !(num(l.cost) > 0) && num(l.qty) * unitSell(l, 0) > 0
  ).length;

  return { subtotal, gst, total, totalCost, profit: round2(subtotal - totalCost), uncostedLines };
}

export type InvoiceType = 'full' | 'deposit' | 'balance';

export type SplitInput = {
  /** The whole job, GST inclusive. */
  fullTotal: number;
  /** Already billed against the same quote by other invoices. */
  priorInvoiced?: number;
  /** Used when no fixed amount is given. */
  depositPercent?: number;
  /** A dollar deposit, which wins over the percentage when above zero. */
  depositAmount?: number | string;
};

/**
 * What THIS invoice bills, given the job total and what has already gone out.
 *
 * A deposit takes its slice of the whole job; a balance takes whatever is left. A
 * deposit is capped at the job total and a balance floored at zero, so no
 * combination of inputs can bill more than the work is worth or less than nothing.
 *
 * This is the sum that used to live only on the phone while the server stored
 * whatever total it was handed — which is how a 50% deposit came to be saved at
 * the full amount.
 */
export function invoiceSplitTotal(type: InvoiceType, input: SplitInput): number {
  const fullTotal = round2(num(input.fullTotal));
  const priorInvoiced = round2(num(input.priorInvoiced));

  if (type === 'deposit') {
    const fixed = num(input.depositAmount);
    if (fixed > 0) return round2(Math.min(fixed, fullTotal));
    return round2(fullTotal * (num(input.depositPercent) / 100));
  }

  if (type === 'balance') {
    return round2(Math.max(0, fullTotal - priorInvoiced));
  }

  return fullTotal;
}

/** What would still be unbilled after this invoice. Never negative. */
export function remainingAfter(input: SplitInput, thisInvoice: number): number {
  return round2(Math.max(0, num(input.fullTotal) - num(input.priorInvoiced) - num(thisInvoice)));
}

/**
 * A quote is only fully invoiced once the whole value is billed. Compared in cents
 * with a one-cent tolerance, so a rounding difference cannot leave a quote stuck
 * open forever on a stray fraction.
 */
export function isFullyInvoiced(quoteTotal: number, invoicedTotal: number): boolean {
  return round2(num(invoicedTotal)) >= round2(num(quoteTotal)) - 0.01;
}

/**
 * Split a GST-inclusive figure back into its parts, for an invoice that bills only
 * a slice of a job. The total is authoritative and the subtotal derived, so the
 * pieces always add back up to it.
 */
export function splitGst(total: number, gstRate: number): { subtotal: number; gst: number } {
  const t = round2(num(total));
  const rate = num(gstRate);
  const subtotal = round2(t / (1 + rate));
  return { subtotal, gst: round2(t - subtotal) };
}
