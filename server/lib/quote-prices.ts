/**
 * Quotes and learning from edits through the matching engine
 * (docs/pricing-design.md, Build order step 4, part 5).
 *
 * Before: a tradie's price reached an AI quote line only when the names were
 * identical after tidying, so a receipt price for "Reinforcing mesh SL82" never
 * met an AI line called "SL82 mesh sheet". Now each material line goes through
 * the matcher against the tradie's own price list: remembered, then plain, then
 * (only for lines still unmatched) ONE batched AI call per quote. Only a
 * confident match with the same unit or a certain conversion uses their price;
 * anything else stays "estimate, check this". Quote lines never go into the
 * "Not sure" list (that's for receipts).
 *
 * If the AI call fails or is slow, quoting carries on with the plain matches:
 * pricing never blocks a quote.
 *
 * No database here (the caller passes the rows in), so it's tested with a stub AI.
 */
import { itemKey, priceFor, newestPrices, type PriceEntry, type PriceRow } from "../../shared/price-list";
import { localMatch, decideAi, dedupeCandidates, type Remembered, type MatchInput, type Match } from "../../shared/matcher";
import { checkLinePrice } from "../../shared/price-sanity";
import { aiMatchLines, type Complete } from "./match-ai";

const isLabour = (it: any) => String(it?.category ?? "").toLowerCase() === "labour";

/** Matches for a list of lines against the tradie's price rows; undefined where there's no usable match. */
async function matchAgainstList<R extends PriceRow>(
  inputs: (MatchInput | null)[],
  rows: R[],
  remembered: Remembered[],
  complete: Complete,
  opts: { timeoutMs?: number } = {},
): Promise<({ row: R; factor: number } | undefined)[]> {
  const list = newestPrices(rows);
  const candidates = dedupeCandidates([...list.values()].map((r) => ({ item: r.item, unit: r.unit })));
  const matches: (Match | null)[] = inputs.map((inp) => (inp ? localMatch(inp, candidates, remembered) : null));
  const ask = matches.flatMap((m, i) => (m?.kind === "needs_ai" ? [i] : []));
  if (ask.length && candidates.length) {
    const suggestions = await aiMatchLines(complete, ask.map((i) => inputs[i]!), candidates, { timeoutMs: opts.timeoutMs });
    ask.forEach((i, k) => { matches[i] = decideAi(inputs[i]!, suggestions[k], candidates); });
  }
  return matches.map((m) => {
    if (!m || m.kind !== "matched") return undefined;
    const row = priceFor(list, { description: m.item, unit: m.unit });
    return row ? { row, factor: m.factor } : undefined;
  });
}

/** For an AI quote's items: the tradie's price row per material line (by the matcher), else undefined. */
export async function resolveQuoteMatches<R extends PriceRow>(
  items: any[],
  rows: R[],
  remembered: Remembered[],
  complete: Complete,
  opts: { timeoutMs?: number } = {},
): Promise<({ row: R; factor: number } | undefined)[]> {
  if (!rows.length) return items.map(() => undefined);
  const inputs = items.map((it) => (isLabour(it) || !String(it?.description ?? "").trim()
    ? null
    : { text: String(it.description), unit: String(it.unit ?? ""), supplier: "" }));
  return matchAgainstList(inputs, rows, remembered, complete, opts);
}

/**
 * Prices learned from a sent quote (shared/price-list learnedPrices), stored
 * against the item they match where the match is confident, so an edit to
 * "SL82 mesh sheet" updates the same item a receipt does. Converted to that
 * item's unit, and checked against the sanity bands again after converting.
 * Unmatched entries are kept as they were learned.
 */
export async function matchLearnedEntries<R extends PriceRow>(
  entries: PriceEntry[],
  rows: R[],
  remembered: Remembered[],
  complete: Complete,
  opts: { timeoutMs?: number } = {},
): Promise<PriceEntry[]> {
  if (!entries.length || !rows.length) return entries;
  const matches = await matchAgainstList(
    entries.map((e) => ({ text: e.item, unit: e.unit, supplier: "" })), rows, remembered, complete, opts,
  );
  const out: PriceEntry[] = [];
  entries.forEach((e, i) => {
    const m = matches[i];
    if (!m || itemKey(m.row.item) === itemKey(e.item) && m.factor === 1) { out.push(e); return; }
    const unitPrice = Math.round((e.unitPrice / m.factor) * 100) / 100;
    if (!(unitPrice > 0) || checkLinePrice({ description: m.row.item, unitPrice, unit: m.row.unit })) return;
    out.push({
      item: m.row.item,
      unit: m.row.unit,
      unitPrice,
      quantity: e.quantity == null ? null : Math.round(e.quantity * m.factor * 1000) / 1000,
    });
  });
  return out;
}
