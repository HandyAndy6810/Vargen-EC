/**
 * The offline outbox: new quotes saved on the phone while there was no connection,
 * waiting to reach the server. The storage lives in mobile/lib/quote-outbox.ts;
 * the rules for draining it live here, pure, so they can be tested.
 *
 * Exactly-once comes from two halves:
 *  - the server: each entry's body carries its clientId, and creating a quote
 *    with a clientId it has already seen returns that quote instead of a second;
 *  - here: an entry is only removed after the server confirms it.
 * So a sync interrupted at any point (app killed, signal lost mid-request) is
 * simply retried, and the retry finds the quote it already made.
 */

export type OutboxEntry = {
  /** Sent as the quote's clientId; the server's duplicate check. */
  clientId: string;
  /** The exact POST /api/quotes body, built by the same code as an online save. */
  body: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
  /** The account that saved it; only that account's session ever sends it. */
  userId?: string;
};

export type SendResult =
  | { ok: true }
  /** offline: no connection, so stop and try the whole queue again later. */
  | { ok: false; offline: boolean; error: string };

/**
 * Send entries in order, one at a time. Success removes an entry. No connection
 * stops the run (everything after it would fail the same way). Any other failure,
 * such as a rejected body, is recorded on the entry and the run moves on, so one
 * bad entry can't hold the rest back forever.
 *
 * `save` is called with the remaining queue after every entry, so an interruption
 * never loses track of what already went.
 */
export async function drainOutbox(
  entries: OutboxEntry[],
  send: (entry: OutboxEntry) => Promise<SendResult>,
  save: (remaining: OutboxEntry[]) => Promise<void>,
): Promise<{ synced: number; offline: boolean; remaining: OutboxEntry[] }> {
  let remaining = [...entries];
  let synced = 0;
  for (const entry of entries) {
    const result = await send(entry);
    if (result.ok) {
      remaining = remaining.filter(e => e.clientId !== entry.clientId);
      synced++;
      await save(remaining);
      continue;
    }
    remaining = remaining.map(e => e.clientId === entry.clientId
      ? { ...e, attempts: e.attempts + 1, lastError: result.error }
      : e);
    await save(remaining);
    if (result.offline) return { synced, offline: true, remaining };
  }
  return { synced, offline: false, remaining };
}
