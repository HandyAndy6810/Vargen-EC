/**
 * Scoring one generated quote against one job of the test set
 * (eval/model-eval-set.md, eval/jobs.json). Pure: no AI, no database, no files.
 * Tested in score.test.ts.
 *
 * It reads the quote exactly as the phone receives it from
 * /api/quotes/generate (items, questions, notes, summary, pricing), so it keeps
 * working when the step 6 trade templates change how that quote is built. Any
 * extra field the templates add (facts, flags, assumptions) is searched too.
 */
import { unitKey } from '../shared/price-list';
import { isHourlyUnit } from '../shared/labour-panel';
import type { EvalJob, Fact, ItemCheck, MustNotCheck, Term } from './types';

export type Quote = Record<string, any>;
export type Line = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  category: string;
  priceSource?: string;
};

/** What the quote was priced with (the generator returns it as `pricing`). */
export type PricingUsed = { labourRate: number | null; callOutFee: number; markupLabour?: boolean };

// ── Matching ────────────────────────────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reCache = new Map<string, RegExp>();

/** A term as a case-insensitive regular expression (see eval/types.ts). */
export function termRegex(term: Term): RegExp {
  let re = reCache.get(term);
  if (re) return re;
  if (term.startsWith('re:')) {
    re = new RegExp(term.slice(3), 'i');
  } else {
    const words = term.trim().split(/\s+/).map(escapeRe).join('[\\s\\-–]*');
    const startsWord = /^\w/.test(term.trim());
    const endsWord = /\w$/.test(term.trim());
    re = new RegExp(`${startsWord ? '\\b' : ''}${words}${endsWord ? '(?:s|es)?\\b' : ''}`, 'i');
  }
  reCache.set(term, re);
  return re;
}

export const matchesAny = (text: string, terms: Term[] | undefined): boolean =>
  !!terms?.length && terms.some((t) => termRegex(t).test(text));

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export function linesOf(quote: Quote): Line[] {
  const items = Array.isArray(quote?.items) ? quote.items : [];
  return items.map((it: any) => ({
    description: String(it?.description ?? it?.name ?? ''),
    quantity: num(it?.quantity),
    unit: String(it?.unit ?? ''),
    unitPrice: num(it?.unitPrice),
    category: String(it?.category ?? '').toLowerCase() === 'labour' ? 'labour' : 'material',
    priceSource: typeof it?.priceSource === 'string' ? it.priceSource : undefined,
    ...(it?.name && it?.description && it.name !== it.description ? { description: `${it.name} — ${it.description}` } : {}),
  }));
}

/** One line as the checks read it: "description | 2 sheet @ 100 | material". */
export const lineText = (l: Line) => `${l.description} | ${l.quantity} ${l.unit} @ ${l.unitPrice} | ${l.category}`;

const questionsOf = (quote: Quote): any[] => (Array.isArray(quote?.questions) ? quote.questions : []);
const questionText = (q: any) =>
  typeof q === 'string' ? q : [q?.q, q?.question, q?.assumption, ...(Array.isArray(q?.options) ? q.options : [])].filter(Boolean).join(' ');

const KNOWN_KEYS = new Set(['items', 'questions', 'pricing', 'generationId', 'subtotal', 'gstAmount', 'totalAmount', 'totalLabour', 'totalMaterials', 'estimatedHours']);
/** Everything the quote says, for "anywhere" checks. */
export function allText(quote: Quote): string {
  const parts = [
    ...linesOf(quote).map(lineText),
    ...questionsOf(quote).map(questionText),
  ];
  for (const [k, v] of Object.entries(quote ?? {})) {
    if (KNOWN_KEYS.has(k)) continue;
    parts.push(typeof v === 'string' ? v : JSON.stringify(v));
  }
  return parts.join('\n');
}

// ── Checks ──────────────────────────────────────────────────────────────────

export type Ctx = { pricing: PricingUsed };
export type CheckResult = {
  label: string;
  ok: boolean | null;
  /** The lines that met the check (for separate-task groups). */
  lines: number[];
  /** The lines that met its `alsoNeeds` half (e.g. the disposal line of "removal and disposal"). */
  alsoLines?: number[];
  why?: string;
};

