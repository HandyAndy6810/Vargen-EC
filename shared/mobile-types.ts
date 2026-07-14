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
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
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
