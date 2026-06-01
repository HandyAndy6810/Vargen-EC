import { type UserSettings } from '@/hooks/use-settings';

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

const FONT_STACK: Record<string, string> = {
  inter:   "'Helvetica Neue', Helvetica, Arial, sans-serif",
  manrope: "'Trebuchet MS', Helvetica, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
};

function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Header ─────────────────────────────────────────────────────────────────

function buildHeader(data: PdfDocumentData, s: UserSettings): string {
  const style     = s.quoteHeaderStyle ?? 'gradient';
  const accent    = s.quoteAccentColor ?? '#f26a2a';
  const biz       = esc(s.businessName ?? '');
  const addr      = esc(s.address ?? '');
  const phone     = esc(s.phone ?? '');
  const email     = esc(s.email ?? '');
  const docLabel  = data.documentType === 'invoice' ? 'INVOICE' : 'QUOTE';
  const docNum    = `#${esc(data.documentNumber)}`;

  const logoMix   = s.logoUrl ? `<img src="${esc(s.logoUrl)}" style="height:52px;max-width:130px;object-fit:contain;mix-blend-mode:multiply;display:block;margin-bottom:10px;" alt="" />` : '';
  const logoFlat  = s.logoUrl ? `<img src="${esc(s.logoUrl)}" style="height:52px;max-width:130px;object-fit:contain;display:block;margin-bottom:10px;" alt="" />` : '';

  const contact = [phone, email].filter(Boolean).join('  ·  ');

  if (style === 'gradient') {
    return `
    <div style="background:${accent};padding:26px 36px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          ${logoMix}
          <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1.1;">${biz}</div>
          ${addr    ? `<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">${addr}</div>` : ''}
          ${contact ? `<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">${contact}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;font-weight:900;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">${docLabel}</div>
          <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1;">${docNum}</div>
        </div>
      </div>
    </div>`;
  }

  if (style === 'minimal') {
    return `
    <div style="padding:28px 36px 0;">
      <div style="height:4px;background:${accent};border-radius:2px;margin-bottom:20px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          ${logoFlat}
          <div style="font-size:20px;font-weight:900;color:#141310;letter-spacing:-0.4px;">${biz}</div>
          <div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:4px;">${[addr, phone, email].filter(Boolean).join('  ·  ')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;font-weight:900;color:rgba(20,19,16,0.4);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:3px;">${docLabel}</div>
          <div style="font-size:26px;font-weight:900;color:${accent};letter-spacing:-0.5px;">${docNum}</div>
        </div>
      </div>
      <div style="height:1px;background:rgba(20,19,16,0.1);margin-top:18px;"></div>
    </div>`;
  }

  // classic
  return `
  <div style="padding:28px 36px 0;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="display:flex;align-items:flex-start;gap:14px;flex:1;">
        ${logoFlat}
        <div>
          <div style="font-size:20px;font-weight:900;color:#141310;letter-spacing:-0.4px;">${biz}</div>
          ${addr  ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:3px;">${addr}</div>` : ''}
          ${phone ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:1px;">${phone}</div>` : ''}
          ${email ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:1px;">${email}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;font-weight:900;color:rgba(20,19,16,0.4);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:3px;">${docLabel}</div>
        <div style="font-size:26px;font-weight:900;color:${accent};letter-spacing:-0.5px;">${docNum}</div>
      </div>
    </div>
    <div style="height:2px;background:${accent};margin-top:18px;border-radius:1px;"></div>
  </div>`;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildQuotePDF(data: PdfDocumentData, settings: Partial<UserSettings>): string {
  const s = settings as UserSettings;
  const accent     = s.quoteAccentColor ?? '#f26a2a';
  const fontFamily = FONT_STACK[s.quoteFontFamily ?? 'inter'] ?? FONT_STACK.inter;
  const header     = buildHeader(data, s);

  const isInvoice  = data.documentType === 'invoice';
  const isPaid     = data.status === 'paid';
  const isOverdue  = data.status === 'overdue';

  const issuedStr  = data.createdAt ? dateStr(data.createdAt) : '';
  const expiryVal  = data.expiryDate ? (() => { try { return dateStr(data.expiryDate!); } catch { return data.expiryDate; } })() : null;
  const dueVal     = data.dueDate    ? (() => { try { return dateStr(data.dueDate!);    } catch { return data.dueDate;    } })() : null;
  const dateLabel  = isInvoice ? 'DUE DATE' : 'EXPIRES';
  const dateValue  = isInvoice ? dueVal : expiryVal;
  const dateColor  = isInvoice && isOverdue ? '#d94d0e' : '#141310';

  // ── Meta strip (Bill To | Dates | Amount) ───────────────────────────────
  const billTo = data.customerName ? `
    <div>
      <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(20,19,16,0.4);margin-bottom:7px;">BILL TO</div>
      <div style="font-size:14px;font-weight:800;color:#141310;line-height:1.3;">${esc(data.customerName)}</div>
      ${data.customerAddress ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:3px;">${esc(data.customerAddress)}</div>` : ''}
      ${data.customerPhone   ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:2px;">${esc(data.customerPhone)}</div>` : ''}
      ${data.customerEmail   ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:1px;">${esc(data.customerEmail)}</div>` : ''}
    </div>` : `
    <div style="font-size:12px;color:rgba(20,19,16,0.3);font-style:italic;">No customer on file</div>`;

  const metaStrip = `
  <div style="display:flex;border-bottom:1px solid rgba(20,19,16,0.08);margin:0 0 0 0;">
    <div style="flex:2;padding:18px 36px 18px;">
      ${billTo}
    </div>
    <div style="width:1px;background:rgba(20,19,16,0.07);margin:12px 0;"></div>
    <div style="flex:1;padding:18px 20px;">
      <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(20,19,16,0.4);margin-bottom:5px;">ISSUED</div>
      <div style="font-size:12px;font-weight:700;color:#141310;">${issuedStr}</div>
      ${dateValue ? `
      <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(20,19,16,0.4);margin-top:12px;margin-bottom:5px;">${dateLabel}</div>
      <div style="font-size:12px;font-weight:700;color:${dateColor};">${dateValue}</div>` : ''}
    </div>
    <div style="width:1px;background:rgba(20,19,16,0.07);margin:12px 0;"></div>
    <div style="flex:1;padding:18px 20px;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(20,19,16,0.4);margin-bottom:5px;">${isInvoice ? 'AMOUNT DUE' : 'QUOTE TOTAL'}</div>
      <div style="font-size:24px;font-weight:900;color:${isPaid ? '#2a9d4c' : accent};letter-spacing:-0.8px;line-height:1.1;">$${fmt(data.totalAmount)}</div>
      ${isPaid ? `<div style="font-size:10px;font-weight:800;color:#2a9d4c;margin-top:3px;letter-spacing:0.5px;">PAID ✓</div>` : ''}
    </div>
  </div>`;

  // ── Items table ───────────────────────────────────────────────────────────
  const itemRows = data.items.map((item, i) => {
    const total = item.quantity * item.unitPrice;
    const rowBg = i % 2 === 1 ? `background:rgba(20,19,16,0.025);` : '';
    const unitCol = item.unitPrice > 0 ? `$${fmt(item.unitPrice)}` : '—';
    const totalCol = total > 0 ? `$${fmt(total)}` : '—';
    const unitLabel = item.quantity !== 1 || item.unit
      ? `${item.quantity}${item.unit ? ` ${esc(item.unit)}` : ''}`
      : `${item.quantity}`;
    return `
    <tr style="${rowBg}">
      <td style="padding:10px 12px 10px 0;border-bottom:1px solid rgba(20,19,16,0.05);font-size:12px;color:#141310;vertical-align:top;">${esc(item.description)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(20,19,16,0.05);font-size:12px;color:rgba(20,19,16,0.55);text-align:center;white-space:nowrap;vertical-align:top;">${unitLabel}</td>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(20,19,16,0.05);font-size:12px;color:rgba(20,19,16,0.6);text-align:right;white-space:nowrap;vertical-align:top;">${unitCol}</td>
      <td style="padding:10px 0 10px 12px;border-bottom:1px solid rgba(20,19,16,0.05);font-size:12px;font-weight:700;color:#141310;text-align:right;white-space:nowrap;vertical-align:top;">${totalCol}</td>
    </tr>`;
  }).join('');

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = `
  <div style="display:flex;justify-content:flex-end;margin-top:6px;padding:0 0 0 0;">
    <div style="min-width:240px;">
      ${data.subtotal > 0 && data.includeGST ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:rgba(20,19,16,0.55);">
        <span>Subtotal</span><span>$${fmt(data.subtotal)}</span>
      </div>` : ''}
      ${data.includeGST && data.gstAmount && data.gstAmount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:rgba(20,19,16,0.55);">
        <span>GST (10%)</span><span>$${fmt(data.gstAmount)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:${isPaid ? '#2a9d4c' : accent};border-radius:10px;margin-top:8px;">
        <span style="font-size:13px;font-weight:900;color:#fff;letter-spacing:0.5px;">TOTAL</span>
        <span style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">$${fmt(data.totalAmount)}</span>
      </div>
      ${isPaid ? `<div style="text-align:right;font-size:10px;font-weight:800;color:#2a9d4c;margin-top:6px;letter-spacing:0.5px;">PAID IN FULL ✓</div>` : ''}
    </div>
  </div>`;

  // ── Bank / payment details ────────────────────────────────────────────────
  const bankDetails = isInvoice && (s.bsb || s.accountNumber) ? `
  <div style="margin-top:22px;padding:16px 18px;background:#f7f4ee;border-radius:12px;border:1px solid rgba(20,19,16,0.07);page-break-inside:avoid;">
    <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(20,19,16,0.4);margin-bottom:10px;">PAYMENT DETAILS</div>
    <div style="display:flex;gap:32px;flex-wrap:wrap;">
      ${s.accountName ? `<div><div style="font-size:10px;color:rgba(20,19,16,0.4);font-weight:700;margin-bottom:2px;">Account name</div><div style="font-size:12px;font-weight:700;color:#141310;">${esc(s.accountName)}</div></div>` : ''}
      ${s.bankName    ? `<div><div style="font-size:10px;color:rgba(20,19,16,0.4);font-weight:700;margin-bottom:2px;">Bank</div><div style="font-size:12px;font-weight:700;color:#141310;">${esc(s.bankName)}</div></div>` : ''}
      ${s.bsb         ? `<div><div style="font-size:10px;color:rgba(20,19,16,0.4);font-weight:700;margin-bottom:2px;">BSB</div><div style="font-size:14px;font-weight:900;color:#141310;">${esc(s.bsb)}</div></div>` : ''}
      ${s.accountNumber ? `<div><div style="font-size:10px;color:rgba(20,19,16,0.4);font-weight:700;margin-bottom:2px;">Account</div><div style="font-size:14px;font-weight:900;color:#141310;">${esc(s.accountNumber)}</div></div>` : ''}
    </div>
  </div>` : '';

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerParts: string[] = [];
  if (s.abn) footerParts.push(`ABN ${esc(s.abn)}`);
  if (s.paymentTermsDays && isInvoice) footerParts.push(`Payment due within ${s.paymentTermsDays} days`);
  const footer = footerParts.length > 0 ? `
  <div style="margin-top:28px;padding-top:12px;border-top:1px solid rgba(20,19,16,0.08);font-size:10px;color:rgba(20,19,16,0.35);text-align:center;letter-spacing:0.3px;">
    ${footerParts.join('  ·  ')}
  </div>` : '';

  // ── PAID watermark ────────────────────────────────────────────────────────
  const paidWatermark = isPaid ? `
  <div style="position:fixed;top:42%;right:-20px;transform:rotate(-30deg);font-size:72px;font-weight:900;color:rgba(42,157,76,0.10);letter-spacing:4px;pointer-events:none;z-index:0;white-space:nowrap;">PAID</div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontFamily}; color: #141310; background: #fff; font-size: 13px; line-height: 1.5; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-break { page-break-inside: avoid; }
  }
  table { border-collapse: collapse; width: 100%; }
</style>
</head>
<body>

${paidWatermark}
${header}
${metaStrip}

<div style="padding:22px 36px 36px;position:relative;z-index:1;">

  <!-- Job title -->
  <div style="margin-bottom:18px;" class="no-break">
    <div style="font-size:17px;font-weight:800;color:#141310;letter-spacing:-0.3px;line-height:1.3;">${esc(data.jobTitle)}</div>
    ${data.summary ? `<div style="font-size:12px;color:rgba(20,19,16,0.65);line-height:1.7;margin-top:7px;padding:12px 14px;background:#f7f4ee;border-radius:8px;">${esc(data.summary)}</div>` : ''}
  </div>

  <!-- Custom message -->
  ${data.customMessage ? `
  <div style="margin-bottom:18px;padding:14px 16px;background:#f0f7ff;border-left:3px solid #1f6feb;border-radius:0 8px 8px 0;" class="no-break">
    <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#1f6feb;margin-bottom:6px;">Message</div>
    <div style="font-size:12px;color:rgba(20,19,16,0.75);line-height:1.7;">${esc(data.customMessage).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <!-- Line items -->
  <div class="no-break">
    <table>
      <thead>
        <tr style="border-bottom:2px solid ${accent};">
          <th style="padding:8px 12px 8px 0;font-size:9px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.4);text-align:left;width:55%;">Description</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.4);text-align:center;width:12%;">Qty</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.4);text-align:right;width:16%;">Unit price</th>
          <th style="padding:8px 0 8px 12px;font-size:9px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.4);text-align:right;width:17%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="4" style="padding:16px 0;font-size:12px;color:rgba(20,19,16,0.35);">No items</td></tr>`}
      </tbody>
    </table>
  </div>

  ${totals}

  <!-- Notes & terms -->
  ${data.notes ? `
  <div style="margin-top:22px;" class="no-break">
    <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(20,19,16,0.4);margin-bottom:8px;">Notes &amp; terms</div>
    <div style="font-size:11px;color:rgba(20,19,16,0.65);line-height:1.8;background:#f7f4ee;padding:14px 16px;border-radius:10px;border:1px solid rgba(20,19,16,0.07);">${esc(data.notes).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  ${bankDetails}
  ${footer}

</div>
</body>
</html>`;
}