/** The number `n` written in text, e.g. 8 → "8", "8.0"; 1.8 → "1.8", "1.80". */
function numberRe(n: number): string {
  const s = String(n);
  return `(?<![\\d.])${escapeRe(s)}${s.includes('.') ? '0*' : '(?:\\.0+)?'}(?![\\d])`;
}

function lineCandidates(check: ItemCheck, lines: Line[]): number[] {
  const out: number[] = [];
  lines.forEach((l, i) => {
    if (check.category && l.category !== check.category) return;
    const t = lineText(l);
    if (!matchesAny(t, check.synonyms)) return;
    if (check.unlessLine && matchesAny(t, check.unlessLine)) return;
    if (check.qty != null) {
      const qtyOk = Math.abs(l.quantity - check.qty) < 0.01 || new RegExp(`${numberRe(check.qty)}\\s*(?:x\\b|×)?`).test(l.description);
      if (!qtyOk) return;
    }
    out.push(i);
  });
  return out;
}

export function runCheck(check: ItemCheck, quote: Quote, ctx: Ctx): CheckResult {
  if (check.skipIfNoCallOut && !(ctx.pricing.callOutFee > 0)) {
    return { label: check.label, ok: null, lines: [], why: 'n/a: the call-out fee is off in settings (the generator removes call-out lines)' };
  }
  const where = check.where ?? 'items';
  if (where === 'questions') {
    const ok = questionsOf(quote).some((q) => matchesAny(questionText(q), check.synonyms));
    return { label: check.label, ok, lines: [] };
  }
  if (where === 'any') {
    const text = allText(quote);
    const ok = matchesAny(text, check.synonyms) && (!check.alsoNeeds || matchesAny(text, check.alsoNeeds));
    const lines = linesOf(quote);
    return { label: check.label, ok, lines: lineCandidates({ ...check, qty: undefined }, lines) };
  }
  const lines = linesOf(quote);
  const found = lineCandidates(check, lines);
  const alsoLines = check.alsoNeeds ? lines.flatMap((l, i) => (matchesAny(lineText(l), check.alsoNeeds) ? [i] : [])) : [];
  const also = !check.alsoNeeds || alsoLines.length > 0;
  return {
    label: check.label, ok: found.length > 0 && also, lines: found, alsoLines,
    ...(found.length && !also ? { why: 'only half of it' } : {}),
  };
}

/** Checks in the same group must be met by different lines: the largest set of checks that can be. */
function applyGroups(checks: ItemCheck[], results: CheckResult[]) {
  const groups = new Map<string, number[]>();
  checks.forEach((c, i) => { if (c.group && results[i].ok) groups.set(c.group, [...(groups.get(c.group) ?? []), i]); });
  for (const idxs of groups.values()) {
    // Maximum matching of checks to distinct lines (tiny, so plain augmenting paths).
    const owner = new Map<number, number>();
    const tryAssign = (ci: number, seen: Set<number>): boolean => {
      for (const line of results[ci].lines) {
        if (seen.has(line)) continue;
        seen.add(line);
        const o = owner.get(line);
        if (o == null || tryAssign(o, seen)) { owner.set(line, ci); return true; }
      }
      return false;
    };
    for (const ci of idxs) {
      if (!tryAssign(ci, new Set())) results[ci] = { ...results[ci], ok: false, why: 'not a separate line from the other tasks' };
    }
  }
}

export function runChecks(checks: ItemCheck[], quote: Quote, ctx: Ctx): CheckResult[] {
  const results = checks.map((c) => runCheck(c, quote, ctx));
  applyGroups(checks, results);
  return results;
}

export type MustNotResult = { label: string; failed: boolean; detail?: string };

export function runMustNot(check: MustNotCheck, quote: Quote, ctx: Ctx): MustNotResult {
  const lines = linesOf(quote);
  if (check.kind === 'noItems') {
    return { label: check.label, failed: lines.length > 0, detail: lines.length ? `${lines.length} line items` : undefined };
  }
  if (check.kind === 'unflaggedAssumedSize') {
    const sized = lines.filter((l) => ['m2', 'm', 'm3'].includes(unitKey(l.unit)));
    if (!sized.length) return { label: check.label, failed: false };
    const askedSize = questionsOf(quote).some((q) => matchesAny(questionText(q), check.synonyms));
    const saidAssumed = /\bassum/i.test(allText(quote));
    const failed = !(askedSize && saidAssumed);
    return {
      label: check.label, failed,
      detail: failed ? `prices ${sized.length} sized line(s) (e.g. "${sized[0].description}") ${askedSize ? 'without saying the size is assumed' : 'without asking the size'}` : undefined,
    };
  }
  const r = runCheck(check, quote, ctx);
  return { label: check.label, failed: !!r.ok, detail: r.ok ? r.lines.map((i) => lines[i].description).join('; ') || 'mentioned' : undefined };
}

