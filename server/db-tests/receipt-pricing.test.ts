/**
 * Receipts feeding the price list against a real database, with the AI
 * stubbed (docs/pricing-design.md, step 4). Made-up receipts in supplier
 * style; there are no real supplier invoices to test with.
 *
 *   npm run test:db   (dev database only; see account-deletion.test.ts)
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, pool } from '../db';
import { storage } from '../storage';
import { users, userSettings, priceListItems, priceMatches, unsurePriceLines } from '../../shared/schema';
import { priceReceipt } from '../lib/receipt-prices';
import { newestPrices, priceFor } from '../../shared/price-list';
import { resolveQuoteMatches } from '../lib/quote-prices';

const stamp = Date.now();
let userId = '';
let aiCalls = 0;
after(async () => {
  if (userId) await storage.deleteAccount(userId);
  await pool.end();
});

/**
 * A stand-in for the AI: reads the batched prompt and answers the way a good
 * model would for these lines. It only ever picks from the candidates it was
 * given, and never sends a price.
 */
const stubAi = async (_system: string, user: string) => {
  aiCalls++;
  const { lines, candidates } = JSON.parse(user) as { lines: { line: number; text: string }[]; candidates: { candidate: number; item: string; unit: string }[] };
  const find = (re: RegExp) => candidates.find((c) => re.test(c.item))?.candidate ?? null;
  const matches = lines.map((l) => {
    const t = l.text.toUpperCase();
    if (t.includes('SL82')) return { line: l.line, candidate: find(/^Reinforcing mesh SL82/), category: 'material', confidence: 0.94 };
    if (t.includes('N12 BAR')) return { line: l.line, candidate: find(/^Reo bar$/), category: 'material', confidence: 0.9 };
    if (t.includes('PINE TREATED')) return { line: l.line, candidate: find(/^Framing timber$/), category: 'material', confidence: 0.6 }; // unsure
    if (t.includes('RAPID SET')) return { line: l.line, candidate: find(/^Rapid set post concrete$/), category: 'material', confidence: 0.92 };
    if (t.includes('SCREW BATTEN')) return { line: l.line, candidate: null, category: 'material', confidence: 0.5 };
    if (t.includes('UNLEADED') || t.includes('PIE')) return { line: l.line, candidate: null, category: 'not_a_material', confidence: 0.97 };
    return { line: l.line, candidate: null, category: 'unsure', confidence: 0.3 };
  });
  return JSON.stringify({ matches });
};

const TRADE = {
  vendor: 'Bunnings Trade', receiptDate: '2026-10-20', category: 'Materials', totalAmount: '1083.40', pricesIncludeGst: true,
  items: JSON.stringify([
    { description: 'SL82 MESH 6X2.4', quantity: 4, unit: 'EA', unitPrice: 141.35, amount: 565.40 },
    { description: 'N12 BAR 6M', quantity: 10, unit: 'EA', unitPrice: 16.39, amount: 163.90 },
    { description: 'PINE TREATED 90X45 H3 4.8M', quantity: 6, unit: 'EA', unitPrice: 19.69, amount: 118.14 },
    { description: 'RAPID SET CONCRETE 20KG', quantity: 12, unit: 'BAG', unitPrice: 10.95, amount: 131.40 },
    { description: 'SCREW BATTEN 14G BOX 100', quantity: 1, unit: 'EA', unitPrice: 54.56, amount: 54.56 },
    { description: 'GUSSET PIE', quantity: 1, unit: 'EA', amount: 0 },
    { description: 'TIE WIRE', quantity: 2, unit: 'EA', unitPrice: 27.50, amount: 50.00, lineDiscount: 5 },
  ]),
};

const prices = async () => db.select().from(priceListItems).where(eq(priceListItems.userId, userId));

