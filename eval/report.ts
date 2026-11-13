/**
 * The scorecard: per-model totals and the markdown a person reads. Pure (no
 * files, no AI): run.ts gathers the runs, this turns them into numbers and text.
 * Tested in report.test.ts.
 */
import { consistency, hoursPair, type RunScore } from './score';
import type { EvalJob, EvalModel } from './types';

export type RunRecord = {
  model: string;
  job: string;
  run: number;
  ok: boolean;
  error?: string;
  /** Rate-limit waits before this run got through (each one is also logged). */
  rateLimitRetries: number;
  quote?: Record<string, any>;
  raw?: string;
  pricing?: Record<string, unknown>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; calls: unknown[] };
  timing?: { totalMs: number; generationMs: number };
  costUsd?: number | null;
  score?: RunScore;
};

export type ModelEntry = Pick<EvalModel, 'label' | 'model' | 'provider' | 'pricePerMillion' | 'verified' | 'priceSource'> & {
  status: 'ran' | 'skipped';
  skipReason?: string;
};

export type Results = {
  startedAt: string;
  finishedAt: string;
  gitCommit: string | null;
  runsPerJob: number;
  database: string;
  settings: Record<string, unknown>;
  priceListRows: number;
  rememberedMatches: number;
  pastQuotesUsed: number;
  models: ModelEntry[];
  jobs: EvalJob[];
  runs: RunRecord[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const rate = (xs: (boolean | null | undefined)[]) => {
  const v = xs.filter((x): x is boolean => typeof x === 'boolean');
  return v.length ? v.filter(Boolean).length / v.length : null;
};

export type PairResult = { model: string; run: number; measure: string; larger: number; smaller: number; ratio: number | null; pass: boolean; blindTriple: boolean };

export function pairResults(results: Results, model: string): PairResult[] {
  const out: PairResult[] = [];
  for (const job of results.jobs) {
    if (job.pairWith?.role !== 'larger') continue;
    const mine = results.runs.filter((r) => r.model === model && r.job === job.id && r.score);
    for (const r of mine) {
      const other = results.runs.find((o) => o.model === model && o.job === job.pairWith!.job && o.run === r.run && o.score);
      if (!other) continue;
      out.push({ model, run: r.run, ...hoursPair(r.score!.labour, other.score!.labour) });
    }
  }
  return out;
}

export type ModelSummary = {
  label: string;
  runs: number;
  errors: number;
  hardFails: number;
  inventedPriceRuns: number;
  complianceRuns: number;
  mustHaveRate: number | null;
  shouldAvg: number | null;
  mustNotRate: number | null;
  tradesRate: number | null;
  factsRate: number | null;
  questionScore: number | null;
  lineConsistency: number | null;
  totalSpreadPct: number | null;
  pairPassRate: number | null;
  pairRatio: number | null;
  costPerQuoteUsd: number | null;
  secondsPerQuote: number | null;
  rateLimitRetries: number;
  inventedReasons: Record<string, number>;
};

export function summarise(results: Results, model: string): ModelSummary {
  const runs = results.runs.filter((r) => r.model === model);
  const scored = runs.filter((r) => r.score);
  const s = scored.map((r) => r.score!);
  const perJob = results.jobs.map((j) => consistency(runs.filter((r) => r.job === j.id && r.score).map((r) => ({
    lines: r.score!.lines.map((l) => l.description), subtotal: r.score!.subtotal,
  }))));
  const pairs = pairResults(results, model);
  const inventedReasons: Record<string, number> = {};
  for (const sc of s) for (const i of sc.invented) {
    const key = i.why.replace(/\s*\(unit "[^"]*"\)/, '').replace(/\s+/g, ' ').trim();
    inventedReasons[key] = (inventedReasons[key] ?? 0) + 1;
  }
  const costs = runs.map((r) => r.costUsd).filter((c): c is number => typeof c === 'number');
  return {
    label: model,
    runs: runs.length,
    errors: runs.filter((r) => !r.ok).length,
    // A run that failed outright can't be shown to have passed either.
    hardFails: runs.filter((r) => !r.ok || r.score?.hardFail).length,
    inventedPriceRuns: s.filter((x) => x.invented.length).length,
    complianceRuns: s.filter((x) => x.compliance.length).length,
    mustHaveRate: rate(s.map((x) => x.mustHavePass)),
    shouldAvg: mean(s.filter((x) => x.shouldTotal > 0).map((x) => x.shouldFound / x.shouldTotal)),
    mustNotRate: rate(s.map((x) => x.mustNotPass)),
    tradesRate: rate(s.map((x) => x.trades.pass)),
    factsRate: rate(s.map((x) => x.factsPass)),
    questionScore: mean(s.map((x) => x.questions.score)),
    lineConsistency: mean(perJob.map((c) => c.lineSimilarity).filter((x): x is number => x != null)),
    totalSpreadPct: mean(perJob.map((c) => c.totalSpreadPct).filter((x): x is number => x != null)),
    pairPassRate: rate(pairs.map((p) => p.pass)),
    pairRatio: mean(pairs.map((p) => p.ratio).filter((x): x is number => x != null)),
    costPerQuoteUsd: costs.length === scored.length && costs.length ? mean(costs) : null,
    secondsPerQuote: mean(scored.map((r) => (r.timing?.totalMs ?? 0) / 1000)),
    rateLimitRetries: runs.reduce((n, r) => n + r.rateLimitRetries, 0),
    inventedReasons,
  };
}

// ── Markdown ────────────────────────────────────────────────────────────────

const pct = (x: number | null) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);
const money = (x: number) => `$${x.toFixed(2)}`;
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const yn = (b: boolean | null) => (b == null ? 'n/a' : b ? 'yes' : 'no');

export function scorecard(results: Results): string {
  const ran = results.models.filter((m) => m.status === 'ran');
  const sums = ran.map((m) => summarise(results, m.label));
  const out: string[] = [];
  out.push(`# Model scorecard, ${results.startedAt.slice(0, 16).replace('T', ' ')} UTC`, '');
  out.push(`${results.jobs.length} jobs × ${results.runsPerJob} run(s) per model, through the same generator the app uses (server/lib/generate-quote.ts), sequentially. Nothing was saved.`, '');
  out.push(`- Database: ${results.database} (read only: settings, price list, remembered matches, past quotes)`);
  out.push(`- Settings used: ${Object.entries(results.settings).map(([k, v]) => `${k} ${v ?? 'not set'}`).join(', ')}`);
  out.push(`- Price list rows: ${results.priceListRows}; remembered matches: ${results.rememberedMatches}; past quotes used as examples: ${results.pastQuotesUsed}`);
  if (results.gitCommit) out.push(`- Code: ${results.gitCommit}`);
  for (const m of results.models.filter((x) => x.status === 'skipped')) out.push(`- **Skipped ${m.label}** (${m.model}): ${m.skipReason}`);
  const unverified = ran.filter((m) => !m.verified);
  if (unverified.length) out.push(`- Prices not checked against the provider's own page for: ${unverified.map((m) => m.label).join(', ')}. See models.json.`);
  out.push('');

  out.push('## Summary', '');
  out.push('Hard fails are runs with an invented price or a compliance claim (or a run that failed outright). Should have is logged, not pass or fail. Consistency is how alike the line items are across the runs of a job; spread is how far the totals moved.', '');
  out.push('| Model | Runs | Errors | Hard fails | Must have | Should have (avg) | Must not | Trades | Facts | Questions | Consistency | Total spread | Hours pair (C5 > C4) | Cost / quote | Sec / quote |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of sums) {
    const cost = s.costPerQuoteUsd == null ? 'n/a' : `$${s.costPerQuoteUsd.toFixed(4)} (${(s.costPerQuoteUsd * 100).toFixed(2)}¢)`;
    out.push(`| ${s.label} | ${s.runs} | ${s.errors} | ${s.hardFails} | ${pct(s.mustHaveRate)} | ${pct(s.shouldAvg)} | ${pct(s.mustNotRate)} | ${pct(s.tradesRate)} | ${pct(s.factsRate)} | ${pct(s.questionScore)} | ${pct(s.lineConsistency)} | ${s.totalSpreadPct == null ? 'n/a' : `${Math.round(s.totalSpreadPct)}%`} | ${pct(s.pairPassRate)}${s.pairRatio ? ` (×${s.pairRatio.toFixed(2)})` : ''} | ${cost} | ${s.secondsPerQuote == null ? 'n/a' : s.secondsPerQuote.toFixed(1)} |`);
  }
  out.push('');

  out.push('## Hard fails by reason', '');
  for (const s of sums) {
    out.push(`**${s.label}**: ${s.inventedPriceRuns} run(s) with an invented price, ${s.complianceRuns} with a compliance claim, ${s.errors} failed outright${s.rateLimitRetries ? `; ${s.rateLimitRetries} rate-limit wait(s)` : ''}.`);
    for (const [why, n] of Object.entries(s.inventedReasons).sort((a, b) => b[1] - a[1])) out.push(`- ${n} line(s): ${why}`);
    const claims = results.runs.filter((r) => r.model === s.label && r.score?.compliance.length).slice(0, 3);
    for (const r of claims) out.push(`- ${r.job} run ${r.run}: "${cell(r.score!.compliance[0])}"`);
    const errs = results.runs.filter((r) => r.model === s.label && !r.ok).slice(0, 5);
    for (const r of errs) out.push(`- ${r.job} run ${r.run} failed: ${cell(r.error ?? '')}`);
    out.push('');
  }

  out.push('## Hours pair (C4 path 15 m, C5 path 45 m)', '');
  out.push('| Model | Run | Measure | C4 | C5 | Ratio | C5 more? | Blind 3×? |', '|---|---|---|---|---|---|---|---|');
  for (const m of ran) for (const p of pairResults(results, m.label)) {
    const f = (x: number) => (p.measure === 'hours' ? `${x} h` : money(x));
    out.push(`| ${m.label} | ${p.run} | ${p.measure} | ${f(p.smaller)} | ${f(p.larger)} | ${p.ratio == null ? 'n/a' : `×${p.ratio.toFixed(2)}`} | ${yn(p.pass)} | ${yn(p.blindTriple)} |`);
  }
  out.push('');

  out.push('## Per job', '');
  for (const job of results.jobs) {
    out.push(`### ${job.id}. ${job.title}`, '', `> ${job.text}`, '');
    if (job.note) out.push(`_${job.note}_`, '');
    out.push('| Model | Run | Must have | Must not | Trades | Facts | Questions | Hard fail | Subtotal (ex GST) |', '|---|---|---|---|---|---|---|---|---|');
    for (const m of ran) for (const r of results.runs.filter((x) => x.model === m.label && x.job === job.id)) {
      if (!r.score) { out.push(`| ${m.label} | ${r.run} | error: ${cell(r.error ?? '')} | | | | | yes | |`); continue; }
      const s = r.score;
      const missing = s.mustHave.filter((c) => c.ok === false).map((c) => c.label);
      const mh = s.mustHavePass == null ? 'n/a' : s.mustHavePass ? 'pass' : `missing: ${missing.join('; ')}`;
      const mn = s.mustNotPass ? 'pass' : `has: ${s.mustNot.filter((x) => x.failed).map((x) => `${x.label} (${x.detail ?? ''})`).join('; ')}`;
      const tr = s.trades.pass ? s.trades.detected.join(', ') || 'none' : [s.trades.missing.length ? `missing ${s.trades.missing.join(', ')}` : '', s.trades.extra.length ? `extra ${s.trades.extra.join(', ')}` : ''].filter(Boolean).join('; ');
      const fa = s.factsPass == null ? 'n/a' : s.factsPass ? 'pass' : `missing: ${s.facts.filter((f) => !f.ok).map((f) => f.label).join('; ')}`;
      const q = `${s.questions.count}${s.questions.rawCount > s.questions.count ? ` (model asked ${s.questions.rawCount})` : ''}${s.questions.askedWhenShouldnt ? ', asked when it shouldn\'t' : ''}${s.questions.keyCovered === false ? ', missed the key question' : s.questions.keyCovered ? ', key question asked' : ''}`;
      out.push(`| ${m.label} | ${r.run} | ${cell(mh)} | ${cell(mn)} | ${cell(tr)} | ${cell(fa)} | ${cell(q)} | ${s.hardFail ? cell(s.hardFailReasons.join('; ')) : 'no'} | ${money(s.subtotal)} |`);
    }
    out.push('');
    for (const m of ran) for (const r of results.runs.filter((x) => x.model === m.label && x.job === job.id && x.score)) {
      const s = r.score!;
      const should = s.shouldTotal ? ` · should have ${s.shouldFound}/${s.shouldTotal}` : '';
      out.push(`<details><summary>${m.label}, run ${r.run}: ${s.lines.length} lines${should}</summary>`, '');
      for (const l of s.lines) out.push(`- ${cell(l.description)}: ${l.quantity} ${l.unit} @ ${money(l.unitPrice)} (${l.category}, ${l.origin})`);
      if (s.questions.list.length) { out.push('', 'Questions:'); for (const q of s.questions.list) out.push(`- ${cell(q)}`); }
      out.push('', '</details>', '');
    }
  }

  out.push('## Unmatched lines', '');
  out.push('Lines no must-have or should-have check recognised: candidates for new synonyms in jobs.json (or genuinely extra items).', '');
  for (const job of results.jobs) {
    const counts = new Map<string, Set<string>>();
    for (const r of results.runs.filter((x) => x.job === job.id && x.score)) {
      for (const d of r.score!.unmatchedLines) {
        const k = d.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!counts.has(k)) counts.set(k, new Set());
        counts.get(k)!.add(r.model);
      }
    }
    if (!counts.size) continue;
    out.push(`**${job.id}**`);
    for (const [line, models] of [...counts.entries()].sort()) out.push(`- ${cell(line)} (${[...models].join(', ')})`);
    out.push('');
  }
  return out.join('\n') + '\n';
}