// ── Facts ───────────────────────────────────────────────────────────────────

const UNIT_RE: Record<string, string> = {
  m2: '(?:m2|m²|sqm|sq\\.?\\s?m(?:etres?|eters?)?|square\\s?met(?:re|er)s?)(?![\\w³])',
  m3: '(?:m3|m³|cum|cubic\\s?met(?:re|er)s?)(?![\\w²])',
  mm: '(?:mm|millimet(?:re|er)s?)\\b',
  m: '(?:m|lm|l/m|lin\\.?\\s?m|lineal\\s?met\\w*|linear\\s?met\\w*|met(?:re|er)s?)(?![\\w²³])',
  l: '(?:l|lt|ltr|litres?|liters?)(?![\\w])',
};

export function factFound(fact: Fact, quote: Quote): boolean {
  const text = allText(quote);
  if (fact.text && matchesAny(text, fact.text)) return true;
  for (const n of fact.numbers ?? []) {
    const unit = n.unit.toLowerCase();
    const known = UNIT_RE[unitKey(unit)] ?? UNIT_RE[unit];
    const tol = Math.max(0.01, Math.abs(n.value) * 0.01);
    // A line with that quantity, in that unit (or of that item).
    for (const l of linesOf(quote)) {
      if (Math.abs(l.quantity - n.value) > tol) continue;
      if (known ? unitKey(l.unit) === unitKey(unit) : matchesAny(l.description, [unit])) return true;
    }
    // Or the number written next to its unit or item.
    const after = known
      ? `\\s*${known}`
      : `\\s*(?:x\\s*|×\\s*)?(?:[a-z][\\w\\-]*\\s+){0,2}?${escapeRe(unit)}(?:s|es)?\\b`;
    if (new RegExp(numberRe(n.value) + after, 'i').test(text)) return true;
  }
  return false;
}

// ── Trades ──────────────────────────────────────────────────────────────────

type TradeRule = { terms: Term[]; unless?: Term[]; /** Never counted as invented (it shows up inside other trades' work). */ neverExtra?: boolean };

export const TRADES: Record<string, TradeRule> = {
  concreting: {
    terms: ['concrete', 'premix', 'pre-mix', 'slab', 'formwork', 'reinforcing mesh', 're:\\bSL\\d{2}\\b', 'screed', 'exposed aggregate', 'saw cut', 'bar chair', 're:\\bpour(ing)?\\b'],
    unless: ['post', 'fence', 'fencing', 'paling', 'postmix', 'post mix', 'rapid set', 'rapidset', 'stump', 'pier'],
  },
  plumbing: {
    terms: ['plumb', 'plumbing', 'plumber', 'tap', 'mixer', 'toilet', 'cistern', 'drain', 'drainage', 'pipe', 'pipework', 'hot water', 'HWS', 'tempering valve', 'relief valve', 'vanity', 'basin', 'sink', 'trough', 'laundry tub', 'sewer', 'flexi hose', 'water supply', 'water heater', 'rough-in', 'fit-off'],
    unless: ['waterproof', 'membrane', 're:\\btil(e|es|ing)\\b', 'strip drain', 'ag pipe', 'agi pipe', 'conduit', 'concrete mixer', 'cement mixer'],
  },
  electrical: {
    terms: ['electrical', 'electrician', 'downlight', 'down light', 'lighting', 're:\\blights\\b', 're:\\b(wall|outdoor|exterior|sensor|flood|spot|LED|pendant|ceiling)\\s?lights?\\b', 're:\\blight (fitting|fittings|point|points)\\b', 'GPO', 'power point', 'powerpoint', 'switchboard', 'circuit', 'RCD', 'RCBO', 'circuit breaker', 'safety switch', 'cabling', 'wiring', 'exhaust fan', 're:\\bcable\\b'],
    unless: ['hot water', 'HWS', 'water heater', 'cylinder'],
  },
  fencing: { terms: ['fence', 'fencing', 'colorbond', 'paling', 'plinth', 'fence post'] },
  landscaping: { terms: ['turf', 'lawn', 'grass', 'sod', 'topsoil', 'top soil', 'underlay', 'mulch', 'landscap', 'garden bed', 'soil prep'] },
  carpentry: {
    terms: ['carpentry', 'carpenter', 'deck', 'decking', 'joist', 'bearer', 'timber frame', 'framing', 'balustrade', 'merbau', 'door', 'hinge', 'cabinet', 'cabinetry', 'joinery', 'cupboard', 're:\\bstuds?\\b'],
    unless: ['formwork', 'form work', 'boxing', 'pegs', 're:\\bforms?\\b', 'shower screen', 'vanity'],
  },
  tiling: { terms: ['re:\\btil(e|es|ing|er)\\b', 'grout'] },
  waterproofing: {
    terms: ['waterproof', 'waterproofing', 'membrane'],
    unless: ['re:vapou?r', 'polythene', 'plastic', 'builders film', 'builder\'s film', 'under slab', 'under-slab', 'DPM', 'damp proof'],
  },
  demolition: {
    terms: ['demolition', 'demolish', 'strip out', 'strip-out', 'rip out', 're:\\bgut(ting)?\\b', 're:\\b(remov|break|strip)\\w*\\b[^|]*\\b(existing|old)\\b'],
    neverExtra: true,
  },
  handyman: { terms: ['handyman', 'picture', 'hinge', 'sticking door', 'odd job', 'general maintenance', 're:\\bhang\\w*\\b'], neverExtra: true },
};

