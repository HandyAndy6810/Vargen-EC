/**
 * Does a receipt's total agree with its line items?
 *
 * The scanner reads receipts with an AI model, and models misread. An Aomori
 * Sushi receipt for $169.51 was saved as $67.00 — the "1" of $167.00 dropped —
 * while the items it read added up to $147.50. Nothing compared the two, so
 * nobody was told. The two figures disagreeing is a cheap, reliable sign the
 * total needs checking against the paper.
 */
import { round2 } from './money';

export type ReceiptItem = { description: string; amount: number };

/** The items as a list, from the stored JSON string or an array. Bad data → []. */
export function receiptItems(raw: unknown): ReceiptItem[] {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((it: any) => ({
      description: String(it?.description ?? '').trim(),
      amount: Number(it?.amount),
    }))
    .filter((it) => it.description || Number.isFinite(it.amount));
}

/** Sum of the items' amounts, to the cent. */
export function receiptItemsTotal(raw: unknown): number {
  return round2(receiptItems(raw).reduce((sum, it) => sum + (Number.isFinite(it.amount) ? it.amount : 0), 0));
}

/**
 * Whether the total and the items disagree by more than a receipt plausibly
 * would. Allows $1 or 2% of the total, whichever is larger — enough for a card
 * surcharge ($2.51 on $167 is 1.5%) or rounding, not for a misread digit.
 * No items, or no usable total, is never a mismatch: there's nothing to check.
 */
export function receiptTotalMismatch(total: unknown, raw: unknown): { itemsTotal: number; mismatch: boolean } {
  const items = receiptItems(raw);
  const itemsTotal = receiptItemsTotal(items);
  const t = Number(total);
  if (items.length === 0 || itemsTotal <= 0 || !Number.isFinite(t) || t <= 0) {
    return { itemsTotal, mismatch: false };
  }
  const allowed = Math.max(1, t * 0.02);
  return { itemsTotal, mismatch: Math.abs(itemsTotal - t) > allowed };
}
