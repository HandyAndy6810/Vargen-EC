/**
 * The price list against a real database (docs/pricing-design.md, step 2):
 * a quote's first send learns the prices the tradie changed, once, and stores
 * only item, quantity, unit, unit price, date and supplier.
 *
 *   npm run test:db   (dev database only; see account-deletion.test.ts)
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, pool } from '../db';
import { storage } from '../storage';
import { users, quotes, aiGenerations, priceListItems } from '../../shared/schema';
import { newestPrices, priceFor } from '../../shared/price-list';

const stamp = Date.now();
let userId = '';
after(async () => {
  if (userId) await storage.deleteAccount(userId);
  await pool.end();
});

test('first send learns the changed lines, once; untouched lines are ignored', async () => {
  const [u] = await db.insert(users).values({ email: `prices-${stamp}@example.com`, password: 'x' }).returning();
  userId = u.id;
  const [q] = await db.insert(quotes).values({ userId, totalAmount: '0', status: 'draft' }).returning();
  const ai = {
    items: [
      { description: 'Reinforcing mesh SL82', quantity: 4, unit: 'sheet', unitPrice: 165, unitCost: 110, category: 'material' },
      { description: 'Bar chairs', quantity: 2, unit: 'bag', unitPrice: 30, unitCost: 20, category: 'material' },
      { description: 'Labour', quantity: 8, unit: 'hr', unitPrice: 85, unitCost: 0, category: 'labour' },
    ],
  };
  await db.insert(aiGenerations).values({ userId, quoteId: q.id, input: '{}', response: JSON.stringify(ai) });
  const sent = JSON.stringify({
    customerName: 'Sarah Johnson',
    items: [
      { ...ai.items[0], unitCost: 128.5, unitPrice: 192.75 }, // changed
      ai.items[1],                                            // untouched
      { ...ai.items[2], unitPrice: 80 },                      // labour: never
    ],
  });

  assert.equal(await storage.snapshotSentGeneration(userId, q.id, sent), true);
  assert.equal(await storage.learnPricesFromSentQuote(userId, q.id, sent), 1);
  // A second send of the same quote doesn't snapshot again, so the route doesn't learn again.
  assert.equal(await storage.snapshotSentGeneration(userId, q.id, sent), false);

  const rows = await db.select().from(priceListItems).where(eq(priceListItems.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].item, 'Reinforcing mesh SL82');
  assert.equal(Number(rows[0].unitPrice), 128.5);
  assert.equal(rows[0].supplier, null);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['id', 'item', 'priceDate', 'quantity', 'supplier', 'unit', 'unitPrice', 'userId']);

  // The next quote finds it as "your price".
  const list = newestPrices(await storage.getPriceList(userId));
  assert.equal(priceFor(list, { description: 'reinforcing mesh SL82', unit: 'sheets' })?.unitPrice, 128.5);
});
