/**
 * The matching engine (docs/pricing-design.md, Build order step 4, part 2).
 *
 * One job: take a messy line ("SL82 MESH 6X2.4", "EA") and answer "which of this
 * tradie's items is this, in what unit, and how many of that unit is one of
 * these?". Used by receipts now; quotes and learning from edits use it too
 * (part 5), and Share to Vargen and email import later.
 *
 * In order, cheapest first:
 *  1. Remembered: the tradie confirmed this exact line (tidied) before, from this
 *     supplier (else any supplier). No AI.
 *  2. Plain: same item name after tidying, in a unit that converts for certain.
 *     No AI.
 *  3. AI suggestion: one call per batch of unmatched lines (made on the server),
 *     choosing ONLY from the candidates it's given, never writing a price. A
 *     suggestion is used automatically only when it's confident AND the unit is
 *     the same or converts for certain (KNOWN conversions below; never the AI's
 *     own number). Anything else is "unsure", for the tradie to sort.
 *
 * Pure (imports only other pure shared files); tested in matcher.test.ts.
 */
import { itemKey, unitKey } from './price-list';

/** Something a line can match: an item in the tradie's price list or their trade's catalogue. */
export type Candidate = { item: string; unit: string };

/** A match the tradie confirmed (or a confident AI match that was applied), per tradie. */
export type Remembered = {
  lineKey: string;
  supplierKey: string;
  /** The matched item, or null when the tradie said "not a material, ignore it". */
  item: string | null;
  unit: string | null;
  /** How many of the item's unit one of the line's units is. */
  factor: number | null;
  ignore: boolean;
};

export type MatchInput = { text: string; unit?: string | null; supplier?: string | null };

export type Guess = { item: string; unit: string; factor: number | null; aiFactor: number | null };

export type Match =
  | { kind: 'matched'; item: string; unit: string; factor: number; via: 'remembered' | 'plain' | 'ai' }
  | { kind: 'ignore'; via: 'remembered' | 'ai' }
  | { kind: 'unsure'; reason: 'low_confidence' | 'unit' | 'no_candidate' | 'ai_unavailable'; guess?: Guess }
  | { kind: 'needs_ai' };

export type AiSuggestion = {
  /** Index into the candidate list, or null for none. */
  candidate: number | null;
  category: 'material' | 'not_a_material' | 'unsure';
  /** 0 to 1. */
  confidence: number;
  /** The AI's idea of a conversion: shown to the tradie as a hint, never applied on its own. */
  conversion: number | null;
};

/**
 * Applied without asking only at this confidence or above. 0.85: the model's
 * confidence isn't calibrated, and most of what it reports as 0.7–0.8 is
 * "plausible, same family" (SL72 for SL82, a 90×45 for a 70×35). A wrong
 * automatic match quietly mis-prices every later quote, while a right one sent
 * to the list costs the tradie one tap, so the bar is high on purpose.
 */
export const AUTO_ACCEPT_CONFIDENCE = 0.85;

// ── Tidying ──────────────────────────────────────────────────────────────────

export const lineKey = (text: unknown) => itemKey(text);
export const supplierKey = (s: unknown) => itemKey(s);

/** Receipt unit spellings on top of the price list's own (shared/price-list unitKey). */
const RECEIPT_UNITS: Record<string, string> = {
  lgth: 'length', len: 'length', lth: 'length', lngth: 'length',
  pce: 'ea', pcs: 'ea', pc: 'ea', no: 'ea', 'no.': 'ea', unit: 'ea',
  bx: 'box', pk: 'pack', pkt: 'pack', packs: 'pack', rl: 'roll', bg: 'bag', sht: 'sheet', pnl: 'panel',
  'per 1000': 'thousand', '1000': 'thousand', 'per thousand': 'thousand', thousand: 'thousand', m1000: 'thousand',
  kgs: 'kg', kilo: 'kg', kilos: 'kg', 'cu m': 'm3', 'cubic m': 'm3', m3: 'm3',
  lm: 'm', 'lin m': 'm', mtr: 'm', mtrs: 'm', 'lineal metre': 'm', 'lineal metres': 'm',
};

export function cleanUnit(unit: unknown): string {
  const raw = String(unit ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!raw) return 'ea';
  return RECEIPT_UNITS[raw] ?? unitKey(raw);
}

/** Units that count things: one sheet bought as "1 EA" is one sheet. */
const COUNT_UNITS = new Set(['ea', 'sheet', 'length', 'bag', 'roll', 'panel', 'box', 'tube', 'tub', 'pack', 'pair', 'set', 'piece', 'bottle', 'can', 'tin', 'pail', 'bucket']);

