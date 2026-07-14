export interface Customer {
  id: number;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  xeroContactId: string | null;
  createdAt: string | null;
}

export interface InsertCustomer {
  userId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  xeroContactId?: string | null;
}

export interface Job {
  id: number;
  userId: string | null;
  customerId: number | null;
  title: string;
  description: string | null;
  address: string | null;
  status: string | null;
  scheduledDate: Date | string | null;
  estimatedDuration: number | null;
  completionData: string | null;
  createdAt: Date | string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface InsertJob {
  userId?: string | null;
  customerId?: number | null;
  title: string;
  description?: string | null;
  address?: string | null;
  status?: string | null;
  scheduledDate?: Date | string | null;
  estimatedDuration?: number | null;
  completionData?: string | null;
}

export interface Quote {
  id: number;
  userId: string | null;
  jobId: number | null;
  customerId: number | null;
  totalAmount: string;
  status: string | null;
  content: string | null;
  jobTitle: string | null;
  xeroInvoiceId: string | null;
  xeroInvoiceNumber: string | null;
  shareToken: string | null;
  followUpSchedule: string | null;
  sentAt: string | null;
  createdAt: string | null;
  customerName?: string | null;
}

export interface QuoteItem {
  id: number;
  quoteId: number | null;
  description: string;
  quantity: number;
  price: string;
  unit?: string | null;
}

export interface Invoice {
  id: number;
  userId: string | null;
  quoteId: number | null;
  customerId: number | null;
  invoiceNumber: string;
  status: string | null;
  items: string;
  subtotal: string;
  gstAmount: string | null;
  totalAmount: string;
  dueDate: string | null;
  paidDate: string | null;
  paidAmount: string | null;
  notes: string | null;
  stripePaymentLinkId: string | null;
  stripePaymentLinkUrl: string | null;
  squarePaymentLinkId: string | null;
  squarePaymentLinkUrl: string | null;
  xeroInvoiceId: string | null;
  xeroInvoiceNumber: string | null;
  createdAt: string | null;
  customerName?: string | null;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  password: string | null;
  resetToken: string | null;
  resetTokenExpiry: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ── Quote content blob ────────────────────────────────────────────────────
// The quotes.content column stores this JSON. Two line-item shapes exist:
// `items` ({description, quantity, unitPrice}) is canonical and written by
// every save path since mid-2026; `lines` ({name, qty, price}) is the legacy
// manual-form shape still present on older rows. Readers must accept both.
export interface QuoteContentItem {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

export interface QuoteContentLine {
  name: string;
  qty: string | number;
  price: string | number;
}

export interface QuoteContent {
  jobTitle?: string;
  jobType?: string;
  summary?: string;
  notes?: string;
  internalNotes?: string;
  schedDate?: string;
  /** Display string — user-editable free text, do NOT parse as a date */
  expiryDate?: string;
  /** Machine-readable companion to expiryDate — prefer this for date math */
  expiryDateISO?: string;
  items?: QuoteContentItem[];
  lines?: QuoteContentLine[];
  /** Legacy rows saved money fields as strings, sometimes formatted ("1,500.00") — read via toMoney() */
  subtotal?: number | string;
  gstAmount?: number | string;
  totalAmount?: number | string;
  includeGST?: boolean;
  estimatedHours?: number;
  totalLabour?: number;
  totalMaterials?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  billingAddress?: string;
  customerNotes?: string;
}

/** Safe parse for the quotes.content JSON column — never throws. */
export function parseQuoteContent(raw: string | null | undefined): QuoteContent {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as QuoteContent) : {};
  } catch {
    return {};
  }
}

/**
 * Tolerant numeric read for legacy money/qty values, which may be numbers,
 * plain numeric strings, or formatted strings ("1,500.00", "$150", "150.00 inc GST").
 * Returns null when the value is missing or unsalvageable, so callers can
 * fall back (e.g. recompute a subtotal from line items) instead of showing NaN.
 */
export function toMoney(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Display title for a quote: explicit title → content jobTitle → fallback. */
export function quoteTitle(q: { id: number; title?: string | null; content?: string | null }): string {
  if (q.title) return q.title;
  const jobTitle = parseQuoteContent(q.content).jobTitle;
  return jobTitle || `Quote #${q.id}`;
}

// ── Dates ─────────────────────────────────────────────────────────────────
// Shared by the mobile client and the server so both tiers enforce the same
// rule on free-text date columns (receipts.receipt_date).

/**
 * Strict YYYY-MM-DD validation. `new Date()` alone is too lenient — V8
 * accepts "15/3/26" and rolls impossible dates like 2026-02-30 forward,
 * so we round-trip the components to make sure the date really exists.
 */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Best-effort normalization of a stored or AI-extracted date to YYYY-MM-DD.
 * Free-text date columns and OCR results may hold ISO timestamps, D/M/Y
 * (AU convention), or prose dates. Normalize on the way in rather than
 * hard-blocking values the user never typed. Returns the input unchanged
 * when it can't be interpreted, so validation still catches it.
 */
export function toISODate(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (isValidISODate(trimmed)) return trimmed;

  // ISO timestamp (e.g. 2026-07-06T00:00:00.000Z) → keep the date part
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(trimmed) && isValidISODate(trimmed.slice(0, 10))) {
    return trimmed.slice(0, 10);
  }

  // D/M/Y first (AU convention), falling back to M/D/Y when day > 12
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    const pad = (n: string) => n.padStart(2, '0');
    const asDmy = `${year}-${pad(dmy[2])}-${pad(dmy[1])}`;
    if (isValidISODate(asDmy)) return asDmy;
    const asMdy = `${year}-${pad(dmy[1])}-${pad(dmy[2])}`;
    if (isValidISODate(asMdy)) return asMdy;
  }

  // Last resort: prose dates like "July 6 2026"
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }

  return trimmed;
}
