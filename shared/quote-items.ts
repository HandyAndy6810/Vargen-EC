import { num, round2 } from './money';

/**
 * Deriving the quote_items rows from a quote's own content.
 *
 * The rows and content.items describe the same lines, and they drifted. The mobile
 * app used to write the rows itself with N sequential deletes and N posts, each
 * one able to fail on its own — and the failures were swallowed with
 * `.catch(() => {})`. Any line with a fractional quantity failed to insert at all,
 * because quote_items.quantity was an integer column, so "1.5 hr labour" simply
 * vanished from the rows while staying in content. Confirmed on live quotes #5 and
 * #27, and the AI prompt asks for at least fifteen minutes of cleanup, so most AI
 * quotes carry a fractional line.
 *
 * The content is authoritative: the detail screen, the PDF and the totals all read
 * it. So the rows are rebuilt from it rather than written separately, and this is
 * the one place that decides what a row should be.
 */

export type QuoteItemRow = {
  description: string;
  /** Kept fractional. The column is numeric, not integer, for exactly this reason. */
  quantity: number;
  /** The per-unit SELL price, matching content.items[].unitPrice. */
  price: number;
};

/**
 * Returns the rows a quote should have, or null when content carries no items
 * array at all — which means "nothing to say about the rows", not "delete them".
 * That distinction matters: a caller that posts a quote without items must not
 * silently wipe the rows it already has.
 */
export function quoteItemRowsFromContent(content: unknown): QuoteItemRow[] | null {
  let parsed: any = content;

  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!Array.isArray(parsed.items)) return null;

  return parsed.items
    .map((it: any): QuoteItemRow => ({
      description: String(it?.description ?? '').trim() || 'Item',
      quantity: round2(num(it?.quantity) || 1),
      price: round2(num(it?.unitPrice)),
    }))
    // The same rule the mobile save loop used: a line with neither a description
    // nor a price is a blank row the tradie never filled in.
    .filter((row: QuoteItemRow) => row.description !== 'Item' || row.price > 0);
}

/** What the rows add up to, for reconciling against a quote's subtotal. */
export function quoteItemRowsTotal(rows: QuoteItemRow[]): number {
  return round2(rows.reduce((sum, r) => sum + r.quantity * r.price, 0));
}
