/**
 * What happens the first time a quote is sent, whichever way it gets there: a
 * PATCH to status "sent", or a new quote created already sent (the normal path from
 * the Review screen, which used to skip all of this — no share link, no sent date,
 * no follow-ups). One function, so the two paths can't drift apart again.
 */

export type SentFields = { shareToken?: string; sentAt?: Date; followUpSchedule?: string };

/**
 * The fields to add when a quote is sent. Only fills what is missing: a quote sent
 * again keeps its link (already in the customer's inbox), its first sent date, and
 * its existing follow-up schedule.
 *
 * `existing` is the quote as stored, or null for one being created.
 */
export function firstSendFields(
  existing: { shareToken?: string | null; sentAt?: Date | string | null; followUpSchedule?: string | null } | null,
  settings: { followUpEnabled?: boolean | null; followUpDays?: string | null } | null | undefined,
  opts: { now?: Date; newToken?: () => string } = {},
): SentFields {
  const now = opts.now ?? new Date();
  const newToken = opts.newToken ?? (() => crypto.randomUUID());
  const out: SentFields = {};
  if (!existing?.shareToken) out.shareToken = newToken();
  if (!existing?.sentAt) out.sentAt = now;
  if (!existing?.followUpSchedule && settings?.followUpEnabled) {
    try {
      const days = JSON.parse(settings.followUpDays || "[3,7,14]");
      if (Array.isArray(days)) {
        out.followUpSchedule = JSON.stringify(days.map((day: number) => ({ day, status: "pending" })));
      }
    } catch { /* a malformed setting means no reminders, not a failed send */ }
  }
  return out;
}

/**
 * Where the customer's link points. PUBLIC_APP_URL when set (the address
 * customers should see), else the request's own origin. trust proxy is on, so
 * behind Replit's HTTPS proxy the request's protocol is the forwarded "https".
 */
export function publicBaseUrl(
  env: Record<string, string | undefined>,
  req: { protocol: string; get(name: string): string | undefined },
): string {
  const configured = env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

/** The quote as the app sees it: with a ready-made portalUrl once it has a share token. */
export function withPortalUrl<T extends { shareToken?: string | null }>(
  quote: T,
  base: string,
): T & { portalUrl?: string } {
  if (!quote?.shareToken) return quote;
  return { ...quote, portalUrl: `${base}/portal/${encodeURIComponent(quote.shareToken)}` };
}

/** Statuses a quote can only have reached by being sent. */
export const SENT_STATUSES = ['sent', 'viewed', 'accepted', 'declined', 'rejected', 'invoiced'];

/**
 * Repairs for a quote that went out before the create route ran the first-send
 * logic (scripts/backfill-sent-quotes.ts): a share token if it has none, so it gets
 * a working link, and a sent date if it has none, taken from when it was created
 * (quotes have no updated_at). Never a follow-up schedule: reminders for quotes
 * sent months ago would be wrong. Null when nothing needs doing, which is what
 * makes running it twice a no-op.
 */
export function backfillSentFields(
  q: { status?: string | null; shareToken?: string | null; sentAt?: Date | string | null; createdAt?: Date | string | null },
  newToken: () => string = () => crypto.randomUUID(),
): { shareToken?: string; sentAt?: Date } | null {
  if (!q.status || !SENT_STATUSES.includes(q.status)) return null;
  const out: { shareToken?: string; sentAt?: Date } = {};
  if (!q.shareToken) out.shareToken = newToken();
  if (!q.sentAt && q.createdAt) out.sentAt = new Date(q.createdAt);
  return Object.keys(out).length ? out : null;
}
