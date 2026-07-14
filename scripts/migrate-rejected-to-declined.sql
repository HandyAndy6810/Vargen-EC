-- One-off cleanup: unify historical quote statuses on 'declined'.
-- The portal used to write 'rejected'; the app always wrote 'declined'.
-- Both are handled by the UI, so this is optional hygiene, not a fix.
-- Run against the Neon DB (e.g. via Replit shell / psql / Drizzle Studio):
UPDATE quotes SET status = 'declined' WHERE status = 'rejected';
