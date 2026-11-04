/**
 * What a customer holding an invoice link (/invoice/:token) may see: the invoice as
 * it appears on its PDF. Built FRESH from an allowlist, like the quote portal
 * (portal-view.ts), so nothing private on the row (owner, Xero ids, payment-link
 * ids, the token itself) can leak by being forgotten.
 *
 * Bank details and the pay-by-card links are included on purpose: the customer
 * needs them to pay, and they're printed on the invoice PDF already.
 */

type Row = Record<string, any> | null | undefined;

export type InvoiceView = {
  invoice: {
    invoiceNumber: string | null;
    status: string | null;
    createdAt: unknown;
    dueDate: unknown;
    paidDate: unknown;
    items: unknown;
    notes: string | null;
    subtotal: string | null;
    gstAmount: string | null;
    totalAmount: string | null;
    paidAmount: string | null;
    payByCardUrl: string | null;
  };
  customer: { name: string | null; email: string | null; phone: string | null; address: string | null } | null;
  business: {
    businessName: string | null; abn: string | null; tradeType: string | null;
    phone: string | null; email: string | null; address: string | null;
    bankName: string | null; bsb: string | null; accountNumber: string | null; accountName: string | null;
  };
};

const str = (v: unknown) => (v == null ? null : String(v));

export function buildInvoiceView(input: { invoice: Row; customer: Row; settings: Row }): InvoiceView {
  const i = input.invoice ?? {};
  const c = input.customer;
  const s = input.settings ?? {};
  return {
    invoice: {
      invoiceNumber: str(i.invoiceNumber),
      status: str(i.status),
      createdAt: i.createdAt ?? null,
      dueDate: i.dueDate ?? null,
      paidDate: i.paidDate ?? null,
      items: i.items ?? '[]',
      notes: str(i.notes),
      subtotal: str(i.subtotal),
      gstAmount: str(i.gstAmount),
      totalAmount: str(i.totalAmount),
      paidAmount: str(i.paidAmount),
      payByCardUrl: str(i.stripePaymentLinkUrl ?? i.squarePaymentLinkUrl),
    },
    customer: c ? { name: str(c.name), email: str(c.email), phone: str(c.phone), address: str(c.address) } : null,
    business: {
      businessName: str(s.businessName), abn: str(s.abn), tradeType: str(s.tradeType),
      phone: str(s.phone), email: str(s.email), address: str(s.address),
      bankName: str(s.bankName), bsb: str(s.bsb), accountNumber: str(s.accountNumber), accountName: str(s.accountName),
    },
  };
}

/** The invoice as the app sees it: with a ready-made invoiceUrl once it has a share token. */
export function withInvoiceUrl<T extends { shareToken?: string | null }>(
  invoice: T,
  base: string,
): T & { invoiceUrl?: string } {
  if (!invoice?.shareToken) return invoice;
  return { ...invoice, invoiceUrl: `${base}/invoice/${encodeURIComponent(invoice.shareToken)}` };
}
