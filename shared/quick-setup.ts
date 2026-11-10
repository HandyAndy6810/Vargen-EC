/**
 * Quick setup (docs/pricing-design.md, Build order step 3): a tradie picks their
 * trade(s) and, optionally, types what they pay for common items. Those prices
 * go straight into their price list (price_list_items) as "your price".
 *
 * The server checks what the phone sends (quickSetupEntries) and what the AI
 * suggests for an "Other" trade (cleanSuggestions). Pure; tested in
 * quick-setup.test.ts.
 */
import { checkLinePrice } from './price-sanity';
import { itemKey, unitKey, type PriceEntry } from './price-list';

/** The most a single unit price can be: a typo guard, not a judgement. */
export const MAX_UNIT_PRICE = 100_000;
export const MAX_ENTRIES = 200;
export const MAX_SUGGESTIONS = 15;

/** The key quick setup uses to line a price box up with a saved price. */
export const entryKey = (item: unknown, unit: unknown) => `${itemKey(item)}|${unitKey(unit)}`;

/**
 * Parse a typed price: "$12.50", "12.5", " 12 " → 12.5 / 12; blank or junk → null.
 * Rounded to cents.
 */
export function parsePrice(raw: unknown): number | null {
  const s = String(raw ?? '').replace(/[$,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * The entries a quick setup save may store, and the ones held back. An entry
 * needs an item name, a unit and a price above zero; anything else is dropped.
 * A price the sanity bands flag is held back (named in `heldBack`) rather than
 * saved, as the design doc says.
 */
export function quickSetupEntries(body: unknown): { entries: PriceEntry[]; heldBack: string[] } {
  const raw = Array.isArray((body as any)?.entries) ? (body as any).entries.slice(0, MAX_ENTRIES) : [];
  const entries: PriceEntry[] = [];
  const heldBack: string[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    const item = typeof e?.item === 'string' ? e.item.trim().slice(0, 200) : '';
    const unit = typeof e?.unit === 'string' ? e.unit.trim().slice(0, 30) : '';
    const price = parsePrice(e?.unitPrice);
    if (!item || !unit || price == null || price > MAX_UNIT_PRICE) continue;
    const k = entryKey(item, unit);
    if (seen.has(k)) continue;
    seen.add(k);
    if (checkLinePrice({ description: item, unitPrice: price, unit })) { heldBack.push(item); continue; }
    entries.push({ item, quantity: null, unit, unitPrice: price });
  }
  return { entries, heldBack };
}

/**
 * The AI's suggested items for an "Other" trade, made safe to show: names and
 * units only (the AI never writes a price), deduplicated, at most
 * MAX_SUGGESTIONS. Anything malformed is dropped.
 */
export function cleanSuggestions(raw: unknown): { item: string; unit: string }[] {
  const list = Array.isArray((raw as any)?.items) ? (raw as any).items : [];
  const out: { item: string; unit: string }[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const item = typeof s?.item === 'string' ? s.item.trim().slice(0, 80) : '';
    const unit = typeof s?.unit === 'string' && s.unit.trim() ? s.unit.trim().slice(0, 20) : 'each';
    if (!item) continue;
    const k = entryKey(item, unit);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ item, unit });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/**
 * What to send on Save: rows whose price box holds a valid price that differs
 * from the price already saved for that item (so reopening quick setup and
 * saving without changes adds nothing to the price history).
 */
export function changedEntries(
  rows: { item: string; unit: string; price: string }[],
  saved: Map<string, number>,
): { item: string; unit: string; unitPrice: number }[] {
  const out: { item: string; unit: string; unitPrice: number }[] = [];
  for (const r of rows) {
    const p = parsePrice(r.price);
    if (p == null) continue;
    if (saved.get(entryKey(r.item, r.unit)) === p) continue;
    out.push({ item: r.item.trim(), unit: r.unit.trim(), unitPrice: p });
  }
  return out;
}
