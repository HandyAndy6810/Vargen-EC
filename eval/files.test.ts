/** jobs.json, models.json and the database guard: the shape the runner relies on, and no keys in the repo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evalDatabase } from './db-guard';
import type { EvalJob, EvalModel } from './types';

const read = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const jobs: EvalJob[] = JSON.parse(read('./jobs.json')).jobs;
const models: EvalModel[] = JSON.parse(read('./models.json')).models;
const md = read('./model-eval-set.md');

test('jobs.json has the 20 jobs of the test set, word for word', () => {
  assert.deepEqual(jobs.map((j) => j.id), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'P1', 'P2', 'P3', 'E1', 'E2', 'F1', 'L1', 'K1', 'H1', 'M1', 'M2', 'M3', 'X1', 'X2']);
  for (const j of jobs) assert.ok(md.includes(j.text), `${j.id}'s text is in model-eval-set.md`);
});

test('every check is well formed and every regex compiles', () => {
  for (const j of jobs) {
    for (const c of [...j.mustHave, ...j.shouldHave, ...j.mustNot, ...(j.pairWith?.compare ?? [])]) {
      assert.ok(c.label, `${j.id}: a check without a label`);
      const kind = (c as any).kind;
      if (!kind || kind === 'match' || kind === 'unflaggedAssumedSize') assert.ok(c.synonyms.length, `${j.id} ${c.label}: no synonyms`);
      for (const t of [...c.synonyms, ...(c.alsoNeeds ?? []), ...(c.unlessLine ?? [])]) if (t.startsWith('re:')) new RegExp(t.slice(3), 'i');
    }
    for (const f of j.expectedFacts) assert.ok(f.numbers?.length || f.text?.length, `${j.id} ${f.label}: nothing to look for`);
    if (j.keyQuestion) assert.ok(j.keyQuestion.synonyms.length);
    assert.equal(typeof j.expectNoQuestions, 'boolean');
  }
});

test('C4 and C5 are the hours pair, both ways', () => {
  const c4 = jobs.find((j) => j.id === 'C4')!;
  const c5 = jobs.find((j) => j.id === 'C5')!;
  assert.deepEqual([c4.pairWith?.job, c4.pairWith?.role], ['C5', 'smaller']);
  assert.deepEqual([c5.pairWith?.job, c5.pairWith?.role], ['C4', 'larger']);
});

test('models.json: the live model is the baseline, keys are env var names only', () => {
  const base = models.filter((m) => m.baseline);
  assert.equal(base.length, 1);
  assert.equal(base[0].model, 'openai/gpt-oss-120b');
  assert.match(base[0].baseURL, /groq/);
  assert.equal(new Set(models.map((m) => m.label)).size, models.length);
  for (const m of models) {
    assert.match(m.apiKeyEnv, /^[A-Z][A-Z0-9_]*$/, `${m.label}: apiKeyEnv must be a variable NAME`);
    assert.ok(m.priceSource, `${m.label}: say where the price came from`);
  }
  assert.doesNotMatch(read('./models.json'), /gsk_|sk-[A-Za-z0-9]{10}|sk-ant-/);
});

test('the database guard: dev only, never production', () => {
  const dev = 'postgres://u:p@ep-dev.neon.tech/neondb';
  const prod = 'postgres://u:p@ep-prod.neon.tech/neondb';
  assert.equal(evalDatabase({ VARGEN_DB_TARGET: 'dev', DEV_DATABASE_URL: dev, APP_DATABASE_URL: prod }).ok, true);
  assert.equal(evalDatabase({ DEV_DATABASE_URL: dev, APP_DATABASE_URL: prod }).ok, false);
  assert.equal(evalDatabase({ VARGEN_DB_TARGET: 'dev', APP_DATABASE_URL: prod }).ok, false);
  const same = evalDatabase({ VARGEN_DB_TARGET: 'dev', DEV_DATABASE_URL: prod.replace('u:p', 'x:y'), APP_DATABASE_URL: prod });
  assert.equal(same.ok, false);
  assert.match((same as any).message, /production/);
  // The message never carries the credentials.
  assert.doesNotMatch(JSON.stringify(evalDatabase({ VARGEN_DB_TARGET: 'dev', DEV_DATABASE_URL: dev })), /u:p/);
});
