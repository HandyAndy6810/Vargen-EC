/**
 * Each tradie's own price list (docs/pricing-design.md, Build order step 2).
 *
 * What a tradie pays for an item, learned from their own records. Step 2 learns
 * from one source: material lines they CHANGED (or typed themselves) on an AI
 * quote before sending it, compared with what the AI gave them (the #145
 * ai_generations record). Later steps add quick setup, receipts and shared
 * invoices into the same table.
 *
 * The rules, from the design doc:
 *  - Untouched AI lines never count. A line still carrying an AI figure is the
 *    AI's guess, not the tradie's price.
 *  - Only item, quantity, unit, unit price (what they pay, ex GST), date and
 *    supplier are stored. No customer, address, job or quote reference.
 *  - Figures outside the sanity bands (shared/price-sanity) are held back.
 *  - The newest price for an item wins.
 *
 * Matching here is deliberately plain: the same item name (case, spacing and
 * punctuation ignored) in the same unit. The real matching engine ("SL82 MESH
 * 6X2.4" = "reinforcing mesh") is step 4.
 *
 * Pure. Imports only other pure shared files. Tested in price-list.test.ts.
 */
import { checkLinePrice } from './price-sanity';

/** One price learned from the tradie's records: exactly the fields the doc allows. */
export type PriceEntry = {
  item: string;
  quantity: number | null;
  unit: string;
  /** What the tradie pays per unit, ex GST. */
  unitPrice: number;
};

/** A stored row as the matcher needs it. */
export type PriceRow = PriceEntry & { priceDate: Date | string; id?: number; supplier?: string | null };

/** Where a quote line's price came from, shown as a badge on Review. */
export type PriceSource = 'yours' | 'estimate';

const UNIT_ALIASES: Record<string, string> = {
  'm²': 'm2', sqm: 'm2', 'sq m': 'm2', 'square metre': 'm2', 'square meter': 'm2', 'square metres': 'm2',
  'm³': 'm3', cum: 'm3', 'cubic metre': 'm3', 'cubic metres': 'm3',
  hrs: 'hr', hour: 'hr', hours: 'hr',
  each: 'ea', unit: 'ea', units: 'ea', pc: 'ea', pcs: 'ea', item: 'ea', '': 'ea',
  litre: 'l', litres: 'l', liter: 'l', liters: 'l', lt: 'l',
  lm: 'm', 'lin m': 'm', 'lineal m': 'm', 'lineal metre': 'm', 'linear m': 'm', 'linear metre': 'm', metre: 'm', metres: 'm',
  sheets: 'sheet', bags: 'bag', rolls: 'roll', boxes: 'box', lengths: 'length', tonnes: 'tonne', t: 'tonne',
};

export function unitKey(unit: unknown): string {
  const u = String(unit ?? '').trim().toLowerCase().replace(/\.$/, '');
  return UNIT_ALIASES[u] ?? u;
}

