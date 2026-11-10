/**
 * Receipts feed the price list (docs/pricing-design.md, Build order step 4,
 * part 3): the rules for turning a saved receipt's lines into the tradie's
 * prices. Matching itself is shared/matcher.ts; the server runs the two together.
 *
 * A receipt teaches nothing when:
 *  - its total and its lines disagree (receiptTotalMismatch): a misread receipt;
 *  - it has a discount on the whole receipt that can't be tied to lines: the
 *    printed prices aren't what was paid;
 *  - it's a fuel, food or subcontractor receipt: no materials on it.
 *
 * A line becomes a price only when it's matched (remembered, plain or a
 * confident AI match) as a material, its quantity and price paid are known (or
 * one follows from the other and the line total), and the price per the
 * matched item's unit, ex GST, passes the sanity bands.
 *
 * GST: prices are divided by 1.1 when the receipt says they include GST, and
 * also when it doesn't say, because an Australian tax invoice normally shows
 * GST-inclusive prices. Only a receipt that says its prices are ex GST is
 * taken as printed.
 *
 * Pure; tested in receipt-pricing.test.ts.
 */
import { receiptTotalMismatch } from './receipt-check';
import { cleanReceiptLines, paidPerUnit, type ReceiptLine } from './receipt-lines';
import { checkLinePrice } from './price-sanity';
import type { PriceEntry } from './price-list';

export type ReceiptForPricing = {
  vendor?: string | null;
  receiptDate?: string | null;
  createdAt?: Date | string | null;
  category?: string | null;
  totalAmount?: string | number | null;
  items?: unknown;
  pricesIncludeGst?: boolean | null;
  receiptDiscount?: string | number | null;
};

export type SkipReason = 'mismatch' | 'receipt_discount' | 'not_materials' | 'no_lines';

/** Receipt categories that never carry materials. */
const NO_MATERIALS = new Set(['fuel', 'food', 'subcontractor']);

export function pricingSkip(r: ReceiptForPricing): SkipReason | null {
  if (NO_MATERIALS.has(String(r.category ?? '').trim().toLowerCase())) return 'not_materials';
  const lines = cleanReceiptLines(r.items);
  if (!lines.length) return 'no_lines';
  if (receiptTotalMismatch(r.totalAmount, r.items).mismatch) return 'mismatch';
  const disc = Number(r.receiptDiscount);
  if (Number.isFinite(disc) && disc > 0) return 'receipt_discount';
  return null;
}

/** The lines that could price something: a quantity and a price paid are known. */
export function pricedLines(r: ReceiptForPricing): { index: number; line: ReceiptLine; quantity: number; perUnit: number }[] {
  return cleanReceiptLines(r.items).flatMap((line, index) => {
    const paid = paidPerUnit(line);
    return paid ? [{ index, line, ...paid }] : [];
  });
}

/** The receipt's date as the price's date (not the scan date), else when it was saved. */
export function receiptPriceDate(r: ReceiptForPricing): Date {
  const d = String(r.receiptDate ?? '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T12:00:00Z`);
  const c = r.createdAt ? new Date(r.createdAt) : new Date();
  return Number.isFinite(c.getTime()) ? c : new Date();
}

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * One matched line as a price: per the item's unit, ex GST. `factor` is how
 * many of the item's unit one of the line's units is (shared/matcher). Null
 * when the result fails the sanity bands (held back, not saved).
 */
export function priceFromMatch(
  r: ReceiptForPricing,
  p: { quantity: number; perUnit: number },
  m: { item: string; unit: string; factor: number },
): PriceEntry | null {
  if (!(m.factor > 0)) return null;
  const exGst = r.pricesIncludeGst === false ? p.perUnit : p.perUnit / 1.1;
  const unitPrice = cents(exGst / m.factor);
  if (!(unitPrice > 0)) return null;
  if (checkLinePrice({ description: m.item, unitPrice, unit: m.unit })) return null;
  return { item: m.item, quantity: Math.round(p.quantity * m.factor * 1000) / 1000, unit: m.unit, unitPrice };
}