// ── Known unit conversions ──────────────────────────────────────────────────

/** "BOX 100", "PACK OF 10", "10PK", "100 PCS" → 100 / 10 / 10 / 100. */
function packSize(text: string): number | null {
  const t = text.toLowerCase();
  const m = t.match(/\b(?:box|pack|pk|pkt|bx)\s*(?:of\s*)?(\d{1,4})\b/) ?? t.match(/\b(\d{1,4})\s*(?:pack|pk|pkt|pcs|pce|pieces)\b/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 1 ? n : null;
}

/** "6X2.4" (metres) → 14.4 m². Both sides must look like metres (≤ 20), so "90X45" (mm) never reads as an area. */
function sheetArea(text: string): number | null {
  const m = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*m?\s*[x×]\s*(\d+(?:\.\d+)?)\s*m?\b/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  if (!(a > 0 && b > 0 && a <= 20 && b <= 20)) return null;
  return Math.round(a * b * 1000) / 1000;
}

/** "N12 BAR 6M", "PINE 90X45 4.8M" → 6 / 4.8 (metres; never millimetres). */
function lengthM(text: string): number | null {
  const m = text.toLowerCase().match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*m\b/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 30 ? n : null;
}

/** "RAPID SET CONCRETE 20KG" → 20. */
function weightKg(text: string): number | null {
  const m = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*kg\b/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * How many of `itemUnit` one `lineUnit` of this line is, when that's certain;
 * otherwise null (never a guess). The whole list:
 *  - the same unit (after tidying: "LM" = "lineal m" = "m", "EA" = "each") → 1
 *  - a pack/box of N ("BOX 100", "10PK") bought as a pack, item priced each → N
 *  - a sheet whose size is printed in metres ("6X2.4"), item priced per m² → 14.4
 *  - a length whose length is printed ("6M", "4.8M"), item priced per metre → 6 / 4.8
 *  - a bag whose weight is printed ("20KG"), item priced per kg → 20
 *  - kg ↔ tonne → 1/1000 / 1000; a "per 1000" line ↔ each → 1000 / 1/1000
 *  - any counting unit ↔ any counting unit (EA, sheet, length, bag, roll, panel,
 *    box, tube, pack, pair, set…) → 1: one sheet bought as "1 EA" is one sheet
 */
export function conversionFactor(text: string, lineUnit: unknown, itemUnit: unknown): number | null {
  const lu = cleanUnit(lineUnit);
  const iu = cleanUnit(itemUnit);
  const lineCounts = COUNT_UNITS.has(lu);
  if (iu === 'ea' && (lu === 'pack' || lu === 'box' || lu === 'ea')) {
    const n = packSize(text);
    if (n) return n;
  }
  if (lu === iu) return 1;
  if (lineCounts && iu === 'm2') return sheetArea(text);
  if (lineCounts && iu === 'm') return lengthM(text);
  if (lineCounts && iu === 'kg') return weightKg(text);
  if (lu === 'kg' && iu === 'tonne') return 0.001;
  if (lu === 'tonne' && iu === 'kg') return 1000;
  if (lu === 'thousand' && iu === 'ea') return 1000;
  if (lu === 'ea' && iu === 'thousand') return 0.001;
  if (lineCounts && COUNT_UNITS.has(iu)) return 1;
  return null;
}

/**
 * The conversion to use when the tradie sorts a line: a certain one if there is
 * one, else the number they typed for "How many [unit] is one of these?".
 * Null means we must ask.
 */
export function resolutionFactor(text: string, lineUnit: unknown, itemUnit: unknown, typed?: unknown): number | null {
  const known = conversionFactor(text, lineUnit, itemUnit);
  if (known) return known;
  const n = typeof typed === 'number' ? typed : Number(String(typed ?? '').trim());
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? n : null;
}

// ── Matching ─────────────────────────────────────────────────────────────────

/** Remembered, then plain. `needs_ai` when neither applies. */
export function localMatch(line: MatchInput, candidates: Candidate[], remembered: Remembered[]): Match {
  const lk = lineKey(line.text);
  if (!lk) return { kind: 'unsure', reason: 'no_candidate' };
  const sk = supplierKey(line.supplier);
  const mem = remembered.find((r) => r.lineKey === lk && r.supplierKey === sk) ?? remembered.find((r) => r.lineKey === lk);
  if (mem) {
    if (mem.ignore) return { kind: 'ignore', via: 'remembered' };
    if (mem.item && mem.unit) {
      const factor = mem.factor ?? conversionFactor(line.text, line.unit, mem.unit);
      if (factor && factor > 0) return { kind: 'matched', item: mem.item, unit: mem.unit, factor, via: 'remembered' };
    }
  }
  for (const c of candidates) {
    if (itemKey(c.item) !== lk) continue;
    const factor = conversionFactor(line.text, line.unit, c.unit);
    if (factor && factor > 0) return { kind: 'matched', item: c.item, unit: c.unit, factor, via: 'plain' };
  }
  return { kind: 'needs_ai' };
}

/** What to do with the AI's suggestion for one line. Never takes a price from the AI. */
export function decideAi(line: MatchInput, s: AiSuggestion | undefined, candidates: Candidate[]): Match {
  if (!s) return { kind: 'unsure', reason: 'ai_unavailable' };
  const sure = s.confidence >= AUTO_ACCEPT_CONFIDENCE;
  if (s.category === 'not_a_material' && sure) return { kind: 'ignore', via: 'ai' };
  const c = s.candidate != null ? candidates[s.candidate] : undefined;
  if (!c) return { kind: 'unsure', reason: s.category === 'material' && sure ? 'no_candidate' : 'low_confidence' };
  const factor = conversionFactor(line.text, line.unit, c.unit);
  const guess: Guess = { item: c.item, unit: c.unit, factor, aiFactor: s.conversion };
  if (s.category === 'material' && sure && factor) {
    return { kind: 'matched', item: c.item, unit: c.unit, factor, via: 'ai' };
  }
  return { kind: 'unsure', reason: s.category === 'material' && sure ? 'unit' : 'low_confidence', guess };
}

/** The candidates, deduplicated (same item and unit once), capped so a prompt stays small. */
export function dedupeCandidates(list: Candidate[], max = 250): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of list) {
    const k = `${itemKey(c.item)}|${cleanUnit(c.unit)}`;
    if (!c.item || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

// ── The AI call's text, and reading its answer (the call itself is on the server) ──

/**
 * The prompt for one batched matching call. Only line text, units and candidate
 * names and units go out: no customer, address, job or card data, no prices.
 */
export function matchPrompt(lines: MatchInput[], candidates: Candidate[]): { system: string; user: string } {
  const system = `You match lines from an Australian trade supplier's receipt or a quote to a tradie's own list of items.
For each line, choose the ONE candidate that is the same product, or null if none is. Never invent an item that isn't a candidate. Never give prices.
Return JSON only: {"matches":[{"line":0,"candidate":12,"category":"material","confidence":0.9,"unit":"sheet","conversion":null}]}
- "category": "material" for building/trade materials; "not_a_material" for fuel, food, drinks, tools, equipment hire, delivery or freight fees, cards, gift items; "unsure" if you can't tell.
- "confidence": 0 to 1, how sure you are the candidate is the same product (same type, size and spec). Be strict: a different size or grade is NOT the same product.
- "unit": the unit the line is sold in, if you can tell, else "".
- "conversion": how many of the candidate's unit one of the line's unit is, only if the line text makes it certain, else null.`;
  const user = JSON.stringify({
    lines: lines.map((l, i) => ({ line: i, text: l.text, unit: l.unit || '' })),
    candidates: candidates.map((c, i) => ({ candidate: i, item: c.item, unit: c.unit })),
  });
  return { system, user };
}

/** The AI's answer as one suggestion per line (undefined where it said nothing usable). */
export function parseAiMatches(raw: unknown, lineCount: number, candidateCount: number): (AiSuggestion | undefined)[] {
  let doc: any = raw;
  if (typeof raw === 'string') { try { doc = JSON.parse(raw); } catch { doc = null; } }
  const out: (AiSuggestion | undefined)[] = Array.from({ length: lineCount }, () => undefined);
  const list = Array.isArray(doc?.matches) ? doc.matches : [];
  for (const m of list) {
    const i = Number(m?.line);
    if (!Number.isInteger(i) || i < 0 || i >= lineCount || out[i]) continue;
    const cRaw = m?.candidate;
    const c = cRaw === null || cRaw === undefined || cRaw === '' ? null : Number(cRaw);
    const candidate = c != null && Number.isInteger(c) && c >= 0 && c < candidateCount ? c : null;
    const category = m?.category === 'material' || m?.category === 'not_a_material' ? m.category : 'unsure';
    const conf = Number(m?.confidence);
    const conv = Number(m?.conversion);
    out[i] = {
      candidate,
      category,
      confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0,
      conversion: Number.isFinite(conv) && conv > 0 ? conv : null,
    };
  }
  return out;
}