export function tradesIn(quote: Quote): string[] {
  const lines = linesOf(quote).map(lineText);
  return Object.entries(TRADES)
    .filter(([, rule]) => lines.some((t) => matchesAny(t, rule.terms) && !matchesAny(t, rule.unless)))
    .map(([name]) => name);
}

// ── Prices and claims ───────────────────────────────────────────────────────

const CALL_OUT = /call.?out|site.?visit|travel.?fee|call.?in|mobilisation/i;

export type PriceOrigin = 'price list' | 'estimate' | 'settings' | 'no price' | 'invented';

/** Where a line's price came from, and if it's invented, why that counts. */
export function priceOrigin(l: Line, pricing: PricingUsed): { origin: PriceOrigin; why?: string } {
  if (l.unitPrice === 0) return { origin: 'no price' };
  if (l.priceSource === 'yours') return { origin: 'price list' };
  if (l.priceSource === 'estimate' || /\bestimate\b/i.test(l.description)) return { origin: 'estimate' };
  if (CALL_OUT.test(l.description) && pricing.callOutFee > 0 && Math.abs(l.unitPrice - pricing.callOutFee) < 0.005) return { origin: 'settings' };
  if (l.category === 'labour') {
    if (isHourlyUnit(l.unit)) {
      if (pricing.labourRate && Math.abs(l.unitPrice - pricing.labourRate) < 0.005) return { origin: 'settings' };
      return { origin: 'invented', why: pricing.labourRate ? 'hourly labour not at the saved charge-out rate' : 'hourly labour at a rate the model chose (no charge-out rate in settings)' };
    }
    return { origin: 'invented', why: `labour priced as a lump sum by the model (unit "${l.unit || 'none'}"), not from the charge-out rate, not marked estimate` };
  }
  return { origin: 'invented', why: 'material line with no price source (not from the price list, not marked estimate)' };
}

/** Phrases that claim the work meets a standard. The quote must leave that to "by others" flags. */
export const COMPLIANCE_PATTERNS: RegExp[] = [
  /\b(?:complies|comply|complying|compliant|in compliance)\s+(?:fully\s+)?(?:with|to)\b/i,
  /\bmeets?\s+(?:all\s+)?(?:the\s+)?(?:requirements\s+of\s+)?(?:AS|AS\/NZS|NCC|BCA|Australian\s+Standards?)\b/i,
  /\bin\s+accordance\s+with\s+(?:the\s+)?(?:AS|AS\/NZS|NCC|BCA|Australian\s+Standards?)\b/i,
  /\b(?:certified|guaranteed)\s+to\s+(?:AS|AS\/NZS|NCC|BCA)\b/i,
];

