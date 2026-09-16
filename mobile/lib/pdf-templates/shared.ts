import { type UserSettings } from '@/hooks/use-settings';

/**
 * The document every template renders. Templates receive this already normalised —
 * see `buildCtx` — so each one is purely layout and never re-derives a figure or a
 * date. Two templates disagreeing about what the total is would be a real bug, and
 * this is what makes that impossible.
 */
export type PdfDocumentData = {
  documentType: 'quote' | 'invoice';
  documentNumber: string;
  createdAt: string;
  expiryDate?: string;
  dueDate?: string;
  status?: string;
  jobTitle: string;
  summary?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: { description: string; quantity: number; unit?: string; unitPrice: number }[];
  notes?: string;
  customMessage?: string;
  subtotal: number;
  gstAmount?: number;
  totalAmount: number;
  includeGST: boolean;
};

export const FONT_STACK: Record<string, string> = {
  inter:   "'Helvetica Neue', Helvetica, Arial, sans-serif",
  manrope: "'Trebuchet MS', Helvetica, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
};

export function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money(n: number) {
  return `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`;
}

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escaped, with newlines turned into breaks. For anything the tradie typed. */
export function escMultiline(s: string): string {
  return esc(s).replace(/\n/g, '<br>');
}

export function dateStr(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return esc(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return esc(iso);
  }
}

export type LineRow = {
  description: string;
  qtyLabel: string;
  unitPrice: number;
  total: number;
  /** Pre-formatted, with an em dash where there is no figure to show. */
  unitLabel: string;
  totalLabel: string;
};

export type Ctx = {
  d: PdfDocumentData;
  s: UserSettings;
  accent: string;
  font: string;
  isInvoice: boolean;
  isPaid: boolean;
  isOverdue: boolean;
  docLabel: string;
  docNumber: string;
  issued: string;
  /** "EXPIRES" on a quote, "DUE DATE" on an invoice. */
  dateLabel: string;
  dateValue: string | null;
  biz: string;
  addr: string;
  phone: string;
  email: string;
  abn: string;
  logoUrl: string;
  rows: LineRow[];
  showSubtotal: boolean;
  showGst: boolean;
  hasBank: boolean;
  /** ABN and payment terms, already assembled. */
  footerBits: string[];
};

export function buildCtx(data: PdfDocumentData, settings: Partial<UserSettings>): Ctx {
  const s = (settings ?? {}) as UserSettings;
  const isInvoice = data.documentType === 'invoice';
  const isPaid = data.status === 'paid';

  const rows: LineRow[] = (data.items ?? []).map(item => {
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const total = qty * unitPrice;
    return {
      description: item.description ?? '',
      qtyLabel: `${qty}${item.unit ? ` ${item.unit}` : ''}`,
      unitPrice,
      total,
      unitLabel: unitPrice > 0 ? `$${fmt(unitPrice)}` : '—',
      totalLabel: total !== 0 ? `$${fmt(total)}` : '—',
    };
  });

  const footerBits: string[] = [];
  if (s.abn) footerBits.push(`ABN ${esc(s.abn)}`);
  if (isInvoice && s.paymentTermsDays) footerBits.push(`Payment due within ${s.paymentTermsDays} days`);

  return {
    d: data,
    s,
    accent: s.quoteAccentColor || '#f26a2a',
    font: FONT_STACK[s.quoteFontFamily ?? 'inter'] ?? FONT_STACK.inter,
    isInvoice,
    isPaid,
    isOverdue: data.status === 'overdue',
    docLabel: isInvoice ? 'INVOICE' : 'QUOTE',
    docNumber: data.documentNumber ?? '',
    issued: data.createdAt ? dateStr(data.createdAt) : '',
    dateLabel: isInvoice ? 'Due date' : 'Valid until',
    dateValue: isInvoice
      ? (data.dueDate ? dateStr(data.dueDate) : null)
      : (data.expiryDate ? dateStr(data.expiryDate) : null),
    biz: esc(s.businessName ?? ''),
    addr: esc(s.address ?? ''),
    phone: esc(s.phone ?? ''),
    email: esc(s.email ?? ''),
    abn: esc(s.abn ?? ''),
    logoUrl: s.logoUrl ?? '',
    rows,
    showSubtotal: data.subtotal > 0 && data.includeGST,
    showGst: !!(data.includeGST && data.gstAmount && data.gstAmount > 0),
    hasBank: !!(s.bsb || s.accountNumber),
    footerBits,
  };
}