test('a trade receipt teaches ex-GST prices; uncertain lines wait; the same line never asks twice', async () => {
  const [u] = await db.insert(users).values({ email: `rcpt-${stamp}@example.com`, password: 'x' }).returning();
  userId = u.id;
  // A concreter who also does fences: both trades' catalogues are candidates.
  await db.insert(userSettings).values({ userId, tradeType: 'Fencing' });
  // They've priced tie wire before (quick setup), so it matches plainly.
  await storage.addPrices(userId, [{ item: 'Tie wire', quantity: null, unit: 'roll', unitPrice: 20 }], { source: 'quick_setup' });

  const r = await storage.createReceipt({ ...TRADE, userId } as any);
  aiCalls = 0;
  const out = await priceReceipt(userId, r.id, stubAi);
  assert.equal(aiCalls, 1, 'one AI call for the whole receipt');
  assert.equal(out.skipped, null);
  // Mesh, bar, concrete (AI, confident) + tie wire (plain). Pine (low confidence) and screws (no candidate) wait.
  assert.equal(out.saved, 4);
  assert.deepEqual(out.unsure.map((u) => u.text).sort(), ['PINE TREATED 90X45 H3 4.8M', 'SCREW BATTEN 14G BOX 100']);

  const list = newestPrices(await storage.getPriceList(userId));
  const mesh = priceFor(list, { description: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet' })!;
  assert.equal(mesh.unitPrice, 128.5);                 // $141.35 inc GST / 1.1
  assert.equal(mesh.supplier, 'Bunnings Trade');
  assert.equal(new Date(mesh.priceDate).toISOString().slice(0, 10), '2026-10-20'); // the receipt's date
  assert.equal(priceFor(list, { description: 'Reo bar', unit: 'length' })!.unitPrice, 14.9);
  assert.equal(priceFor(list, { description: 'Rapid set post concrete', unit: 'bag' })!.unitPrice, 9.95);
  // Tie wire: the receipt taught $22.73 ($25 paid after $5 off, / 1.1), but quick setup's $20 is dated today,
  // newer than this 20 Oct receipt, so it still wins (newest real price).
  const tie = (await prices()).find((p) => p.item === 'Tie wire' && p.source === 'receipt')!;
  assert.equal(Number(tie.unitPrice), 22.73);
  assert.equal(priceFor(list, { description: 'Tie wire', unit: 'roll' })!.unitPrice, 20);
  for (const row of await prices()) {
    for (const k of Object.keys(row)) assert.ok(['id', 'userId', 'item', 'quantity', 'unit', 'unitPrice', 'priceDate', 'supplier', 'source', 'receiptId'].includes(k), k);
  }

  // The confident AI matches are remembered; the next scan of these lines needs no AI.
  assert.equal((await db.select().from(priceMatches).where(eq(priceMatches.userId, userId))).length, 3);

  // Saving the same receipt again doesn't duplicate anything.
  aiCalls = 0;
  const again = await priceReceipt(userId, r.id, stubAi);
  assert.equal(again.saved, 4);
  assert.equal((await prices()).filter((p) => p.receiptId === r.id).length, 4);
  assert.equal((await storage.listUnsure(userId, r.id)).length, 2);

  // Sort the screws: "It's something else" → Deck screws, a box. Remembered for Bunnings.
  const screws = (await storage.listUnsure(userId, r.id)).find((x) => x.lineText.startsWith('SCREW'))!;
  await storage.rememberMatch(userId, { lineKey: 'screw batten 14g box 100', supplierKey: 'bunnings trade', item: 'Deck screws', unit: 'box', factor: 1, ignore: false });
  await storage.deleteUnsure(userId, screws.id);
  // Scanning it again: priced with no question, and no AI call for it.
  const third = await priceReceipt(userId, r.id, stubAi);
  assert.equal(third.saved, 5);
  assert.deepEqual(third.unsure.map((u) => u.text), ['PINE TREATED 90X45 H3 4.8M']);

  // Deleting the receipt removes the prices it alone taught; quick setup's stays.
  await storage.deleteReceipt(r.id, userId);
  const left = await prices();
  assert.deepEqual(left.map((p) => p.source), ['quick_setup']);
  assert.equal((await db.select().from(unsurePriceLines).where(eq(unsurePriceLines.userId, userId))).length, 0);
});

test('a fuel receipt, a misread total and a whole-receipt discount teach nothing', async () => {
  const before = (await prices()).length;
  aiCalls = 0;
  const fuel = await storage.createReceipt({ userId, vendor: 'Ampol', receiptDate: '2026-10-21', category: 'Fuel', totalAmount: '98.99', items: JSON.stringify([{ description: 'UNLEADED 91', quantity: 52.1, unit: 'L', amount: 98.99 }]) } as any);
  assert.equal((await priceReceipt(userId, fuel.id, stubAi)).skipped, 'not_materials');
  const misread = await storage.createReceipt({ ...TRADE, userId, totalAmount: '108.34' } as any);
  assert.equal((await priceReceipt(userId, misread.id, stubAi)).skipped, 'mismatch');
  const disc = await storage.createReceipt({ ...TRADE, userId, receiptDiscount: '25.00' } as any);
  assert.equal((await priceReceipt(userId, disc.id, stubAi)).skipped, 'receipt_discount');
  assert.equal((await prices()).length, before);
  assert.equal(aiCalls, 0, 'skipped receipts never reach the AI');
});

test('an older receipt never beats a newer price; the next quote uses the receipt price', async () => {
  const newer = await storage.createReceipt({ ...TRADE, userId, receiptDate: '2026-11-05', items: JSON.stringify([{ description: 'SL82 MESH 6X2.4', quantity: 2, unit: 'EA', unitPrice: 154, amount: 308 }]), totalAmount: '308' } as any);
  await priceReceipt(userId, newer.id, stubAi);
  const older = await storage.createReceipt({ ...TRADE, userId, receiptDate: '2026-09-01', items: JSON.stringify([{ description: 'SL82 MESH 6X2.4', quantity: 2, unit: 'EA', unitPrice: 132, amount: 264 }]), totalAmount: '264' } as any);
  await priceReceipt(userId, older.id, stubAi);
  const list = newestPrices(await storage.getPriceList(userId));
  assert.equal(priceFor(list, { description: 'Reinforcing mesh SL82 (6 × 2.4 m)', unit: 'sheet' })!.unitPrice, 140); // 154 / 1.1, the newer

  // An AI quote line worded differently gets it through the matcher.
  const quoteAi = async (_s: string, user: string) => {
    const { candidates } = JSON.parse(user) as { candidates: { candidate: number; item: string }[] };
    const mesh = candidates.find((c) => c.item.startsWith('Reinforcing mesh SL82'))!.candidate;
    return JSON.stringify({ matches: [{ line: 0, candidate: mesh, category: 'material', confidence: 0.93 }] });
  };
  const rows = await storage.getPriceList(userId);
  const m = await resolveQuoteMatches([{ description: 'SL82 mesh sheet', unit: 'sheet', category: 'material' }], rows, await storage.getRememberedMatches(userId), quoteAi);
  assert.equal(m[0]?.row.unitPrice, 140);
});
