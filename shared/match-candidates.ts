/**
 * What a line can match (docs/pricing-design.md, step 4): the tradie's own price
 * list, and the quick setup catalogue for their trade(s), so a first receipt can
 * land on "Reinforcing mesh SL82 (6 × 2.4 m), sheet" before they've priced it.
 *
 * Their trades aren't stored (quick setup didn't need to), so they're read from
 * what they have: any trade whose catalogue holds an item already in their price
 * list, plus the trade named in settings. Neither tells us anything: every
 * trade's list. Pure; tested in match-candidates.test.ts.
 */
import { QUICK_SETUP_TRADES } from './quick-setup-items';
import { dedupeCandidates, type Candidate } from './matcher';
import { itemKey } from './price-list';

export function tradesFor(list: { item: string }[], tradeType?: string | null): string[] {
  const have = new Set(list.map((r) => itemKey(r.item)));
  const named = itemKey(tradeType);
  const trades = QUICK_SETUP_TRADES
    .filter((t) => itemKey(t.trade) === named || t.items.some((i) => have.has(itemKey(i.item))))
    .map((t) => t.trade);
  return trades.length ? trades : QUICK_SETUP_TRADES.map((t) => t.trade);
}

/** Price list first (their own wording wins a tie), then their trades' catalogue. */
export function receiptCandidates(list: { item: string; unit: string }[], tradeType?: string | null): Candidate[] {
  const trades = new Set(tradesFor(list, tradeType));
  const catalogue = QUICK_SETUP_TRADES.filter((t) => trades.has(t.trade)).flatMap((t) => t.items);
  return dedupeCandidates([...list.map((r) => ({ item: r.item, unit: r.unit })), ...catalogue]);
}
