/**
 * Quick setup (docs/pricing-design.md, step 3) is offered once: after sign up
 * for a new tradie, on their next visit to the app for an existing one. The
 * server remembers it (user_settings.quick_setup_seen_at); this remembers it
 * for the current run, so the tab layout never pushes a second copy while the
 * first is open or before the server has caught up.
 */
let offered = false;
export const quickSetupOffered = () => offered;
export const markQuickSetupOffered = () => { offered = true; };

/**
 * Whether to offer it: the server says it never has. `undefined` settings are
 * still loading. An older server sends no quickSetupSeenAt key at all; then
 * nothing is offered, because it couldn't save the answer.
 */
export function shouldOfferQuickSetup(settings: unknown): boolean {
  if (offered || settings === undefined) return false;
  if (settings === null) return true; // a brand new account has no settings row yet
  const s = settings as Record<string, unknown>;
  return 'quickSetupSeenAt' in s && s.quickSetupSeenAt == null;
}
