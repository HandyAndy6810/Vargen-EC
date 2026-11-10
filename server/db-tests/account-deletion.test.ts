/**
 * Account deletion against a real database: every row the user owns goes, and no
 * one else's does. Needs Postgres, so it isn't in `npm test` (CI has no database).
 *
 *   npm run test:db
 *
 * That sets VARGEN_DB_TARGET=dev, so it only ever runs against DEV_DATABASE_URL
 * (the Neon dev branch, or a local throwaway) and refuses without it. It creates
 * two throwaway users and deletes them again.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from '../db';
import { storage } from '../storage';
import {
  users, sessions, customers, jobs, quotes, quoteItems, invoices, portalFeedback,
  customerMessages, receipts, jobTemplates, xeroTokens, userSettings, aiGenerations, priceListItems,
  priceMatches, unsurePriceLines,
} from '../../shared/schema';

const stamp = Date.now();

/** A user with a row in every table, linked the way real data is (including the quote ⇄ job cycle). */
async function seedUser(tag: string): Promise<string> {
  const [u] = await db.insert(users).values({ email: `del-${tag}-${stamp}@example.com`, password: 'x' }).returning();
  const [c] = await db.insert(customers).values({ userId: u.id, name: `Customer ${tag}` }).returning();
  const [q] = await db.insert(quotes).values({ userId: u.id, customerId: c.id, totalAmount: '330', status: 'sent', shareToken: `tok-${tag}-${stamp}` }).returning();
  const [inv] = await db.insert(invoices).values({ userId: u.id, quoteId: q.id, customerId: c.id, invoiceNumber: `INV-${tag}-${stamp}`, items: '[]', subtotal: '300', totalAmount: '330' }).returning();
  const [j] = await db.insert(jobs).values({ userId: u.id, customerId: c.id, title: `Job ${tag}`, quoteId: q.id, invoiceId: inv.id }).returning();
  await db.update(quotes).set({ jobId: j.id }).where(eq(quotes.id, q.id));
  await db.insert(quoteItems).values({ quoteId: q.id, description: 'Labour', quantity: '2', price: '150' });
  await db.insert(portalFeedback).values({ quoteId: q.id, message: 'Looks good' });
  await db.insert(customerMessages).values({ userId: u.id, customerId: c.id, body: 'Hi' });
  const [rc] = await db.insert(receipts).values({ userId: u.id, vendor: 'Bunnings', totalAmount: '42' }).returning();
  await db.insert(jobTemplates).values({ userId: u.id, label: 'Template' });
  await db.insert(xeroTokens).values({ userId: u.id, accessToken: 'a', refreshToken: 'r', tenantId: 't', expiresAt: new Date() } as any);
  await db.insert(userSettings).values({ userId: u.id, businessName: `Biz ${tag}` });
  await db.insert(aiGenerations).values({ userId: u.id, quoteId: q.id, input: '{}', response: '{}' });
  await db.insert(priceListItems).values({ userId: u.id, item: 'Reinforcing mesh SL82', quantity: '4', unit: 'sheet', unitPrice: '128.50' });
  await db.insert(priceListItems).values({ userId: u.id, item: 'Tie wire', unit: 'roll', unitPrice: '12.50', source: 'receipt', receiptId: rc.id, supplier: 'Bunnings' });
  await db.insert(priceMatches).values({ userId: u.id, lineKey: 'sl82 mesh 6x2.4', supplierKey: 'bunnings', item: 'Reinforcing mesh SL82', unit: 'sheet', factor: '1' });
  await db.insert(unsurePriceLines).values({ userId: u.id, receiptId: rc.id, lineIndex: 0, lineText: 'MYSTERY ITEM', quantity: '1', perUnit: '10' });
  await db.insert(sessions).values({ sid: `sid-${tag}-${stamp}`, sess: { localUserId: u.id, cookie: {} }, expire: new Date(Date.now() + 3600_000) });
  return u.id;
}

/** Rows belonging to a user, per table. */
async function counts(userId: string): Promise<Record<string, number>> {
  const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0].n);
  const myQuotes = sql`(select id from quotes where user_id = ${userId})`;
  return {
    users: await n(db.select({ n: sql<number>`count(*)` }).from(users).where(eq(users.id, userId))),
    sessions: await n(db.select({ n: sql<number>`count(*)` }).from(sessions).where(sql`${sessions.sess} ->> 'localUserId' = ${userId}`)),
    customers: await n(db.select({ n: sql<number>`count(*)` }).from(customers).where(eq(customers.userId, userId))),
    jobs: await n(db.select({ n: sql<number>`count(*)` }).from(jobs).where(eq(jobs.userId, userId))),
    quotes: await n(db.select({ n: sql<number>`count(*)` }).from(quotes).where(eq(quotes.userId, userId))),
    quote_items: await n(db.select({ n: sql<number>`count(*)` }).from(quoteItems).where(sql`${quoteItems.quoteId} in ${myQuotes}`)),
    portal_feedback: await n(db.select({ n: sql<number>`count(*)` }).from(portalFeedback).where(sql`${portalFeedback.quoteId} in ${myQuotes}`)),
    invoices: await n(db.select({ n: sql<number>`count(*)` }).from(invoices).where(eq(invoices.userId, userId))),
    customer_messages: await n(db.select({ n: sql<number>`count(*)` }).from(customerMessages).where(eq(customerMessages.userId, userId))),
    receipts: await n(db.select({ n: sql<number>`count(*)` }).from(receipts).where(eq(receipts.userId, userId))),
    job_templates: await n(db.select({ n: sql<number>`count(*)` }).from(jobTemplates).where(eq(jobTemplates.userId, userId))),
    xero_tokens: await n(db.select({ n: sql<number>`count(*)` }).from(xeroTokens).where(eq(xeroTokens.userId, userId))),
    user_settings: await n(db.select({ n: sql<number>`count(*)` }).from(userSettings).where(eq(userSettings.userId, userId))),
    ai_generations: await n(db.select({ n: sql<number>`count(*)` }).from(aiGenerations).where(eq(aiGenerations.userId, userId))),
    price_list_items: await n(db.select({ n: sql<number>`count(*)` }).from(priceListItems).where(eq(priceListItems.userId, userId))),
    price_matches: await n(db.select({ n: sql<number>`count(*)` }).from(priceMatches).where(eq(priceMatches.userId, userId))),
    unsure_price_lines: await n(db.select({ n: sql<number>`count(*)` }).from(unsurePriceLines).where(eq(unsurePriceLines.userId, userId))),
  };
}

let other = '';
after(async () => {
  if (other) await storage.deleteAccount(other);
  await pool.end();
});

test('deleting an account removes every row it owns and nothing of anyone else', async () => {
  const doomed = await seedUser('a');
  other = await seedUser('b');

  const before = await counts(doomed);
  for (const [table, n] of Object.entries(before)) assert.ok(n > 0, `seed missing a ${table} row`);
  const otherBefore = await counts(other);

  await storage.deleteAccount(doomed);

  const afterDelete = await counts(doomed);
  for (const [table, n] of Object.entries(afterDelete)) assert.equal(n, 0, `${table} still has rows for the deleted user`);
  assert.deepEqual(await counts(other), otherBefore, "the other user's rows changed");
});
