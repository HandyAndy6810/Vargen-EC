import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreRun } from './score';
import { scorecard, summarise, pairResults, type Results, type RunRecord } from './report';
import type { EvalJob } from './types';

const JOBS: EvalJob[] = JSON.parse(readFileSync(new URL('./jobs.json', import.meta.url), 'utf8')).jobs;
const pick = (...ids: string[]) => JOBS.filter((j) => ids.includes(j.id));
const PRICING = { labourRate: 110, callOutFee: 0 };

const path = (hours: number, total = hours * 110) => ({
  items: [
    { description: 'Labour – form and pour path', quantity: hours, unit: 'hr', unitPrice: 110, category: 'labour' },
    { description: 'N25 premix concrete', quantity: 2, unit: 'm3', unitPrice: (total - hours * 110) / 2 || 290, category: 'material', priceSource: 'estimate' },
    { description: 'Timber formwork', quantity: 30, unit: 'lm', unitPrice: 5, category: 'material', priceSource: 'estimate' },
  ],
  questions: [],
  notes: 'Path 18 m2.',
});

function results(): Results {
  const jobs = pick('C4', 'C5');
  const runs: RunRecord[] = [];
  const add = (model: string, id: string, run: number, quote: any, ok = true) => {
    const job = jobs.find((j) => j.id === id)!;
    runs.push({
      model, job: id, run, ok, rateLimitRetries: 0,
      ...(ok ? {
        quote, score: scoreRun(job, quote, PRICING), costUsd: 0.002,
        timing: { totalMs: 2000, generationMs: 1800 }, usage: { promptTokens: 4000, completionTokens: 1500, totalTokens: 5500, calls: [] },
      } : { error: 'boom' }),
    });
  };
  add('a', 'C4', 1, path(8)); add('a', 'C5', 1, path(20));
  add('a', 'C4', 2, path(8)); add('a', 'C5', 2, path(24));
  add('b', 'C4', 1, path(8)); add('b', 'C5', 1, {}, false);
  return {
    startedAt: '2026-11-13T01:02:03.000Z', finishedAt: '2026-11-13T01:05:00.000Z', gitCommit: 'abc1234', runsPerJob: 2,
    database: 'localhost/dev (from DEV_DATABASE_URL, target dev)', settings: { trade: 'concreter', 'charge-out rate': 110 },
    priceListRows: 3, rememberedMatches: 0, pastQuotesUsed: 0,
    models: [
      { label: 'a', model: 'm-a', provider: 'p', pricePerMillion: { input: 0.1, output: 0.2 }, verified: true, priceSource: 'x', status: 'ran' },
      { label: 'b', model: 'm-b', provider: 'p', pricePerMillion: null, verified: false, priceSource: 'x', status: 'ran' },
      { label: 'c', model: 'm-c', provider: 'q', pricePerMillion: null, verified: false, priceSource: 'x', status: 'skipped', skipReason: 'Q_KEY is not set' },
    ],
    jobs, runs,
  };
}

test('per-model totals', () => {
  const r = results();
  const a = summarise(r, 'a');
  assert.equal(a.runs, 4);
  assert.equal(a.errors, 0);
  assert.equal(a.hardFails, 0);
  assert.equal(a.costPerQuoteUsd, 0.002);
  assert.equal(a.secondsPerQuote, 2);
  assert.equal(a.pairPassRate, 1);
  assert.ok(Math.abs(a.pairRatio! - (20 / 8 + 24 / 8) / 2) < 1e-9);
  const b = summarise(r, 'b');
  assert.equal(b.errors, 1);
  assert.equal(b.hardFails, 1, 'a failed run counts as a hard fail');
  assert.deepEqual(pairResults(r, 'b'), []);
});

test('the scorecard has the summary table, the skipped model, and every line', () => {
  const md = scorecard(results());
  assert.match(md, /\| Model \| Runs \| Errors \| Hard fails \| Must have \| Should have \(avg\) \|/);
  assert.match(md, /\| a \| 4 \| 0 \| 0 \|/);
  assert.match(md, /\*\*Skipped c\*\* \(m-c\): Q_KEY is not set/);
  assert.match(md, /### C5\. /);
  assert.match(md, /N25 premix concrete: 2 m3 @/);
  assert.match(md, /b \| 1 \| error: boom/);
  assert.match(md, /## Unmatched lines/);
});
