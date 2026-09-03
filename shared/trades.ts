/**
 * The one list of trades the app offers, and the one function that decides which
 * trade a stored value means.
 *
 * There used to be four separate lists that disagreed with each other, and a fifth
 * set of substring rules inside the AI knowledge base. The visible cost was that a
 * roofer, tiler, landscaper, concreter or fencer could not pick their own trade in
 * the mobile app at all — the picker offered six options while the AI held detailed
 * pricing knowledge for ten — so those tradies silently got the generic handyman
 * rates on every quote.
 *
 * No drizzle imports here: mobile reads this file too.
 */

export type TradeKey =
  | 'general'
  | 'plumbing'
  | 'electrical'
  | 'carpentry'
  | 'painting'
  | 'tiling'
  | 'landscaping'
  | 'concreting'
  | 'fencing'
  | 'roofing'
  | 'aircon';

export type TradeOption = { key: TradeKey; label: string };

/**
 * Order matters — it's the order of the chips in settings. Every entry except
 * `general` has a matching knowledge base in server/trade-knowledge.ts.
 */
export const TRADES: TradeOption[] = [
  { key: 'general',     label: 'General' },
  { key: 'plumbing',    label: 'Plumbing' },
  { key: 'electrical',  label: 'Electrical' },
  { key: 'carpentry',   label: 'Carpentry' },
  { key: 'painting',    label: 'Painting' },
  { key: 'tiling',      label: 'Tiling' },
  { key: 'landscaping', label: 'Landscaping' },
  { key: 'concreting',  label: 'Concreting' },
  { key: 'fencing',     label: 'Fencing' },
  { key: 'roofing',     label: 'Roofing' },
  { key: 'aircon',      label: 'Air Conditioning' },
];

export const TRADE_LABELS: string[] = TRADES.map(t => t.label);

/**
 * Substrings that identify each trade, in priority order. These stay deliberately
 * loose because `settings.tradeType` is a free-text column: it holds whatever the
 * web app, the mobile app or an older build happened to write — "Electrician",
 * "electrical", "HVAC", "Landscaper" have all been stored at some point.
 */
const MATCHERS: { key: TradeKey; needles: string[] }[] = [
  { key: 'plumbing',    needles: ['plumb'] },
  { key: 'electrical',  needles: ['electr'] },
  { key: 'carpentry',   needles: ['carp', 'build', 'joiner'] },
  { key: 'painting',    needles: ['paint'] },
  { key: 'landscaping', needles: ['landscap', 'garden'] },
  { key: 'concreting',  needles: ['concret'] },
  { key: 'fencing',     needles: ['fenc'] },
  { key: 'tiling',      needles: ['tiling', 'tiler', 'tile'] },
  { key: 'aircon',      needles: ['hvac', 'air con', 'aircon', 'air-con', 'refrig'] },
  { key: 'roofing',     needles: ['roof'] },
];

/** Resolve any stored trade string to a canonical key. Unknown → 'general'. */
export function tradeKey(stored?: string | null): TradeKey {
  const t = String(stored || '').toLowerCase();
  if (!t) return 'general';
  for (const m of MATCHERS) {
    if (m.needles.some(n => t.includes(n))) return m.key;
  }
  return 'general';
}

/** The display label for a stored trade string. */
export function tradeLabel(stored?: string | null): string {
  const key = tradeKey(stored);
  return TRADES.find(t => t.key === key)?.label || 'General';
}
