/**
 * Link old quotes and invoices to their customer by name (round 2, c2).
 *
 * Before round 2, a quote could be saved with a typed customer name and no
 * customer record attached, so it never showed in that customer's history.
 * New saves now link themselves (server/routes.ts, linkTypedCustomer). This
 * fixes the ones already saved.
 *
 * The rules:
 *  - Only quotes and invoices with NO customer set are touched.
 *  - The name comes from:
 *      - a quote: the name typed on it (content.customerName);
 *      - an invoice: its quote's customer, otherwise a "Customer: <name>" first
 *        line in its notes, otherwise its quote's typed name.
 *  - A link is made only when exactly ONE of that tradie's own customers has the
 *    name (case and spaces ignored). Several with the name: skipped and listed.
 *    None: skipped.
 *  - It never creates customers and never changes anything else.
 *  - Idempotent: a second run finds nothing left to link.
 *
 *   VARGEN_DB_TARGET=dev npx tsx scripts/link-quote-customers.ts --dry-run
 *   VARGEN_DB_TARGET=dev npx tsx scripts/link-quote-customers.ts --confirm
 *
 * Uses the same database rule as the server (server/lib/database-url.ts). With
 * no VARGEN_DB_TARGET that's APP_DATABASE_URL, which is PRODUCTION on Replit.
 * It prints the host it connected to and refuses to write without --confirm.
 * Run it on dev first, read the output, and take a Neon snapshot before
 * running it anywhere else.
 */
import { db, pool } from '../server/db';
import { resolveDatabaseUrl, describeDatabase } from '../server/lib/database-url';
import { quotes, invoices, customers } from '../shared/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { uniqueNameMatch } from '../shared/customer-fields';

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRMED = process.argv.includes('--confirm');

function typedQuoteName(content: string | null): string | null {
  if (!content) return null;
  try {
    const name = JSON.parse(content)?.customerName;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

/** "Customer: Sarah Johnson" as the first line of an invoice's notes (the AI invoice route writes it). */
function notesName(notes: string | null): string | null {
  const m = /^Customer:\s*(.+)$/m.exec((notes || '').split('\n')[0] || '');
  return m ? m[1].trim() : null;
}

async function main() {
  console.log(`database: ${describeDatabase(resolveDatabaseUrl())}`);
  console.log(`mode:     ${DRY_RUN ? 'DRY RUN, nothing will be written' : 'WRITE'}`);
  if (!DRY_RUN && !CONFIRMED) {
    console.error('\nRefusing to write without --confirm. Run with --dry-run first,');
    console.error('read what it would link, take a snapshot, then add --confirm.');
    process.exit(1);
  }
  console.log('');

  const allCustomers = await db.select({ id: customers.id, userId: customers.userId, name: customers.name }).from(customers);
  const byUser = new Map<string, typeof allCustomers>();
  for (const c of allCustomers) {
    if (!c.userId) continue;
    byUser.set(c.userId, [...(byUser.get(c.userId) ?? []), c]);
  }

  let linked = 0, ambiguous = 0, noMatch = 0, noName = 0;
  // A quote linked in this run, so its invoice can follow it even on a dry run.
  const quoteCustomer = new Map<number, number>();

  const report = (kind: string, id: number, userId: string | null, name: string | null, mine: typeof allCustomers) => {
    if (!name) { noName++; return null; }
    const r = uniqueNameMatch(mine, name);
    if (r.match) {
      console.log(`  link    ${kind} #${id} "${name}" -> customer #${r.match.id} "${r.match.name}"`);
      return r.match.id;
    }
    if (r.reason === 'ambiguous') {
      ambiguous++;
      console.log(`  SKIP    ${kind} #${id} "${name}": ${r.count} customers share that name (user ${String(userId).slice(0, 8)}…). Pick one in the app.`);
    } else {
      noMatch++;
    }
    return null;
  };

  console.log('Quotes with no customer:');
  const looseQuotes = await db.select().from(quotes).where(isNull(quotes.customerId)).orderBy(quotes.id);
  for (const q of looseQuotes) {
    const mine = byUser.get(q.userId ?? '') ?? [];
    const id = report('quote', q.id, q.userId, typedQuoteName(q.content), mine);
    if (id == null) continue;
    quoteCustomer.set(q.id, id);
    linked++;
    if (!DRY_RUN) {
      await db.update(quotes).set({ customerId: id })
        .where(and(eq(quotes.id, q.id), isNull(quotes.customerId)));
    }
  }

  console.log('\nInvoices with no customer:');
  const looseInvoices = await db.select().from(invoices).where(isNull(invoices.customerId)).orderBy(invoices.id);
  const quotesById = new Map((await db.select({ id: quotes.id, customerId: quotes.customerId, content: quotes.content }).from(quotes)).map((q) => [q.id, q]));
  for (const inv of looseInvoices) {
    const fromQuote = inv.quoteId ? (quoteCustomer.get(inv.quoteId) ?? quotesById.get(inv.quoteId)?.customerId ?? null) : null;
    let id: number | null = null;
    if (fromQuote) {
      id = fromQuote;
      console.log(`  link    invoice #${inv.id} -> customer #${id} (from quote #${inv.quoteId})`);
    } else {
      const mine = byUser.get(inv.userId ?? '') ?? [];
      const name = notesName(inv.notes) ?? (inv.quoteId ? typedQuoteName(quotesById.get(inv.quoteId)?.content ?? null) : null);
      id = report('invoice', inv.id, inv.userId, name, mine);
    }
    if (id == null) continue;
    linked++;
    if (!DRY_RUN) {
      await db.update(invoices).set({ customerId: id })
        .where(and(eq(invoices.id, inv.id), isNull(invoices.customerId)));
    }
  }

  console.log('');
  console.log(`${DRY_RUN ? 'would link' : 'linked'}: ${linked}`);
  console.log(`skipped, several customers share the name: ${ambiguous}`);
  console.log(`skipped, no customer has the name: ${noMatch}`);
  console.log(`skipped, no name on it: ${noName}`);
  console.log('No customers were created.');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