export function logoTag(ctx: Ctx, height = 52, extra = ''): string {
  if (!ctx.logoUrl) return '';
  return `<img src="${esc(ctx.logoUrl)}" alt="" style="height:${height}px;max-width:150px;object-fit:contain;display:block;${extra}" />`;
}

/**
 * Wraps a template body in a true A4 page.
 *
 * A4 is 210 x 297mm. Without an explicit `@page size`, the print engine falls back
 * to US Letter, which is 216 x 279mm — wider and shorter. Every Australian tradie
 * printing or emailing one of these needs A4, and the mismatch showed up as content
 * sitting slightly off-centre with the last few lines pushed onto a second sheet.
 *
 * `padding` is per-template because a minimal layout wants a wide margin and a dense
 * one does not. Pass the CSS shorthand you want on the page box.
 */
export function page(opts: {
  ctx: Ctx;
  css: string;
  body: string;
  padding: string;
  /** Painted behind the whole sheet — templates with a full-bleed band use this. */
  pageBackground?: string;
}): string {
  const { ctx, css, body, padding } = opts;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 210mm;
    background: ${opts.pageBackground ?? '#fff'};
    font-family: ${ctx.font};
    color: #141310;
    font-size: 10.5pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    padding: ${padding};
    position: relative;
    overflow: hidden;
  }
  table { border-collapse: collapse; width: 100%; }
  .nb { page-break-inside: avoid; }
  @media print { .sheet { min-height: 297mm; } }
${css}
</style>
</head>
<body>
<div class="sheet">
${body}
</div>
</body>
</html>`;
}

/** The green PAID stamp, shared by every template so it always reads the same. */
export function paidStamp(ctx: Ctx, top = '38%'): string {
  if (!ctx.isPaid) return '';
  return `<div style="position:absolute;top:${top};right:-10mm;transform:rotate(-28deg);font-size:64pt;font-weight:900;color:rgba(42,157,76,0.10);letter-spacing:4px;white-space:nowrap;z-index:0;">PAID</div>`;
}

/** Bank details, laid out as label/value pairs. Invoices only — a quote isn't payable. */
export function bankBlock(ctx: Ctx, opts: { bg: string; border: string; labelColor: string } ): string {
  if (!ctx.isInvoice || !ctx.hasBank) return '';
  const { s } = ctx;
  const cell = (label: string, value?: string) => value
    ? `<div><div style="font-size:7.5pt;color:${opts.labelColor};font-weight:700;margin-bottom:2px;">${label}</div><div style="font-size:10pt;font-weight:800;">${esc(value)}</div></div>`
    : '';
  return `
  <div class="nb" style="margin-top:8mm;padding:5mm;background:${opts.bg};border:1px solid ${opts.border};border-radius:3mm;">
    <div style="font-size:7.5pt;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${opts.labelColor};margin-bottom:3mm;">Payment details</div>
    <div style="display:flex;gap:10mm;flex-wrap:wrap;">
      ${cell('Account name', s.accountName)}
      ${cell('Bank', s.bankName)}
      ${cell('BSB', s.bsb)}
      ${cell('Account', s.accountNumber)}
    </div>
  </div>`;
}

/**
 * The acceptance block a quote needs and an invoice does not. Several templates put
 * a signature line at the foot; this keeps the wording identical between them.
 */
export function acceptanceBlock(ctx: Ctx, opts: { line: string; label: string }): string {
  if (ctx.isInvoice) return '';
  return `
  <div class="nb" style="margin-top:10mm;">
    <div style="font-size:8pt;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:${opts.label};margin-bottom:5mm;">Acceptance of quote</div>
    <div style="display:flex;gap:8mm;">
      <div style="flex:2;border-bottom:1px solid ${opts.line};padding-bottom:1.5mm;"></div>
      <div style="flex:2;border-bottom:1px solid ${opts.line};padding-bottom:1.5mm;"></div>
      <div style="flex:1;border-bottom:1px solid ${opts.line};padding-bottom:1.5mm;"></div>
    </div>
    <div style="display:flex;gap:8mm;margin-top:1.5mm;font-size:8pt;color:${opts.label};">
      <div style="flex:2;">Signature</div>
      <div style="flex:2;">Printed name</div>
      <div style="flex:1;">Date</div>
    </div>
  </div>`;
}
