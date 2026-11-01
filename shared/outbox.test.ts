import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { drainOutbox, type OutboxEntry, type SendResult } from './outbox';

const entry = (id: string): OutboxEntry => ({ clientId: id, body: { clientId: id }, createdAt: 0, attempts: 0 });

/** A fake server that remembers clientIds, like the real create endpoint. */
function fakeServer() {
  const quotes = new Map<string, number>();
  let next = 1;
  return {
    quotes,
    create(clientId: string) {
      if (!quotes.has(clientId)) quotes.set(clientId, next++);
      return quotes.get(clientId)!;
    },
  };
}

describe('drainOutbox', () => {
  test('sends in order and empties the queue', async () => {
    const order: string[] = [];
    const saves: number[] = [];
    const r = await drainOutbox([entry('a'), entry('b'), entry('c')],
      async e => { order.push(e.clientId); return { ok: true }; },
      async rem => { saves.push(rem.length); });
    assert.deepEqual(order, ['a', 'b', 'c']);
    assert.deepEqual(saves, [2, 1, 0]);
    assert.equal(r.synced, 3);
    assert.equal(r.remaining.length, 0);
  });

  test('no connection stops the run and keeps everything from there on', async () => {
    const r = await drainOutbox([entry('a'), entry('b'), entry('c')],
      async e => (e.clientId === 'b' ? { ok: false, offline: true, error: 'Network error' } : { ok: true }),
      async () => {});
    assert.equal(r.offline, true);
    assert.deepEqual(r.remaining.map(e => e.clientId), ['b', 'c']);
    assert.equal(r.remaining[0].attempts, 1);
    assert.equal(r.remaining[0].lastError, 'Network error');
    assert.equal(r.remaining[1].attempts, 0); // never tried
  });

  test('a rejected entry is kept with its error and does not block the rest', async () => {
    const r = await drainOutbox([entry('bad'), entry('good')],
      async e => (e.clientId === 'bad' ? { ok: false, offline: false, error: '400 Validation error' } : { ok: true }),
      async () => {});
    assert.deepEqual(r.remaining.map(e => e.clientId), ['bad']);
    assert.equal(r.synced, 1);
  });

  test('exactly once: a sync cut off after the server saved is retried without a duplicate', async () => {
    const server = fakeServer();
    let stored = [entry('a'), entry('b')];
    const save = async (rem: OutboxEntry[]) => { stored = rem; };

    // First run: the server creates 'a', but the reply never arrives (signal lost),
    // so the phone sees no connection and keeps 'a'.
    let first = true;
    await drainOutbox(stored, async (e): Promise<SendResult> => {
      server.create(e.clientId);
      if (first) { first = false; return { ok: false, offline: true, error: 'Request timed out' }; }
      return { ok: true };
    }, save);
    assert.deepEqual(stored.map(e => e.clientId), ['a', 'b']);
    assert.equal(server.quotes.size, 1);

    // Retry: the server returns the quote it already made for 'a'.
    await drainOutbox(stored, async e => { server.create(e.clientId); return { ok: true }; }, save);
    assert.equal(stored.length, 0);
    assert.equal(server.quotes.size, 2); // 'a' once, 'b' once
  });
});
