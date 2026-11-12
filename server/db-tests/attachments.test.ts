/**
 * Attachments against a real database (Share to Vargen, step 5): kept with one
 * record, owner-only, and gone with that record.
 *
 *   npm run test:db   (dev database only; see account-deletion.test.ts)
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, pool } from '../db';
import { storage } from '../storage';
import { users } from '../../shared/schema';

const stamp = Date.now();
const ids: string[] = [];
after(async () => {
  for (const id of ids) await storage.deleteAccount(id);
  await pool.end();
});

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

test('a file is kept with its record, only its owner sees it, and it goes with the record', async () => {
  const [a] = await db.insert(users).values({ email: `att-a-${stamp}@example.com`, password: 'x' }).returning();
  const [b] = await db.insert(users).values({ email: `att-b-${stamp}@example.com`, password: 'x' }).returning();
  ids.push(a.id, b.id);
  const job = await storage.createJob({ userId: a.id, title: 'Deck' } as any);
  const quote = await storage.createQuote({ userId: a.id, totalAmount: '0', status: 'draft' } as any);
  const receipt = await storage.createReceipt({ userId: a.id, totalAmount: '10' } as any);

  const onJob = await storage.createAttachment(a.id, { mimeType: 'image/jpeg', fileName: 'site.jpg', data: jpeg, jobId: job.id });
  await storage.createAttachment(a.id, { mimeType: 'image/jpeg', fileName: null, data: jpeg, quoteId: quote.id });
  await storage.createAttachment(a.id, { mimeType: 'application/pdf', fileName: 'INV.pdf', data: Buffer.from('%PDF-1.4'), receiptId: receipt.id });

  const listed = await storage.listAttachments(a.id, { jobId: job.id });
  assert.equal(listed.length, 1);
  assert.ok(!('data' in listed[0]), 'lists never carry the file');
  assert.deepEqual((await storage.getAttachment(a.id, onJob.id))!.data, jpeg);
  assert.equal(await storage.getAttachment(b.id, onJob.id), undefined, "another account can't read it");
  await storage.deleteAttachment(b.id, onJob.id);
  assert.ok(await storage.getAttachment(a.id, onJob.id), "another account can't delete it");

  await storage.deleteJob(job.id, a.id);
  assert.equal((await storage.listAttachments(a.id, { jobId: job.id })).length, 0);
  await storage.deleteQuote(quote.id, a.id);
  assert.equal((await storage.listAttachments(a.id, { quoteId: quote.id })).length, 0);
  await storage.deleteReceipt(receipt.id, a.id);
  assert.equal((await storage.listAttachments(a.id, { receiptId: receipt.id })).length, 0);
});
