import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { registerApiNotFound } from './api-not-found';

// The same order as server/index.ts: real routes, then the API 404, then the web
// app's catch-all (static.ts / vite.ts answer every path with index.html).
let server: Server;
let base = '';
before(async () => {
  const app = express();
  app.get('/api/real', (_req, res) => res.json({ ok: true }));
  app.get('/api/settings', (_req, res) => res.json([]));
  registerApiNotFound(app);
  app.use('*', (_req, res) => res.type('html').send('<!doctype html><div id="root"></div>'));
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
after(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('unknown /api routes', () => {
  test('GET /api/does-not-exist is a JSON 404, not the web app', async () => {
    const r = await fetch(`${base}/api/does-not-exist`);
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type') || '', /application\/json/);
    assert.deepEqual(await r.json(), { message: 'Not found' });
  });
  test('any method, any depth', async () => {
    for (const [method, path] of [['POST', '/api/old/thing'], ['DELETE', '/api/x/1/y'], ['GET', '/api']]) {
      assert.equal((await fetch(base + path, { method })).status, 404, `${method} ${path}`);
    }
  });
  test('real API routes still answer', async () => {
    assert.deepEqual(await (await fetch(`${base}/api/real`)).json(), { ok: true });
    assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), []);
  });
  test('the web app still serves /, /portal/abc and other pages', async () => {
    for (const path of ['/', '/portal/abc', '/invoices/3/preview', '/apiary']) {
      const r = await fetch(base + path);
      assert.equal(r.status, 200, path);
      assert.match(await r.text(), /<div id="root">/, path);
    }
  });
});