export function complianceClaims(quote: Quote): string[] {
  const out: string[] = [];
  // Line by line, so the quoted context is the sentence the claim is in.
  for (const line of allText(quote).split('\n')) {
    for (const re of COMPLIANCE_PATTERNS) {
      for (const m of line.matchAll(new RegExp(re.source, 'gi'))) {
        const at = m.index ?? 0;
        const from = Math.max(0, line.lastIndexOf('.', at) + 1, at - 60);
        out.push(line.slice(from, at + m[0].length + 60).replace(/\s+/g, ' ').trim());
      }
    }
  }
  return out;
}

// ── Labour ──────────────────────────────────────────────────────────────────

export function labourOf(quote: Quote): { hours: number; dollars: number } {
  const lab = linesOf(quote).filter((l) => l.category === 'labour');
  return {
    hours: lab.filter((l) => isHourlyUnit(l.unit)).reduce((s, l) => s + l.quantity, 0),
    dollars: lab.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
  };
}

export const subtotalOf = (quote: Quote) => Math.round(linesOf(quote).reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;

// ── One run ─────────────────────────────────────────────────────────────────

export type RunScore = {
  mustHave: CheckResult[];
  mustHavePass: boolean | null;
  shouldHave: CheckResult[];
  shouldFound: number;
  shouldTotal: number;
  mustNot: MustNotResult[];
  mustNotPass: boolean;
  trades: { expected: string[]; detected: string[]; missing: string[]; extra: string[]; pass: boolean };
  facts: { label: string; ok: boolean }[];
  factsPass: boolean | null;
  questions: { count: number; rawCount: number; list: string[]; askedWhenShouldnt: boolean; tooMany: boolean; keyCovered: boolean | null; score: number };
  invented: { line: string; why: string }[];
  compliance: string[];
  hardFail: boolean;
  hardFailReasons: string[];
  labour: { hours: number; dollars: number };
  subtotal: number;
  lines: (Line & { origin: PriceOrigin })[];
  unmatchedLines: string[];
};

/** How many questions the model asked before the generator capped them at 3. */
export function rawQuestionCount(raw: string | undefined, fallback: number): number {
  try {
    const p = JSON.parse(raw ?? '');
    return Array.isArray(p?.questions) ? p.questions.filter((q: any) => q && (typeof q === 'string' || typeof q.q === 'string')).length : fallback;
  } catch { return fallback; }
}

export function scoreRun(job: EvalJob, quote: Quote, pricing: PricingUsed, raw?: string): RunScore {
  const ctx: Ctx = { pricing };
  const lines = linesOf(quote);

  const mustHave = runChecks(job.mustHave, quote, ctx);
  const applicable = mustHave.filter((r) => r.ok !== null);
  const shouldHave = runChecks(job.shouldHave, quote, ctx);
  const mustNot = job.mustNot.map((c) => runMustNot(c, quote, ctx));

  const detected = tradesIn(quote);
  const allowed = new Set([...job.expectedTrades, ...(job.optionalTrades ?? [])]);
  const missing = job.expectedTrades.filter((t) => !detected.includes(t));
  const extra = detected.filter((t) => !allowed.has(t) && !TRADES[t]?.neverExtra);

  const facts = job.expectedFacts.map((f) => ({ label: f.label, ok: factFound(f, quote) }));

  const qs = questionsOf(quote);
  const count = qs.length;
  const rawCount = rawQuestionCount(raw, count);
  const keyCovered = job.keyQuestion ? qs.some((q) => matchesAny(questionText(q), job.keyQuestion!.synonyms)) : null;
  const askedWhenShouldnt = job.expectNoQuestions && count > 0;
  const tooMany = rawCount > 3;
  const parts = [!tooMany, ...(job.expectNoQuestions ? [!askedWhenShouldnt] : []), ...(keyCovered === null ? [] : [keyCovered])];

  const withOrigin = lines.map((l) => ({ ...l, ...priceOrigin(l, pricing) }));
  const invented = withOrigin.filter((l) => l.origin === 'invented').map((l) => ({ line: l.description, why: l.why ?? '' }));
  const compliance = complianceClaims(quote);
  const hardFailReasons = [
    ...(invented.length ? [`invented price on ${invented.length} line(s)`] : []),
    ...(compliance.length ? [`compliance claim: "${compliance[0]}"`] : []),
  ];

  const used = new Set<number>();
  for (const r of [...mustHave, ...shouldHave, ...(job.pairWith?.compare ?? []).map((c) => runCheck(c, quote, ctx))]) {
    r.lines.forEach((i) => used.add(i));
    r.alsoLines?.forEach((i) => used.add(i));
  }

  return {
    mustHave,
    mustHavePass: applicable.length ? applicable.every((r) => r.ok) : null,
    shouldHave,
    shouldFound: shouldHave.filter((r) => r.ok).length,
    shouldTotal: shouldHave.filter((r) => r.ok !== null).length,
    mustNot,
    mustNotPass: mustNot.every((r) => !r.failed),
    trades: { expected: job.expectedTrades, detected, missing, extra, pass: !missing.length && !extra.length },
    facts,
    factsPass: facts.length ? facts.every((f) => f.ok) : null,
    questions: {
      count, rawCount, list: qs.map((q) => (typeof q === 'string' ? q : String(q?.q ?? ''))),
      askedWhenShouldnt, tooMany, keyCovered, score: parts.filter(Boolean).length / parts.length,
    },
    invented,
    compliance,
    hardFail: hardFailReasons.length > 0,
    hardFailReasons,
    labour: labourOf(quote),
    subtotal: subtotalOf(quote),
    lines: withOrigin.map(({ why: _why, ...l }) => l),
    unmatchedLines: lines.filter((_, i) => !used.has(i)).map((l) => l.description),
  };
}

// ── Across runs ─────────────────────────────────────────────────────────────

const STOP = new Set(['and', 'the', 'for', 'with', 'per', 'labour', 'supply', 'install', 'of', 'to', 'x']);
const tokens = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)));
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
};

