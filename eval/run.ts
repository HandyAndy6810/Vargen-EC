/**
 * npm run eval:models: run the test set (eval/jobs.json) through the app's own
 * quote generator (server/lib/generate-quote.ts) with each model in
 * eval/models.json, score every run (eval/score.ts) and write a scorecard to
 * eval/results/. See eval/README.md.
 *
 *   npm run eval:models                                  every model, every job, 3 runs
 *   npm run eval:models -- --model groq-gpt-oss-120b --job C1 --runs 1
 *   npm run eval:models -- --list-models                 what the provider account offers
 *   npm run eval:models -- --find-user you@example.com   your user id in the DEV database
 *
 * Dev database only, read only: it loads the EVAL_USER_ID user's settings, price
 * list, remembered matches and past quotes, and saves nothing (no quotes, jobs,
 * generation records or corrections). API keys are read by env var name and
 * never printed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { evalDatabase } from './db-guard';
import { scoreRun, quoteCostUsd } from './score';
import { scorecard, summarise, type ModelEntry, type Results, type RunRecord } from './report';
import type { EvalJob, EvalModel } from './types';
import { generateQuote, InvalidAiJsonError, type ChatClient } from '../server/lib/generate-quote';
import { resolvePricingInputs } from '../server/lib/pricing-inputs';
import { isRateLimited } from '../server/lib/ai-json';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── Arguments ───────────────────────────────────────────────────────────────

type Args = { models: string[]; jobs: string[]; runs: number; listModels: boolean; findUser: string | null; modelsFile: string; outDir: string };

function parseArgs(argv: string[]): Args {
  const a: Args = { models: [], jobs: [], runs: 3, listModels: false, findUser: null, modelsFile: join(HERE, 'models.json'), outDir: join(HERE, 'results') };
  const list = (v: string | undefined) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => { const x = argv[++i]; if (x == null) fail(`${k} needs a value`); return x; };
    if (k === '--model') a.models.push(...list(v()));
    else if (k === '--job') a.jobs.push(...list(v()).map((s) => s.toUpperCase()));
    else if (k === '--runs') { a.runs = Number(v()); if (!Number.isInteger(a.runs) || a.runs < 1) fail('--runs must be a whole number of 1 or more'); }
    else if (k === '--list-models') a.listModels = true;
    else if (k === '--find-user') a.findUser = v();
    else if (k === '--models-file') a.modelsFile = resolve(v());
    else if (k === '--out') a.outDir = resolve(v());
    else if (k === '--help' || k === '-h') { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(0); }
    else fail(`Unknown option ${k}. Try --help.`);
  }
  return a;
}

function fail(message: string): never {
  console.error(`\n[eval] ${message}\n`);
  process.exit(1);
}

const log = (m: string) => console.log(`[eval] ${m}`);

// ── Providers ───────────────────────────────────────────────────────────────

const keyOf = (m: EvalModel) => process.env[m.apiKeyEnv];

/** The model ids the account can use (GET {baseURL}/models), or null if the provider wouldn't say. */
async function providerModels(m: EvalModel): Promise<{ ids: string[] } | { error: string }> {
  try {
    const res = await fetch(`${m.baseURL.replace(/\/$/, '')}/models`, { headers: { Authorization: `Bearer ${keyOf(m)}` } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body: any = await res.json();
    const data = Array.isArray(body?.data) ? body.data : [];
    return { ids: data.map((d: any) => String(d?.id ?? '')).filter(Boolean) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function listModels(models: EvalModel[]) {
  const seen = new Set<string>();
  for (const m of models) {
    const k = `${m.baseURL} ${m.apiKeyEnv}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!keyOf(m)) { log(`${m.provider}: skipped, ${m.apiKeyEnv} is not set.`); continue; }
    const got = await providerModels(m);
    if ('error' in got) { log(`${m.provider}: couldn't list models (${got.error}).`); continue; }
    const configured = new Set(models.filter((x) => x.baseURL === m.baseURL).map((x) => x.model));
    console.log(`\n${m.provider} (${m.baseURL}/models), ${got.ids.length} models on this account:`);
    for (const id of got.ids.sort()) console.log(`  ${configured.has(id) ? '*' : ' '} ${id}`);
    for (const id of configured) if (!got.ids.includes(id)) console.log(`  ! ${id} is in models.json but NOT on this account`);
    console.log('  (* = in models.json)');
  }
}

/** Retries a provider rate limit with backoff, logging every wait. Never skips silently. */
function rateLimited(client: ChatClient, where: () => string, onRetry: () => void): ChatClient {
  const MAX = 6;
  return {
    chat: {
      completions: {
        async create(params: any, options?: any) {
          for (let attempt = 1; ; attempt++) {
            try {
              return await client.chat.completions.create(params, options);
            } catch (err: any) {
              const overloaded = Number(err?.status) === 503;
              if (!(isRateLimited(err) || overloaded) || attempt >= MAX) {
                if (isRateLimited(err)) throw new Error(`rate limited ${MAX} times in a row; gave up (${err?.message ?? err})`);
                throw err;
              }
              const header = Number(err?.headers?.get?.('retry-after') ?? err?.headers?.['retry-after']);
              const waitS = Number.isFinite(header) && header > 0 ? Math.min(header, 120) : Math.min(5 * 2 ** (attempt - 1), 120);
              log(`${where()}: ${overloaded ? 'provider overloaded (503)' : 'rate limited (429)'}, waiting ${waitS}s then retrying (attempt ${attempt + 1} of ${MAX})`);
              onRetry();
              await new Promise((r) => setTimeout(r, waitS * 1000));
            }
          }
        },
      },
    },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allModels: EvalModel[] = JSON.parse(readFileSync(args.modelsFile, 'utf8')).models;
  const allJobs: EvalJob[] = JSON.parse(readFileSync(join(HERE, 'jobs.json'), 'utf8')).jobs;

  if (args.listModels) { await listModels(allModels); return; }

  // Dev database only. Checked before anything connects.
  const guard = evalDatabase(process.env);
  if (!guard.ok) fail(guard.message);
  log(`database: ${guard.description}`);

  const { db, pool } = await import('../server/db');
  const { users } = await import('../shared/models/auth');
  const { eq, sql } = await import('drizzle-orm');
  try {
    if (args.findUser) {
      const rows = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = lower(${args.findUser})`);
      if (!rows.length) fail(`No user with that email in the dev database. Sign up in the dev app (the Run button) first.`);
      console.log(`\nYour user id in the dev database:\n\n  ${rows[0].id}\n\nAdd it to Replit Secrets as EVAL_USER_ID.\n`);
      return;
    }

    const userId = process.env.EVAL_USER_ID?.trim();
    if (!userId) fail('EVAL_USER_ID is not set. Find your dev user id with: npm run eval:models -- --find-user <your email>');
    const found = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!found.length) fail('EVAL_USER_ID is not a user in the DEV database. Find yours with: npm run eval:models -- --find-user <your email>');

    const { storage } = await import('../server/storage');
    const [settings, priceList, remembered, pastQuotes] = await Promise.all([
      storage.getUserSettings(userId), storage.getPriceList(userId), storage.getRememberedMatches(userId), storage.getQuotes(userId),
    ]);
    const pricing = resolvePricingInputs(settings, {});
    const pastQuotesUsed = pastQuotes.filter((q) => q.content && ['invoiced', 'accepted', 'sent'].includes(String(q.status))).slice(0, 5).length;
    log(`user found; ${settings ? 'settings loaded' : 'NO settings row (defaults used)'}; ${priceList.length} price list rows; ${remembered.length} remembered matches; ${pastQuotesUsed} past quotes as examples`);
    if (!pricing.labourRate) log('note: no charge-out rate in settings, so every hourly labour line is the model\'s own rate and scores as an invented price.');

    const jobs = args.jobs.length ? allJobs.filter((j) => args.jobs.includes(j.id)) : allJobs;
    for (const id of args.jobs) if (!allJobs.some((j) => j.id === id)) fail(`No job ${id} in jobs.json.`);
    const chosen = args.models.length ? allModels.filter((m) => args.models.includes(m.label)) : allModels;
    for (const l of args.models) if (!allModels.some((m) => m.label === l)) fail(`No model labelled ${l} in models.json. Labels: ${allModels.map((m) => m.label).join(', ')}`);

    // Which models can run: a key, and (where the provider says) an id the account has.
    const entries: ModelEntry[] = [];
    const runnable: EvalModel[] = [];
    const listed = new Map<string, Awaited<ReturnType<typeof providerModels>>>();
    for (const m of chosen) {
      const base = { label: m.label, model: m.model, provider: m.provider, pricePerMillion: m.pricePerMillion, verified: m.verified, priceSource: m.priceSource };
      if (!keyOf(m)) {
        log(`skipping ${m.label}: ${m.apiKeyEnv} is not set (add it to Replit Secrets to include ${m.provider}).`);
        entries.push({ ...base, status: 'skipped', skipReason: `${m.apiKeyEnv} is not set` });
        continue;
      }
      const lk = `${m.baseURL} ${m.apiKeyEnv}`;
      if (!listed.has(lk)) listed.set(lk, await providerModels(m));
      const ids = listed.get(lk)!;
      if ('ids' in ids && !ids.ids.includes(m.model)) {
        log(`skipping ${m.label}: ${m.model} is not on this ${m.provider} account (retired, or not enabled). See --list-models.`);
        entries.push({ ...base, status: 'skipped', skipReason: `${m.model} is not on the ${m.provider} account` });
        continue;
      }
      if ('error' in ids) log(`note: couldn't list ${m.provider} models (${ids.error}); trying ${m.model} anyway.`);
      if (!m.verified) log(`note: ${m.label}'s price is not verified against ${m.provider}'s own page (see models.json).`);
      entries.push({ ...base, status: 'ran' });
      runnable.push(m);
    }
    if (!runnable.length) log('no model could run.');

    const startedAt = new Date();
    const runs: RunRecord[] = [];
    const total = runnable.length * jobs.length * args.runs;
    let n = 0;
    for (const m of runnable) {
      // The SDK's own retries are off, so every rate limit goes through (and is logged by) rateLimited.
      const client = new OpenAI({ baseURL: m.baseURL, apiKey: keyOf(m), maxRetries: 0, timeout: 180_000 });
      for (const job of jobs) {
        for (let run = 1; run <= args.runs; run++) {
          n++;
          const where = `[${n}/${total}] ${m.label} ${job.id} run ${run}`;
          let retries = 0;
          const rec: RunRecord = { model: m.label, job: job.id, run, ok: false, rateLimitRetries: 0 };
          try {
            const result = await generateQuote(
              { description: job.text, body: {} },
              {
                settings,
                loadPastQuotes: async () => pastQuotes,
                loadPriceList: async () => priceList,
                loadRememberedMatches: async () => remembered,
              },
              { client: rateLimited(client, () => where, () => { retries++; }), model: m.model },
              { supportsVision: false },
            );
            const score = scoreRun(job, result.quote, result.pricing, result.raw);
            Object.assign(rec, {
              ok: true, quote: result.quote, raw: result.raw, pricing: result.pricing, usage: result.usage, timing: result.timing,
              costUsd: quoteCostUsd(result.usage, m.pricePerMillion), score,
            });
            const bits = [
              `${score.lines.length} lines`,
              `must have ${score.mustHavePass == null ? 'n/a' : score.mustHavePass ? 'pass' : 'FAIL'}`,
              `${score.questions.count} question(s)`,
              score.hardFail ? `HARD FAIL (${score.hardFailReasons.join('; ')})` : 'no hard fail',
              `${(result.timing.totalMs / 1000).toFixed(1)}s`,
            ];
            log(`${where}: ${bits.join(', ')}`);
          } catch (err: any) {
            rec.error = err instanceof InvalidAiJsonError ? 'the model returned invalid JSON' : String(err?.message ?? err);
            if (err instanceof InvalidAiJsonError) rec.raw = err.raw;
            log(`${where}: FAILED: ${rec.error}`);
          }
          rec.rateLimitRetries = retries;
          runs.push(rec);
        }
      }
    }

    let gitCommit: string | null = null;
    try { gitCommit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a checkout */ }
    const results: Results = {
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      gitCommit,
      runsPerJob: args.runs,
      database: guard.description,
      settings: {
        trade: pricing.tradeType, 'charge-out rate': pricing.labourRate, markup: `${pricing.markupPercent}%`,
        'markup labour': pricing.markupLabour, 'call-out fee': pricing.callOutFee || 'off', GST: pricing.includeGST ? 'on' : 'off',
      },
      priceListRows: priceList.length,
      rememberedMatches: remembered.length,
      pastQuotesUsed,
      models: entries,
      jobs,
      runs,
    };

    mkdirSync(args.outDir, { recursive: true });
    const stamp = startedAt.toISOString().replace(/[:]/g, '').replace('T', '-').slice(0, 17);
    const jsonPath = join(args.outDir, `${stamp}.json`);
    const mdPath = join(args.outDir, `${stamp}.md`);
    writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    writeFileSync(mdPath, scorecard(results));
    console.log('');
    for (const m of runnable) {
      const s = summarise(results, m.label);
      log(`${m.label}: ${s.hardFails}/${s.runs} hard fails, must have ${s.mustHaveRate == null ? 'n/a' : Math.round(s.mustHaveRate * 100) + '%'}, questions ${s.questionScore == null ? 'n/a' : Math.round(s.questionScore * 100) + '%'}`);
    }
    log(`scorecard: ${mdPath}`);
    log(`everything (incl. raw model output): ${jsonPath}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((err) => fail(String(err?.stack ?? err)));
