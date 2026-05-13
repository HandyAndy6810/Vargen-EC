import { type UserSettings } from '@/hooks/use-settings';

export type PdfDocumentData = {
  documentType: 'quote' | 'invoice';
  documentNumber: string;
  createdAt: string;
  expiryDate?: string;
  dueDate?: string;
  jobTitle: string;
  summary?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: { description: string; quantity: number; unit?: string; unitPrice: number }[];
  notes?: string;
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

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHeader(data: PdfDocumentData, s: UserSettings): string {
  const style = s.quoteHeaderStyle ?? 'gradient';
  const accent = s.quoteAccentColor ?? '#f26a2a';
  const biz = escHtml(s.businessName ?? '');
  const addr = escHtml(s.address ?? '');
  const phone = escHtml(s.phone ?? '');
  const email = escHtml(s.email ?? '');
  // On gradient headers, multiply blend mode makes white logo backgrounds disappear into the colour
  const logoGradient = s.logoUrl
    ? `<img src="${escHtml(s.logoUrl)}" style="height:56px;max-width:140px;object-fit:contain;mix-blend-mode:multiply;" alt="logo" />`
    : '';
  const logoFlat = s.logoUrl
    ? `<img src="${escHtml(s.logoUrl)}" style="height:56px;max-width:140px;object-fit:contain;" alt="logo" />`
    : '';

  if (style === 'gradient') {
    return `
    <div class="header-gradient" style="background:${accent};padding:28px 36px;border-radius:0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${biz}</div>
          ${addr ? `<div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:4px;">${addr}</div>` : ''}
          <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px;">${[phone, email].filter(Boolean).join('  ·  ')}</div>
        </div>
        <div style="margin-top:2px;">${logoGradient}</div>
      </div>
    </div>`;
  }

  if (style === 'minimal') {
    return `
    <div style="padding:28px 36px 16px;">
      <div style="height:3px;background:${accent};border-radius:2px;margin-bottom:18px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#141310;letter-spacing:-0.4px;">${biz}</div>
          <div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:3px;">${[addr, phone, email].filter(Boolean).join('  ·  ')}</div>
        </div>
        ${logoFlat}
      </div>
    </div>`;
  }

  // classic: two-column logo+name left, address+contact right
  return `
  <div style="padding:28px 36px 16px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
      <div style="display:flex;align-items:center;gap:16px;flex:1;">
        ${logoFlat}
        <div>
          <div style="font-size:20px;font-weight:800;color:#141310;letter-spacing:-0.4px;">${biz}</div>
        </div>
      </div>
      <div style="border-left:2px solid rgba(20,19,16,0.1);padding-left:20px;text-align:right;">
        ${addr ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);">${addr}</div>` : ''}
        ${phone ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:2px;">${phone}</div>` : ''}
        ${email ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:2px;">${email}</div>` : ''}
      </div>
    </div>
    <div style="height:1px;background:rgba(20,19,16,0.1);margin-top:18px;"></div>
  </div>`;
}

export function buildQuotePDF(data: PdfDocumentData, settings: Partial<UserSettings>): string {
  const s = settings as UserSettings;
  const accent = s.quoteAccentColor ?? '#f26a2a';
  const fontFamily = FONT_STACK[s.quoteFontFamily ?? 'inter'] ?? FONT_STACK.inter;
  const accentRgb = accent; // used for row shading via CSS

  const docLabel = data.documentType === 'invoice' ? 'INVOICE' : 'QUOTE';
  const createdStr = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const expiryStr = data.expiryDate
    ? new Date(data.expiryDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const dueStr = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const dateLabel = data.documentType === 'invoice' ? 'Due' : 'Expires';
  const dateValue = data.documentType === 'invoice' ? dueStr : expiryStr;

  const header = buildHeader(data, s);

  const itemRows = data.items.map((item, i) => {
    const total = item.quantity * item.unitPrice;
    const bg = i % 2 === 1 ? `background:${accent}0d;` : '';
    return `
    <tr>
      <td style="${bg}padding:9px 10px 9px 0;border-bottom:1px solid rgba(20,19,16,0.06);font-size:12px;color:#141310;">${escHtml(item.description)}</td>
      <td style="${bg}padding:9px 10px;border-bottom:1px solid rgba(20,19,16,0.06);font-size:12px;color:rgba(20,19,16,0.6);text-align:center;">${item.quantity}${item.unit ? ` ${escHtml(item.unit)}` : ''}</td>
      <td style="${bg}padding:9px 10px;border-bottom:1px solid rgba(20,19,16,0.06);font-size:12px;color:rgba(20,19,16,0.7);text-align:right;">$${fmt(item.unitPrice)}</td>
      <td style="${bg}padding:9px 0 9px 10px;border-bottom:1px solid rgba(20,19,16,0.06);font-size:12px;font-weight:700;color:#141310;text-align:right;">$${fmt(total)}</td>
    </tr>`;
  }).join('');

  const bankDetails = data.documentType === 'invoice' && (s.bsb || s.accountNumber)
    ? `<div style="margin-top:20px;padding:14px 16px;background:#f7f4ee;border-radius:10px;border:1px solid rgba(20,19,16,0.08);">
        <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.5);margin-bottom:8px;">Payment details</div>
        ${s.accountName ? `<div style="font-size:12px;color:#141310;margin-bottom:3px;">${escHtml(s.accountName)}</div>` : ''}
        ${s.bankName ? `<div style="font-size:11px;color:rgba(20,19,16,0.6);margin-bottom:2px;">${escHtml(s.bankName)}</div>` : ''}
        ${s.bsb ? `<div style="font-size:11px;color:rgba(20,19,16,0.6);margin-bottom:2px;">BSB <strong style="color:#141310;">${escHtml(s.bsb)}</strong></div>` : ''}
        ${s.accountNumber ? `<div style="font-size:11px;color:rgba(20,19,16,0.6);">Account <strong style="color:#141310;">${escHtml(s.accountNumber)}</strong></div>` : ''}
      </div>`
    : '';

  const footerParts: string[] = [];
  if (s.abn) footerParts.push(`ABN ${escHtml(s.abn)}`);
  if (s.paymentTermsDays && data.documentType === 'invoice') footerParts.push(`Payment terms: ${s.paymentTermsDays} days`);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontFamily}; color: #141310; background: #fff; font-size: 13px; line-height: 1.5; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

${header}

<div style="padding:0 36px 36px;">

  <!-- Document meta bar -->
  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f7f4ee;border-radius:10px;margin-bottom:22px;">
    <div style="font-size:18px;font-weight:800;color:#141310;letter-spacing:-0.4px;">${docLabel} <span style="color:${accent};">#${escHtml(data.documentNumber)}</span></div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:rgba(20,19,16,0.55);">Prepared ${createdStr}</div>
      ${dateValue ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);">${dateLabel} ${dateValue}</div>` : ''}
    </div>
  </div>

  <!-- Customer block -->
  ${data.customerName ? `
  <div style="margin-bottom:20px;">
    <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.5);margin-bottom:6px;">Prepared for</div>
    <div style="font-size:14px;font-weight:800;color:#141310;">${escHtml(data.customerName)}</div>
    ${data.customerAddress ? `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:2px;">${escHtml(data.customerAddress)}</div>` : ''}
    ${[data.customerPhone, data.customerEmail].filter(Boolean).map(v => `<div style="font-size:11px;color:rgba(20,19,16,0.55);margin-top:1px;">${escHtml(v!)}</div>`).join('')}
  </div>` : ''}

  <!-- Job title + summary -->
  <div style="margin-bottom:20px;">
    <div style="font-size:18px;font-weight:800;color:#141310;letter-spacing:-0.3px;margin-bottom:6px;">${escHtml(data.jobTitle)}</div>
    ${data.summary ? `<div style="font-size:12px;color:rgba(20,19,16,0.7);line-height:1.7;background:#f7f4ee;padding:12px 14px;border-radius:8px;">${escHtml(data.summary)}</div>` : ''}
  </div>

  <!-- Line items table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
    <thead>
      <tr style="border-bottom:2px solid ${accent};">
        <th style="padding:8px 10px 8px 0;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(20,19,16,0.5);text-align:left;">Description</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(20,19,16,0.5);text-align:center;">Qty</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(20,19,16,0.5);text-align:right;">Unit price</th>
        <th style="padding:8px 0 8px 10px;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(20,19,16,0.5);text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;margin-top:12px;">
    <div style="min-width:220px;">
      ${data.subtotal > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:rgba(20,19,16,0.6);">
        <span>Subtotal</span><span>$${fmt(data.subtotal)}</span>
      </div>` : ''}
      ${data.includeGST && data.gstAmount ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:rgba(20,19,16,0.6);">
        <span>GST (10%)</span><span>$${fmt(data.gstAmount)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:10px 14px;background:${accent};border-radius:8px;margin-top:6px;">
        <span style="font-size:14px;font-weight:800;color:#fff;">TOTAL</span>
        <span style="font-size:14px;font-weight:800;color:#fff;">$${fmt(data.totalAmount)}</span>
      </div>
    </div>
  </div>

  <!-- Notes / terms -->
  ${data.notes ? `
  <div style="margin-top:24px;">
    <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(20,19,16,0.5);margin-bottom:8px;">Notes &amp; terms</div>
    <div style="font-size:11px;color:rgba(20,19,16,0.65);line-height:1.8;background:#f7f4ee;padding:14px 16px;border-radius:10px;border:1px solid rgba(20,19,16,0.08);">${escHtml(data.notes).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  ${bankDetails}

  <!-- Footer -->
  ${footerParts.length > 0 ? `
  <div style="margin-top:32px;padding-top:14px;border-top:1px solid rgba(20,19,16,0.1);font-size:10px;color:rgba(20,19,16,0.4);text-align:center;">
    ${footerParts.join('  ·  ')}
  </div>` : ''}

</div>
</body>
</html>`;
}
