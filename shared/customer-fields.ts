/**
 * The extra customer details (round 2, c2) and the rules for them, shared by the
 * server's validation, the app's forms and the invoice documents. Pure, tested
 * in customer-fields.test.ts. No drizzle imports, so the app can use it.
 */

export const CUSTOMER_TYPES = ['residential', 'commercial', 'real_estate', 'strata', 'builder'] as const;
export type CustomerType = typeof CUSTOMER_TYPES[number];
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  real_estate: 'Real estate',
  strata: 'Strata',
  builder: 'Builder',
};

export const PREFERRED_CONTACTS = ['call', 'sms', 'email'] as const;
export type PreferredContact = typeof PREFERRED_CONTACTS[number];
export const PREFERRED_CONTACT_LABELS: Record<PreferredContact, string> = {
  call: 'Call',
  sms: 'Text',
  email: 'Email',
};

export const customerTypeLabel = (t: string | null | undefined) =>
  t && t in CUSTOMER_TYPE_LABELS ? CUSTOMER_TYPE_LABELS[t as CustomerType] : null;

/** The ABN as stored: digits only. Spaces (as people type and print it) are dropped. */
export function normaliseAbn(input: string | null | undefined): string {
  return String(input ?? '').replace(/\s+/g, '');
}

/**
 * An ABN is 11 digits after removing spaces, and passes the ATO checksum:
 * subtract 1 from the first digit, weight the digits 10,1,3,5,…,19, and the
 * sum divides by 89. The checksum catches a mistyped digit, so a wrong ABN
 * never reaches an invoice.
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
export function abnProblem(input: string | null | undefined): string | null {
  const abn = normaliseAbn(input);
  if (!abn) return null;
  if (!/^\d{11}$/.test(abn)) return 'An ABN is 11 digits.';
  const digits = abn.split('').map(Number);
  digits[0] -= 1;
  const sum = digits.reduce((acc, d, i) => acc + d * ABN_WEIGHTS[i], 0);
  if (sum % 89 !== 0) return "That ABN doesn't check out. Look for a mistyped digit.";
  return null;
}

/** "51824753556" → "51 824 753 556", the way the ATO prints it. Anything else comes back as given. */
export function formatAbn(input: string | null | undefined): string {
  const abn = normaliseAbn(input);
  return /^\d{11}$/.test(abn) ? `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8)}` : String(input ?? '');
}

/** The address an invoice goes to: the billing address when set, otherwise the site address. */
export function invoiceAddress(c: { billingAddress?: string | null; address?: string | null } | null | undefined): string | null {
  const billing = c?.billingAddress?.trim();
  if (billing) return billing;
  return c?.address?.trim() || null;
}

/** Names compared the way people mean them: case and surrounding/double spaces ignored. */
export const nameKey = (name: string | null | undefined) => String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * The one customer whose name matches, or null when none or several do. Used to
 * link a quote that only has a typed name, and by scripts/link-quote-customers.
 */
export function uniqueNameMatch<T extends { name: string }>(customers: T[], name: string | null | undefined):
  { match: T; reason: 'unique' } | { match: null; reason: 'none' | 'ambiguous' | 'blank'; count: number } {
  const key = nameKey(name);
  if (!key) return { match: null, reason: 'blank', count: 0 };
  const hits = customers.filter((c) => nameKey(c.name) === key);
  if (hits.length === 1) return { match: hits[0], reason: 'unique' };
  return { match: null, reason: hits.length ? 'ambiguous' : 'none', count: hits.length };
}
