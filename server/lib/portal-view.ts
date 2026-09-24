/**
 * What a customer holding a share link is allowed to see.
 *
 * The portal route used to return the raw quote row. `quotes.content` is a JSON
 * blob that carries, per line, the tradie's `unitCost` — plus `lines[].cost`,
 * `markupPct` and the lock state. So anyone with the customer link could read the
 * cost prices and the margin straight out of the network tab. The row also carried
 * `userId`, the Xero identifiers and the follow-up schedule.
 *
 * This builds the response FRESH from an allow-list rather than deleting fields
 * from the real object. That direction matters: a new column added to `quotes`, or
 * a new key written into `content`, is invisible here by default. Stripping would
 * have leaked each one the day it was added.
 *
 * Pure on purpose — no database, no request — so the test can assert on the exact
 * shape that goes over the wire.
 */

/** The only line-item fields a customer needs to read their own quote. */
export type PortalItem = {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
};

export type PortalContent = {
  jobTitle?: string;
  summary?: string;
  notes?: string;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  includeGST?: boolean;
  items: PortalItem[];
};

export type PortalView = {
  quote: {
    id: number;
    status: string | null;
    totalAmount: string;
    createdAt: Date | string | null;
    /** Re-serialised JSON, so Portal.tsx's parseContent() keeps working unchanged. */
    content: string | null;
  };
  customer: { name: string; email: string | null; phone: string | null; address: string | null } | null;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
};

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

/**
 * Rebuild the content blob with only the keys the portal renders.
 *
 * Unparseable content returns null rather than the original string: if we cannot
 * read it, we cannot know it is safe to forward, and the page already handles a
 * null content by rendering nothing.
 */
export function sanitisePortalContent(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const items: PortalItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((it: any) => {
        const item: PortalItem = {
          description: String(it?.description ?? ''),
          quantity: num(it?.quantity),
          unitPrice: num(it?.unitPrice),
        };
        const unit = str(it?.unit);
        if (unit) item.unit = unit;
        return item;
      })
    : [];

  const content: PortalContent = { items };
  const jobTitle = str(parsed.jobTitle); if (jobTitle) content.jobTitle = jobTitle;
  const summary  = str(parsed.summary);  if (summary)  content.summary  = summary;
  const notes    = str(parsed.notes);    if (notes)    content.notes    = notes;
  if (parsed.subtotal    !== undefined) content.subtotal    = num(parsed.subtotal);
  if (parsed.gstAmount   !== undefined) content.gstAmount   = num(parsed.gstAmount);
  if (parsed.totalAmount !== undefined) content.totalAmount = num(parsed.totalAmount);
  if (parsed.includeGST  !== undefined) content.includeGST  = !!parsed.includeGST;

  return JSON.stringify(content);
}

export function buildPortalView(input: {
  quote: any;
  customer: any | null;
  business: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null };
}): PortalView {
  const { quote, customer, business } = input;

  return {
    quote: {
      id: quote.id,
      status: quote.status ?? null,
      totalAmount: String(quote.totalAmount ?? '0'),
      createdAt: quote.createdAt ?? null,
      content: sanitisePortalContent(quote.content),
    },
    customer: customer
      ? {
          name: String(customer.name ?? ''),
          email: customer.email ?? null,
          phone: customer.phone ?? null,
          address: customer.address ?? null,
        }
      : null,
    businessName: business.name || '',
    businessPhone: business.phone || '',
    businessEmail: business.email || '',
    businessAddress: business.address || '',
  };
}
