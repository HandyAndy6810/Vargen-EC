/**
 * What the phone keeps for offline use (mobile/lib/query-persist.ts): which cached
 * server responses are written to the device, and how settings are trimmed first.
 *
 * Pure and dependency-free so it can be tested here and imported by the app.
 */

/**
 * Query keys whose data is kept on the device: quotes, customers, jobs and invoices
 * (lists, details, a quote's items) and settings. Everything else, including the
 * signed-in user (which has its own cache) and xero/weather/receipts, is not.
 */
const PERSISTED_ROOTS = new Set([
  '/api/quotes', '/api/quotes/:id',
  '/api/customers', '/api/customers/:id',
  '/api/jobs', '/api/jobs/:id',
  '/api/invoices', '/api/invoices/:id',
  '/api/settings',
]);

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  if (typeof root !== 'string') return false;
  if (PERSISTED_ROOTS.has(root)) {
    // A customer's message thread is a conversation log, not needed offline.
    return !(root === '/api/customers' && queryKey[2] === 'messages');
  }
  // `/api/quotes/123/items`: the rows behind a quote's detail screen.
  return /^\/api\/quotes\/\d+\/items$/.test(root);
}

/**
 * Settings, trimmed to what quoting and the PDF need. Bank details, the push token
 * and anything else are dropped before the copy is written to the device.
 */
const SETTINGS_KEPT = [
  // quoting
  'tradeType', 'includeGST', 'labourRate', 'markupPercent', 'markupLabour', 'labourCostRate',
  'callOutFee', 'callOutFeeEnabled', 'paymentTermsDays',
  // what the PDF header shows, and its template/branding
  'businessName', 'abn', 'phone', 'email', 'address', 'logoUrl',
  'quoteTemplate', 'quoteAccentColor', 'quoteFontFamily', 'quoteHeaderStyle',
  // display
  'darkMode', 'bladeOrder',
] as const;

export function trimSettingsForDevice(settings: unknown): Record<string, unknown> | null {
  if (!settings || typeof settings !== 'object') return null;
  const src = settings as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of SETTINGS_KEPT) if (k in src) out[k] = src[k];
  return out;
}
