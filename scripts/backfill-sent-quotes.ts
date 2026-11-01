/**
 * Give every quote that has gone out a working customer link and a sent date.
 *
 * Until the create route ran the first-send logic, a quote sent straight from the
 * Review screen (the normal way) was created as "sent" with no share_token and no
 * sent_at: no portal link to accept or decline, no send date. This fills those in
 * for quotes whose status means they were sent (sent, viewed, accepted, declined,
 * rejected, invoiced):
 *  - share_token: a new UUID when missing;
 *  - sent_at: when missing, the quote's created_at (quotes have no updated_at).
 * It never adds a follow-up schedule: reminders for quotes sent months ago would be
 * wrong. The decision per quote is backfillSentFields in server/lib/quote-send.ts
 * (tested).
 *
 * Idempotent: a second run finds nothing to do.
 *
 *   npx tsx scripts/backfill-sent-quotes.ts --dry-run
 *   npx tsx scripts/backfill-sent-quotes.ts --confirm
 *
 * Uses the same database rule as the server (server/lib/database-url.ts): with no
 * flag that's APP_DATABASE_URL, which is PRODUCTION on Replit; prefix with
 * VARGEN_DB_TARGET=dev for the dev branch. It prints the host first and refuses to
 * write without --confirm.
 */
import { db, pool } from '../server/db';
import { resolveDatabaseUrl, describeDatabase } from '../server/lib/database-url';
import { backfillSentFields, SENT_STATUSES } from '../server/lib/quote-send';
import { quotes } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRMED = process.argv.includes('--confirm');

async function main() {
  console.log(`database: ${describeDatabase(resolveDatabaseUrl())}`);
  console.log(`mode:     ${DRY_RUN ? 'DRY RUN — nothing will be written' : 'WRITE'}`);
  if (!DRY_RUN && !CONFIRMED) {
    console.error('\nRefusing to write without --confirm. Re-run with --dry-run first,');
    console.error('read the summary, take a snapshot, then add --confirm.');
    process.exit(1);
  }
  console.log('');

  const sent = await db.select().from(quotes).where(inArray(quotes.status, SENT_STATUSES)).orderBy(quotes.id);
  const count = (rows: typeof sent) => ({
    noToken: rows.filter(q => !q.shareToken).length,
    noSentAt: rows.filter(q => !q.sentAt).length,
  });
  const before = count(sent);
  console.log(`before: ${sent.length} sent-or-later quotes; ${before.noToken} with no share_token, ${before.noSentAt} with no sent_at`);

  let fixed = 0;
  for (const q of sent) {
    const patch = backfillSentFields(q);
    if (!patch) continue;
    fixed++;
    const what = [
      patch.shareToken ? 'share_token' : null,
      patch.sentAt ? `sent_at=${patch.sentAt.toISOString()}` : null,
    ].filter(Boolean).join(', ');
    console.log(`quote ${String(q.id).padStart(4)} [${q.status}] — ${DRY_RUN ? 'would set' : 'set'} ${what}`);
    if (!DRY_RUN) await db.update(quotes).set(patch).where(eq(quotes.id, q.id));
  }

  if (DRY_RUN) {
    console.log(`\nwould fix ${fixed} quote${fixed === 1 ? '' : 's'}. Nothing written.`);
  } else {
    const after = count(await db.select().from(quotes).where(inArray(quotes.status, SENT_STATUSES)));
    console.log(`\nfixed ${fixed}. after: ${after.noToken} with no share_token, ${after.noSentAt} with no sent_at`);
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
