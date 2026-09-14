import {
  type Ctx, page, esc, escMultiline, fmt, logoTag, paidStamp, bankBlock,
} from './shared';

/**
 * High-contrast and typographic: a stacked wordmark, a solid rule across the page,
 * wide margins, and the total reversed out in a black chip. No panels, no fills, no
 * zebra striping — the layout does the work. Suits trades selling on craft.
 *
 * The wordmark stacks the business name onto its own lines, so it reads as a mark
 * rather than a line of text. Anything past three words stays on the third line so a
 * long name can't push the rule off the page.
 */
export function buildEditorial(ctx: Ctx): string {
  const { d, isInvoice, isPaid, accent } = ctx;

  const nameWords = (ctx.s.businessName ?? '').trim().split(/\s+/).filter(Boolean);
  const wordmark = nameWords.length
    ? nameWords.slice(0, 2).map(w => `<div>${esc(w)}</div>`).join('') +
      (nameWords.length > 2 ? `<div>${esc(nameWords.slice(2).join(' '))}</div>` : '')
    : '<div>—</div>';

  const rows = ctx.rows.map(r => `
    <tr>
      <td class="e-desc">${esc(r.description)}</td>
      <td class="e-qty">${esc(r.qtyLabel)}</td>
      <td class="e-unit">${r.unitLabel}</td>
      <td class="e-amt">${r.totalLabel}</td>
    </tr>`).join('');

  const body = `
  ${paidStamp(ctx)}

  <div class="masthead">
    ${ctx.logoUrl
      ? `<div>${logoTag(ctx, 54)}</div>`
      : `<div class="wordmark">${wordmark}</div>`}
    <div class="doctype">${isInvoice ? 'TAX INVOICE' : 'QUOTATION'}</div>
  </div>

  <div class="meta">
    <div>
      <div>${isInvoice ? 'Invoice' : 'Quotation'} No: <strong>#${esc(ctx.docNumber)}</strong></div>
      ${ctx.abn ? `<div>ABN: <strong>${ctx.abn}</strong></div>` : ''}
    </div>
    <div class="metaright">
      <div>Date: <strong>${ctx.issued}</strong></div>
      ${ctx.dateValue ? `<div>${ctx.dateLabel}: <strong>${ctx.dateValue}</strong></div>` : ''}
    </div>
  </div>

  <div class="party">
    <div class="pname">${d.customerName ? esc(d.customerName) : '—'}</div>
    ${d.customerAddress ? `<div class="pline">${esc(d.customerAddress)}</div>` : ''}
    ${d.customerPhone   ? `<div class="pline">${esc(d.customerPhone)}</div>` : ''}
    ${d.customerEmail   ? `<div class="pline">${esc(d.customerEmail)}</div>` : ''}
  </div>

  <div class="rule"></div>

  <div class="descblock">
    <div class="desclabel">Project Description</div>
    <div class="descbody">
      <div class="desctitle">${esc(d.jobTitle)}</div>
      ${d.summary ? `<div class="desctext">${escMultiline(d.summary)}</div>` : ''}
      ${d.customMessage ? `<div class="desctext">${escMultiline(d.customMessage)}</div>` : ''}
    </div>
  </div>

  <table class="items nb">
    <thead>
      <tr>
        <th class="e-desc">Description</th>
        <th class="e-qty">Qty</th>
        <th class="e-unit">Price</th>
        <th class="e-amt">Total</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="empty">No items</td></tr>`}</tbody>
  </table>

  <div class="totalsWrap nb">
    <table class="totals">
      ${ctx.showSubtotal ? `<tr><td>Subtotal</td><td>$${fmt(d.subtotal)}</td></tr>` : ''}
      ${ctx.showGst ? `<tr><td>GST</td><td>$${fmt(d.gstAmount!)}</td></tr>` : ''}
      <tr class="grand">
        <td>${isInvoice ? (isPaid ? 'Paid' : 'Total due') : 'Total'}</td>
        <td><span class="chip">$${fmt(d.totalAmount)}</span></td>
      </tr>
    </table>
  </div>

  ${d.notes ? `<div class="notes nb"><div class="noteslabel">Notes &amp; terms</div>${escMultiline(d.notes)}</div>` : ''}

  ${bankBlock(ctx, { bg: '#fff', border: '#141310', labelColor: '#777' })}

  <div class="signoff nb">
    <div class="sleft">
      <div class="sitalic">If you have any questions concerning this
      ${isInvoice ? 'invoice' : 'quotation'}, please contact
      <strong>${ctx.biz || 'us'}</strong>${ctx.phone ? ` on ${ctx.phone}` : ''}${ctx.email ? `<br>at ${ctx.email}` : ''}.</div>
      <div class="thanks">Thank you for your business!</div>
    </div>
    ${!isInvoice ? `
    <div class="sright">
      <div class="sitalic">Please confirm your<br>acceptance of this quote:</div>
      <div class="sigline"></div>
      <div class="sitalic small">Signature over printed name and date</div>
    </div>` : ''}
  </div>
  `;

  const css = `
  .masthead { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:11mm; }
  .wordmark { font-size:17pt; font-weight:900; line-height:0.98; letter-spacing:-0.5px; text-transform:uppercase; }
  .doctype { font-size:17pt; font-weight:800; letter-spacing:-0.3px; }
  .meta { display:flex; justify-content:space-between; font-size:9pt; color:#333; line-height:1.9; margin-bottom:9mm; }
  .metaright { text-align:right; }
  .party { margin-bottom:9mm; }
  .pname { font-size:11pt; font-weight:800; }
  .pline { font-size:9pt; color:#444; margin-top:0.5mm; }
  .rule { height:5mm; background:#141310; margin-bottom:9mm; }
  .descblock { display:flex; gap:10mm; margin-bottom:11mm; }
  .desclabel { width:38mm; flex-shrink:0; font-size:9.5pt; font-weight:800; }
  .descbody { flex:1; }
  .desctitle { font-size:10pt; font-weight:700; }
  .desctext { font-size:9.5pt; color:#555; line-height:1.7; margin-top:1.5mm; }
  .items { margin-bottom:0; }
  .items th { text-align:left; font-size:9pt; font-weight:800; padding:0 3mm 3mm 0;
              border-bottom:1px solid #141310; }
  .items td { font-size:9.5pt; padding:4.5mm 3mm 4.5mm 0; border-bottom:1px solid #e6e6e6; vertical-align:top; }
  .e-desc { width:52%; }
  .e-qty  { width:11%; text-align:right; }
  .e-unit { width:17%; text-align:right; white-space:nowrap; }
  .e-amt  { width:20%; text-align:right; white-space:nowrap; }
  .items th.e-qty, .items th.e-unit, .items th.e-amt { text-align:right; }
  .empty { color:#aaa; font-style:italic; }
  .totalsWrap { display:flex; justify-content:flex-end; margin-top:6mm; }
  .totals { width:auto; }
  .totals td { font-size:9.5pt; font-weight:700; padding:1.6mm 0 1.6mm 12mm; text-align:right; white-space:nowrap; }
  .totals td:first-child { padding-left:0; text-align:left; color:#666; font-weight:600; }
  .grand td { padding-top:3mm; }
  .grand td:first-child { font-size:10.5pt; font-weight:900; color:#141310; }
  .chip { display:inline-block; background:${isPaid ? '#2a9d4c' : '#141310'}; color:#fff;
          font-size:12pt; font-weight:900; padding:1.8mm 5mm; }
  .notes { margin-top:10mm; font-size:9pt; color:#555; line-height:1.7; }
  .noteslabel { font-size:8pt; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;
                color:#141310; margin-bottom:2mm; }
  .signoff { display:flex; justify-content:space-between; gap:12mm; margin-top:14mm; }
  .sleft { flex:1; }
  .sright { width:62mm; text-align:right; }
  .sitalic { font-size:8.5pt; font-style:italic; color:#444; line-height:1.7; }
  .sitalic.small { font-size:7.5pt; color:#888; }
  .thanks { font-size:10.5pt; font-weight:900; margin-top:6mm; }
  .sigline { border-bottom:1px solid #141310; height:9mm; margin-bottom:1.5mm; }
  `;

  return page({ ctx, css, body, padding: '17mm 17mm 15mm' });
}