/** An item name for matching: lower case, punctuation and extra spaces ignored. */
export function itemKey(name: unknown): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[‑–—]/g, '-')
    .replace(/[^a-z0-9.×x\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const key = (item: unknown, unit: unknown) => `${itemKey(item)}|${unitKey(unit)}`;

const n = (v: unknown): number => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};
const cents = (x: number) => Math.round(x * 100) / 100;

const parse = (raw: unknown): any => {
  if (typeof raw !== 'string') return raw ?? null;
  try { return JSON.parse(raw); } catch { return null; }
};

const itemsOf = (doc: any): any[] => (Array.isArray(doc?.items) ? doc.items : []);
const isLabour = (it: any) => String(it?.category ?? '').toLowerCase() === 'labour';

/**
 * The prices a sent quote teaches, given every AI generation behind it.
 *
 * A sent material line counts when its figure is the tradie's:
 *  - it matches an AI line (same item and unit) but its figure is different:
 *    they corrected it; or
 *  - it matches no AI line (they added or renamed it) and its figure isn't one
 *    the AI gave for any line: a renamed AI line still carrying the AI's figure
 *    is the AI's guess with a new name, not their price.
 *
 * The figure is the line's cost when it has one. A line with no cost, where
 * only the sell price was changed, counts too: its cost is worked back from the
 * sell price at the quote's markup, price / (1 + markup), because the price
 * list holds what the tradie PAYS and storing a sell price would mark it up
 * twice next time.
 *
 * Never counted: labour (the charge-out rate lives in settings), lines pinned at
 * a price (markupLocked) and lines charged at cost (noMarkup), whose price says
 * nothing about a markup to undo. Figures the sanity check flags are held back.
 */
export function learnedPrices(aiResponses: unknown[], sentContent: unknown): PriceEntry[] {
  const doc = parse(sentContent);
  const sent = itemsOf(doc);
  const aiItems = aiResponses.flatMap((r) => itemsOf(parse(r)));
  if (!aiItems.length || !sent.length) return [];
  const markup = Math.max(0, n(doc?.markupPct));

  // What the AI gave, per item and overall: costs, and sell prices for lines
  // the tradie prices by sell price only.
  const byKey = new Map<string, { costs: number[]; prices: number[] }>();
  const aiCosts = new Set<number>();
  const aiPrices = new Set<number>();
  for (const it of aiItems) {
    const c = cents(n(it?.unitCost));
    const p = cents(n(it?.unitPrice));
    const k = key(it?.description, it?.unit);
    const e = byKey.get(k) ?? { costs: [], prices: [] };
    e.costs.push(c); e.prices.push(p);
    byKey.set(k, e);
    if (c > 0) aiCosts.add(c);
    if (p > 0) aiPrices.add(p);
  }

  const out = new Map<string, PriceEntry>();
  for (const it of sent) {
    if (isLabour(it) || it?.markupLocked || it?.noMarkup) continue;
    const item = String(it?.description ?? '').trim();
    if (!item) continue;
    const k = key(item, it?.unit);
    const ai = byKey.get(k);

    let cost = cents(n(it?.unitCost));
    if (cost > 0) {
      const yours = ai ? !ai.costs.includes(cost) : !aiCosts.has(cost);
      if (!yours) continue;
    } else {
      // Sell price only: count it if that price was changed, then work back to cost.
      const price = cents(n(it?.unitPrice));
      if (price <= 0) continue;
      const yours = ai ? !ai.prices.includes(price) : !aiPrices.has(price);
      if (!yours) continue;
      cost = cents(price / (1 + markup / 100));
      if (cost <= 0) continue;
    }

    if (checkLinePrice({ description: item, unitPrice: cost, unit: it?.unit })) continue;
    const qty = n(it?.quantity);
    out.set(k, { item, quantity: qty > 0 ? qty : null, unit: String(it?.unit ?? 'ea').trim() || 'ea', unitPrice: cost });
  }
  return [...out.values()];
}

/** The newest row per item and unit. */
export function newestPrices<R extends PriceRow>(rows: R[]): Map<string, R> {
  const best = new Map<string, R>();
  const t = (r: R) => new Date(r.priceDate).getTime() || 0;
  for (const r of rows) {
    const k = key(r.item, r.unit);
    const cur = best.get(k);
    if (!cur || t(r) > t(cur) || (t(r) === t(cur) && (r.id ?? 0) > (cur.id ?? 0))) best.set(k, r);
  }
  return best;
}

/** The tradie's price for a line, if their list has the same item in the same unit. */
export function priceFor<R extends PriceRow>(list: Map<string, R>, line: { description?: unknown; unit?: unknown }): R | undefined {
  return list.get(key(line.description, line.unit));
}

/**
 * Put the tradie's own prices on an AI quote's material lines, and mark every
 * material line with where its price came from. A matched line takes their
 * price as its cost, sold at the quote's markup; anything else stays the AI's
 * figure, marked "estimate". Labour lines are left alone (priced from settings).
 */
export function applyPriceList<I extends Record<string, any>, R extends PriceRow>(
  items: I[],
  list: Map<string, R>,
  markupPercent: number,
): I[] {
  return applyPriceMatches(items, items.map((it) => {
    const mine = isLabour(it) ? undefined : priceFor(list, it);
    return mine ? { row: mine, factor: 1 } : undefined;
  }), markupPercent);
}

/**
 * The same, with the matching engine's answer per line (pricing step 4): the
 * tradie's price row a line matched, and how many of that row's unit one of
 * the line's units is. Their price per the LINE's unit is the row's price ×
 * factor (a 6 m bar at $2.48/m is $14.88 a length). Lines with no match stay
 * the AI's figure, marked "estimate". Labour is left alone.
 */
export function applyPriceMatches<I extends Record<string, any>, R extends PriceRow>(
  items: I[],
  matches: ({ row: R; factor: number } | undefined)[],
  markupPercent: number,
): I[] {
  return items.map((it, i) => {
    if (isLabour(it)) return it;
    const m = matches[i];
    if (!m || !(m.factor > 0)) return { ...it, priceSource: 'estimate' as PriceSource };
    const cost = cents(m.row.unitPrice * m.factor);
    return {
      ...it,
      unitCost: cost,
      unitPrice: cents(cost * (1 + n(markupPercent) / 100)),
      costUnknown: false,
      priceNote: undefined, // the sanity note was about the AI's figure
      priceSource: 'yours' as PriceSource,
      priceDate: new Date(m.row.priceDate).toISOString(),
      // Where they bought it, when a receipt taught it: "your price, Reece, 3 weeks ago".
      ...(m.row.supplier ? { priceSupplier: m.row.supplier } : {}),
    };
  });
}

/** "today", "3 days ago", "3 weeks ago", "2 months ago", "over a year ago". */
export function priceAge(date: Date | string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}
