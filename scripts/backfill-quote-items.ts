/**
 * Rebuild every quote's quote_items rows from its own content.
 *
 * Two problems in the live data this repairs:
 *
 *  1. Fractional quantities were dropped. quote_items.quantity was an integer, so
 *     a "0.5 hr cleanup" line failed to insert and the mobile save loop swallowed
 *     the error — the line is in content and missing from the rows. Seen on live
 *     quotes #5 (1.5) and #27 (0.5), and the AI prompt asks for at least fifteen
 *     minutes of cleanup, so most AI quotes carry one.
 *
 *  2. Older rows stored the LINE TOTAL in price rather than the unit price, so
 *     quantity * price double-counts them. content.items[].unitPrice is correct
 *     for those quotes — its sum matches quotes.total_amount.
 *
 * Content is authoritative throughout: every screen, the PDF and the totals all
 * read it. The rows are derived from it, by the same function the server now uses
 * on save, so a backfilled quote and a freshly saved one end up identical.
 *
 * Also rounds quotes.total_amount to two decimals. Some rows carry float noise
 * like 2886.5999999999995 from before the money maths was centralised.
 *
 * Idempotent: running it twice changes nothing the second time.
 *
 *   npx tsx scripts/backfill-quote-items.ts --dry-run
 *   npx tsx scripts/backfill-quote-items.ts
 *
 * Reads APP_DATABASE_URL (falling back to DATABASE_URL) — check which database
 * that is before running. It prints the host it connected to and refuses to write
 * without --confirm.
 */
import { db, pool } from '../server/db';
import { quotes, quoteItems } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { quoteItemRowsFromContent, quoteItemRowsTotal } from '../shared/quote-items';
import { round2, num } from '../shared/money';

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRMED = process.argv.includes('--confirm');

const money = (n: number) => `$${n.toFixed(2)}`;

async function main() {
  const conn = process.env.APP_DATABASE_URL || process.env.DATABASE_URL || '';
  let host = '(unparseable)';
  try { host = new URL(conn).hostname; } catch { /* leave it */ }

  console.log(`database: ${host}`);
  console.log(`mode:     ${DRY_RUN ? 'DRY RUN — nothing will be written' : 'WRITE'}`);

  if (!DRY_RUN && !CONFIRMED) {
    console.error('\nRefusing to write without --confirm. Re-run with --dry-run first,');
    console.error('read the summary, take a snapshot, then add --confirm.');
    process.exit(1);
  }
  console.log('');

  const all = await db.select().from(quotes).orderBy(quotes.id);

  let changedRows = 0, changedTotals = 0, skipped = 0, reconciled = 0, mismatched = 0;

  for (const q of all) {
    const rows = quoteItemRowsFromContent(q.content);
    if (rows === null) {
      skipped++;
      console.log(`quote ${String(q.id).padStart(3)} — no items in content, left alone`);
      continue;
    }

    const existing = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, q.id));
    const beforeTotal = round2(existing.reduce((s, r) => s + num(r.quantity) * num(r.price), 0));
    const afterTotal = quoteItemRowsTotal(rows);

    const storedTotal = round2(num(q.totalAmount));
    const roundedTotal = round2(num(q.totalAmount));
    const totalNeedsRounding = String(q.totalAmount) !== String(roundedTotal);

    const rowsDiffer =
      existing.length !== rows.length ||
      existing.some((r, i) =>
        r.description !== rows[i].description ||
        num(r.quantity) !== rows[i].quantity ||
        num(r.price) !== rows[i].price,
      );

    // Does the rebuilt set agree with what the quote says it is worth?
    const subtotalFromContent = (() => {
      try {
        const c = JSON.parse(String(q.content));
        return c?.subtotal !== undefined ? round2(num(c.subtotal)) : null;
      } catch { return null; }
    })();
    const agrees = subtotalFromContent === null || Math.abs(afterTotal - subtotalFromContent) <= 0.01;
    if (agrees) reconciled++; else mismatched++;

    if (!rowsDiffer && !totalNeedsRounding) continue;

    console.log(
      `quote ${String(q.id).padStart(3)} — rows ${existing.length} → ${rows.length}, ` +
      `sum ${money(beforeTotal)} → ${money(afterTotal)}` +
      (subtotalFromContent !== null ? ` (content subtotal ${money(subtotalFromContent)}${agrees ? ' ✓' : ' MISMATCH'})` : '') +
      (totalNeedsRounding ? `, total ${q.totalAmount} → ${roundedTotal}` : ''),
    );

    if (!DRY_RUN) {
      await db.transaction(async (tx) => {
        await tx.delete(quoteItems).where(eq(quoteItems.quoteId, q.id));
        if (rows.length) {
          await tx.insert(quoteItems).values(rows.map(r => ({
            quoteId: q.id,
            description: r.description,
            quantity: String(r.quantity),
            price: String(r.price),
          })));
        }
        if (totalNeedsRounding) {
          await tx.update(quotes).set({ totalAmount: String(roundedTotal) }).where(eq(quotes.id, q.id));
        }
      });
    }

    if (rowsDiffer) changedRows++;
    if (totalNeedsRounding) changedTotals++;
  }

  console.log('');
  console.log(`quotes seen:              ${all.length}`);
  console.log(`rows rebuilt:             ${changedRows}`);
  console.log(`totals rounded:           ${changedTotals}`);
  console.log(`skipped (no content items): ${skipped}`);
  console.log(`rows reconcile to subtotal: ${reconciled}`);
  console.log(`rows DISAGREE with subtotal: ${mismatched}${mismatched ? '  <- investigate before writing' : ''}`);
  if (DRY_RUN) console.log('\nDry run — nothing was written.');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
