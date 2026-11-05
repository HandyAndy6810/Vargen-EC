/**
 * How a total is worded when GST is on or off (round 2, st3). One place, used by
 * the app, every PDF style and the customer's link pages, so they all agree.
 *
 * Off means the tradie isn't registered for GST, so they mustn't charge it and
 * the price is the whole price. "Total (ex. GST)" or "GST not included" read as
 * if GST were still to be added on top, which would be wrong. So the total is
 * just "Total", and a short line under it says "No GST charged": true, and it
 * tells the customer nothing else is coming.
 */
export const NO_GST_NOTE = 'No GST charged';

/** The label for the grand total. */
export function totalLabel(includeGST: boolean, base = 'Total'): string {
  return includeGST ? `${base} (inc. GST)` : base;
}

/** The short tag next to a total in the app ("inc GST", or the no-GST note). */
export function gstTag(includeGST: boolean): string {
  return includeGST ? 'inc GST' : NO_GST_NOTE;
}
