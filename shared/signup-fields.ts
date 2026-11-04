/**
 * Sign-up checks (round 2, su2 and su3), shared by the server and the app's
 * register screen so both say the same thing. Pure, tested in
 * signup-fields.test.ts. No package imports: the mobile app's CI installs only
 * mobile/node_modules, which files in shared/ can't see.
 */

// A practical email check (what zod's .email() accepts, minus quoted local parts):
// a local part of the usual characters with no leading, trailing or double dot,
// an @, then dot-separated domain labels ending in a TLD of 2+ letters.
const EMAIL = /^(?!\.)(?!.*\.\.)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]*[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/; // no lookbehind: Hermes

/** Why an email can't be used, or null. Blank counts as missing. */
export function emailProblem(input: string | null | undefined): string | null {
  const v = String(input ?? '').trim();
  if (!v) return 'Enter your email address.';
  return EMAIL.test(v) ? null : 'That email address doesn’t look right. Check for a typo, like a missing @ or dot.';
}

/** Same, for an optional email (business profile): blank is fine. */
export function optionalEmailProblem(input: string | null | undefined): string | null {
  return String(input ?? '').trim() ? emailProblem(input) : null;
}

/**
 * An Australian mobile, in the one form it's stored in: +614XXXXXXXX.
 * Accepts 04XX XXX XXX or +61 4XX XXX XXX (also 614…), with spaces, dashes,
 * dots or brackets. Anything else is null.
 */
export function normaliseAuMobile(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (/[^\d\s+().-]/.test(raw)) return null;
  const plus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!plus && /^04\d{8}$/.test(digits)) return `+61${digits.slice(1)}`;
  if (/^614\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

/** Why a mobile can't be used, or null. Optional: blank is fine. */
export function mobileProblem(input: string | null | undefined): string | null {
  if (!String(input ?? '').trim()) return null;
  return normaliseAuMobile(input) ? null : 'Enter an Australian mobile, like 0412 345 678 or +61 412 345 678.';
}
