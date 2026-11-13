/**
 * POST /api/quotes/generate after the generation logic moved into
 * generate-quote.ts: the route still uses the model from AI_CHAT_MODEL for
 * every call it makes, still prices with the saved settings and the price list,
 * and still answers errors the way the phone expects. A fake OpenAI-style
 * server stands in for Groq; a stub stands in for the database.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http, { type Server } from 'node:http';
import express from 'express';
import OpenAI from 'openai';
import { aiConfigFromEnv } from './ai-config';
import { generateQuoteRoute } from './generate-quote-route';

type Seen = { model: string; auth: string; system: string };
const seen: Seen[] = [];
let quoteReply = '';

const QUOTE = {
  jobTitle: 'Driveway',
  summary: 'New driveway.',
  items: [
    { description: 'Labour – form, pour and finish', quantity: 10, unit: 'hr', category: 'labour', unitCost: 50, unitPrice: 95 },
    { description: 'Reinforcing mesh sheet SL82 6x2.4', quantity: 2, unit: 'sheet', category: 'material', unitCost: 80, unitPrice: 100 },
  ],
  questions: [{ q: 'Old concrete out?', type: 'toggle', assumption: 'Assumed yes.' }],
  notes: 'Valid 14 days.',
};

let aiServer: Server;
let appServer: Server;
let aiBase = '';
let appBase = '';
const created: any[] = [];

function storageStub(over: Record<string, unknown> = {}) {
  return {
    getUserSettings: async () => ({
      tradeType: 'concreter', labourRate: 110, markupPercent: 20, markupLabour: false,
      labourCostRate: null, callOutFee: 0, callOutFeeEnabled: false, includeGST: true,
    }) as any,
    getQuotes: async () => [],
    getPriceList: async () => [{ id: 1, item: 'Reinforcing mesh SL82', unit: 'sheet', unitPrice: 90, quantity: null, priceDate: new Date('2026-11-01'), supplier: 'Bunnings' }],
    getRememberedMatches: async () => [],
    createAiGeneration: async (row: any) => { created.push(row); return { id: 77, ...row }; },
    ...over,
  } as any;
}

before(async () => {
  aiServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const p = JSON.parse(body || '{}');
      const system = String(p.messages?.[0]?.content ?? '');
      seen.push({ model: p.model, auth: String(req.headers.authorization ?? ''), system });
      const content = system.includes('Trade Pal') ? quoteReply : '{"matches":[]}';
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        id: 'x', object: 'chat.completion', created: 0, model: p.model,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }));
    });
  });
  await new Promise<void>((r) => aiServer.listen(0, '127.0.0.1', r));
  const a = aiServer.address();
  aiBase = `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}/openai/v1`;

  // Wired exactly as server/routes.ts wires it: the env decides the model.
  const AI = aiConfigFromEnv({
    AI_INTEGRATIONS_OPENAI_BASE_URL: aiBase,
    AI_INTEGRATIONS_OPENAI_API_KEY: 'test-key',
    AI_CHAT_MODEL: 'chat-model-from-env',
  });
  const openai = new OpenAI({ apiKey: AI.apiKey, baseURL: AI.baseURL, maxRetries: 0 });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.userId = 'user-1'; next(); });
  app.post('/api/quotes/generate', generateQuoteRoute({ storage: storageStub(), ai: { client: openai, model: AI.model }, supportsVision: AI.supportsVision }));
  app.post('/no-settings', generateQuoteRoute({ storage: storageStub({ getUserSettings: async () => undefined }), ai: { client: openai, model: AI.model }, supportsVision: false }));
  await new Promise<void>((r) => { appServer = app.listen(0, '127.0.0.1', r); });
  const b = appServer.address();
  appBase = `http://127.0.0.1:${typeof b === 'object' && b ? b.port : 0}`;
});

after(() => { aiServer.close(); appServer.close(); });

const post = (path: string, body: unknown) => fetch(`${appBase}${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('every AI call the route makes uses AI_CHAT_MODEL, and the record says so', async () => {
  seen.length = 0; created.length = 0;
  quoteReply = JSON.stringify(QUOTE);
  const res = await post('/api/quotes/generate', { description: '6m x 4m driveway, 100mm thick', draftKey: 'd1' });
  assert.equal(res.status, 200);
  const q = await res.json();
  assert.ok(seen.length >= 2, `the quote and the matching call (saw ${seen.length})`);
  for (const s of seen) {
    assert.equal(s.model, 'chat-model-from-env');
    assert.equal(s.auth, 'Bearer test-key');
  }
  assert.equal(created.length, 1);
  assert.equal(created[0].model, 'chat-model-from-env');
  assert.equal(created[0].draftKey, 'd1');
  assert.equal(q.generationId, 77);

  // Priced exactly as before: the saved charge-out rate on hourly labour, and
  // the material line marked by where its price came from.
  const labour = q.items.find((i: any) => i.category === 'labour');
  assert.equal(labour.unitPrice, 110);
  const mesh = q.items.find((i: any) => /mesh/i.test(i.description));
  assert.ok(mesh.priceSource === 'estimate' || mesh.priceSource === 'yours');
  assert.deepEqual(q.pricing, { labourRate: 110, markupPercent: 20, markupLabour: false, labourCostRate: null, callOutFee: 0, includeGST: true });
  assert.equal(q.questions.length, 1);
  assert.equal(q.questions[0].type, 'toggle');
});

test('no settings row: the request body is the fallback, as before', async () => {
  quoteReply = JSON.stringify(QUOTE);
  const res = await post('/no-settings', { description: '6m x 4m driveway, 100mm thick', labourRate: 88, includeGST: false });
  const q = await res.json();
  assert.equal(q.pricing.labourRate, 88);
  assert.equal(q.pricing.includeGST, false);
  assert.equal(q.items.find((i: any) => i.category === 'labour').unitPrice, 88);
});

test('errors answer as before', async () => {
  const missing = await post('/api/quotes/generate', {});
  assert.equal(missing.status, 400);
  assert.deepEqual(await missing.json(), { message: 'Job description is required' });

  quoteReply = 'not json';
  const bad = await post('/api/quotes/generate', { description: 'a job' });
  assert.equal(bad.status, 500);
  assert.deepEqual(await bad.json(), { message: 'AI returned invalid JSON', raw: 'not json' });
});

test('server/routes.ts registers this route with the env-configured model', () => {
  const src = readFileSync(new URL('../routes.ts', import.meta.url), 'utf8');
  assert.match(src, /const AI = aiConfigFromEnv\(process\.env\);/);
  assert.match(src, /const AI_MODEL = AI\.model;/);
  assert.match(src, /app\.post\("\/api\/quotes\/generate", requireAuth, aiRateLimit, generateQuoteRoute\(\{\s*storage,\s*ai: \{ client: openai, model: AI_MODEL \},/);
});