/** How alike two runs' line items are, 0 to 1: lines paired by wording (half their words shared). */
export function lineSimilarity(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 1;
  const ta = a.map(tokens);
  const tb = b.map(tokens);
  const taken = new Set<number>();
  let matched = 0;
  for (const x of ta) {
    let best = -1; let bestScore = 0.5;
    tb.forEach((y, j) => { if (taken.has(j)) return; const s = jaccard(x, y); if (s >= bestScore) { best = j; bestScore = s; } });
    if (best >= 0) { taken.add(best); matched++; }
  }
  return (2 * matched) / (a.length + b.length);
}

/** Consistency across the runs of one job: line likeness (mean over pairs) and how far the totals spread. */
export function consistency(runs: { lines: string[]; subtotal: number }[]): { lineSimilarity: number | null; totalSpreadPct: number | null } {
  if (runs.length < 2) return { lineSimilarity: null, totalSpreadPct: null };
  const sims: number[] = [];
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) sims.push(lineSimilarity(runs[i].lines, runs[j].lines));
  const totals = runs.map((r) => r.subtotal);
  const mean = totals.reduce((s, t) => s + t, 0) / totals.length;
  return {
    lineSimilarity: sims.reduce((s, x) => s + x, 0) / sims.length,
    totalSpreadPct: mean > 0 ? ((Math.max(...totals) - Math.min(...totals)) / mean) * 100 : null,
  };
}

/** The hours pair (C4/C5): the larger job's labour against the smaller's. Hours where both have them, else dollars. */
export function hoursPair(larger: { hours: number; dollars: number }, smaller: { hours: number; dollars: number }) {
  const byHours = larger.hours > 0 && smaller.hours > 0;
  const a = byHours ? larger.hours : larger.dollars;
  const b = byHours ? smaller.hours : smaller.dollars;
  const ratio = b > 0 ? a / b : null;
  return {
    measure: byHours ? 'hours' as const : 'dollars' as const,
    larger: a, smaller: b, ratio,
    pass: a > b,
    /** Setup time doesn't triple: an exact 3× suggests labour was just scaled with the length. */
    blindTriple: ratio != null && ratio >= 2.9 && ratio <= 3.1,
  };
}

export const quoteCostUsd = (usage: { promptTokens: number; completionTokens: number }, price: { input: number; output: number } | null) =>
  price ? (usage.promptTokens * price.input + usage.completionTokens * price.output) / 1_000_000 : null;
