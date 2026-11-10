/**
 * Receipt lines as pricing needs them (docs/pricing-design.md, Build order
 * step 4, part 1).
 *
 * Before step 4 a receipt line was only { description, amount }: enough for an
 * expense, not enough to price anything. A line now also carries what was
 * printed for quantity, unit and unit price. Nothing is invented: a figure the
 * receipt doesn't show stays empty, and a unit price is worked out from
 * amount ÷ quantity only when both are printed.
 *
 * Old receipts (description and amount only) read exactly as before; every new
 * field is optional. Pure, no packages; tested in receipt-lines.test.ts.
 */

export type ReceiptLine = {
  description: string;
  /** As printed. Absent when the receipt doesn't show one. */
  quantity?: number;
  /** As printed ("EA", "LM", "BAG"), absent when not shown. */
  unit?: string;
  /** Per unit, as printed (or amount ÷ quantity when both are printed). */
  unitPrice?: number;
  /** What the line cost in total: the price actually paid, after any discount printed on the line. */
  amount: number;
  /** A discount printed against this line, as a positive figure. */
  lineDiscount?: number;
};

const MAX_LINES = 150;

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Lines that are about paying, not buying: the card, the account, the loyalty
 * scheme. The scanner is told to skip them; any it returns anyway are dropped
 * so a card or account number never ends up in the item data.
 */
const PAYMENT_LINE = /\b(visa|mastercard|master card|amex|eftpos|debit|credit card|card\s*(no|number|#)|acct|account\s*(no|number|#)|loyalty|rewards?|member(ship)?\s*(no|number|#)|powerpass|trade\s*card|auth(orisation)?\s*(no|code)|change|cash\s*out|tendered)\b/i;

/** Any run of 8 or more digits (card, account or member numbers) is removed from a description. */
const scrubDigits = (s: string) => s.replace(/(?:\d[\s-]?){8,}/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The lines from a scan or a save, made safe to store: only the known fields,
 * numbers as numbers, payment and loyalty lines dropped, long digit runs
 * removed. A line keeps its unit price only as printed, or amount ÷ quantity
 * when both of those are printed.
 */
export function cleanReceiptLines(raw: unknown): ReceiptLine[] {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  const out: ReceiptLine[] = [];
  for (const it of list.slice(0, MAX_LINES)) {
    const rawDesc = String((it as any)?.description ?? '').trim();
    if (PAYMENT_LINE.test(rawDesc)) continue;
    const description = scrubDigits(rawDesc).slice(0, 200);
    const amount = num((it as any)?.amount);
    if (!description && amount === undefined) continue;
    const line: ReceiptLine = { description, amount: amount === undefined ? 0 : cents(amount) };
    const quantity = num((it as any)?.quantity);
    if (quantity !== undefined && quantity > 0) line.quantity = quantity;
    const unit = String((it as any)?.unit ?? '').trim().slice(0, 20);
    if (unit) line.unit = unit;
    const unitPrice = num((it as any)?.unitPrice);
    if (unitPrice !== undefined && unitPrice > 0) line.unitPrice = cents(unitPrice);
    else if (line.quantity !== undefined && amount !== undefined && amount > 0) line.unitPrice = cents(amount / line.quantity);
    const lineDiscount = num((it as any)?.lineDiscount);
    if (lineDiscount !== undefined && lineDiscount !== 0) line.lineDiscount = cents(Math.abs(lineDiscount));
    out.push(line);
  }
  return out;
}

/** "Prices include GST" from the scan: true, false, or not stated (null). */
export function cleanGstFlag(v: unknown): boolean | null {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
}

/** A receipt-level discount (not tied to any line), as a positive figure, or null. */
export function cleanReceiptDiscount(v: unknown): number | null {
  const n = num(v);
  return n === undefined || n === 0 ? null : cents(Math.abs(n));
}

/**
 * What one unit cost on this line, as actually paid (after a line discount),
 * and how many were bought. Uses the line total when it can, because that's the
 * price paid: amount ÷ quantity. Without a quantity, the printed unit price
 * gives one (amount ÷ unit price). Null when the line can't price anything.
 */
export function paidPerUnit(line: ReceiptLine): { quantity: number; perUnit: number } | null {
  const amount = line.amount > 0 ? line.amount : undefined;
  let quantity = line.quantity;
  if (quantity === undefined && amount !== undefined && line.unitPrice) {
    const q = amount / line.unitPrice;
    // Only a clean count: 3 × $12.50 = $37.50. A fraction means the numbers don't belong together.
    if (Math.abs(q - Math.round(q)) < 0.01 && Math.round(q) > 0) quantity = Math.round(q);
  }
  if (quantity === undefined || quantity <= 0) return null;
  const perUnit = amount !== undefined ? amount / quantity : line.unitPrice;
  if (!perUnit || perUnit <= 0) return null;
  // Kept to 4 places: it's divided again (GST, unit conversion) before it's stored in cents.
  return { quantity, perUnit: Math.round(perUnit * 10000) / 10000 };
}
