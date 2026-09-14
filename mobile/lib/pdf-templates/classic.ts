import {
  type Ctx, page, esc, escMultiline, fmt, logoTag, paidStamp, bankBlock,
} from './shared';

/**
 * The plain business quote — grey banded headings, ruled boxes, a signature block.
 * Deliberately unfashionable: this is the default because it is what a customer
 * expects a quote to look like, and it never looks wrong in front of anyone.
 *
 * Accent colour is used sparingly here, on the total only. A tradie who picks this
 * template has chosen restraint, and flooding it with orange would defeat that.
 */
export function buildClassic(ctx: Ctx): string {
  const { d, s, accent, isInvoice, isPaid } = ctx;

  const bandLabel = (t: string) =>
    `<div class="band">${t}</div>`;

  const metaCell = (label: string, value: string) => `
    <tr>
      <td class="mlabel">${label}</td>
      <td class="mvalue">${value || '&nbsp;'}</td>
    </tr>`;

  const rows = ctx.rows.map(r => `
    <tr>
      <td class="c-desc">${esc(r.description)}</td>
      <td class="c-qty">${esc(r.qtyLabel)}</td>
      <td class="c-unit">${r.unitLabel}</td>
      <td class="c-amt">${r.totalLabel}</td>
    </tr>`).join('');

  // The blank ruled rows are the point of this layout — a quote that stops dead
  // after three lines looks unfinished on a printed page.
  const filler = Array.from({ length: Math.max(0, 8 - ctx.rows.length) }, () => `
    <tr><td class="c-desc">&nbsp;</td><td class="c-qty"></td><td class="c-unit"></td><td class="c-amt"></td></tr>`).join('');

  const body = `
  ${paidStamp(ctx)}

  <div class="top">
    <div class="from">
      ${logoTag(ctx, 48, 'margin-bottom:3mm;')}
      <div class="bizname">${ctx.biz || '[Business Name]'}</div>
      ${ctx.addr  ? `<div class="fromline">${ctx.addr}</div>` : ''}
      ${ctx.phone ? `<div class="fromline">Phone: ${ctx.phone}</div>` : ''}
      ${ctx.email ? `<div class="fromline">${ctx.email}</div>` : ''}
      ${ctx.abn   ? `<div class="fromline">ABN ${ctx.abn}</div>` : ''}
    </div>
    <div class="doctitle">${isInvoice ? 'TAX INVOICE' : 'QUOTATION'}</div>
  </div>

  <table class="metatable">
    ${metaCell(isInvoice ? 'INVOICE #' : 'QUOTE #', esc(ctx.docNumber))}
    ${metaCell('DATE', ctx.issued)}
    ${ctx.dateValue ? metaCell(ctx.dateLabel.toUpperCase(), ctx.dateValue) : ''}
  </table>

  ${bandLabel('CUSTOMER')}
  <div class="box">
    ${d.customerName ? `<div class="custname">${esc(d.customerName)}</div>` : `<div class="muted">[Customer name]</div>`}
    ${d.customerAddress ? `<div class="custline">${esc(d.customerAddress)}</div>` : ''}
    ${d.customerPhone   ? `<div class="custline">${esc(d.customerPhone)}</div>` : ''}
    ${d.customerEmail   ? `<div class="custline">${esc(d.customerEmail)}</div>` : ''}
  </div>

  ${bandLabel('DESCRIPTION OF WORK')}
  <div class="box work">
    <div class="worktitle">${esc(d.jobTitle)}</div>
    ${d.summary ? `<div class="worktext">${escMultiline(d.summary)}</div>` : ''}
    ${d.customMessage ? `<div class="worktext">${escMultiline(d.customMessage)}</div>` : ''}
  </div>

  ${bandLabel('ITEMISED COSTS')}
  <table class="items nb">
    <thead>
      <tr>
        <th class="c-desc">DESCRIPTION</th>
        <th class="c-qty">QTY</th>
        <th class="c-unit">UNIT PRICE</th>
        <th class="c-amt">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${filler}
    </tbody>
  </table>

  <table class="totals nb">
    ${ctx.showSubtotal ? `<tr><td class="tlabel">SUBTOTAL</td><td class="tvalue">$${fmt(d.subtotal)}</td></tr>` : ''}
    ${ctx.showGst ? `<tr><td class="tlabel">GST (10%)</td><td class="tvalue">$${fmt(d.gstAmount!)}</td></tr>` : ''}
    <tr class="grand">
      <td class="tlabel">${isInvoice ? (isPaid ? 'AMOUNT PAID' : 'AMOUNT DUE') : 'TOTAL QUOTE'}</td>
      <td class="tvalue">$${fmt(d.totalAmount)}</td>
    </tr>
  </table>

  ${d.notes ? `
  ${bandLabel('NOTES & TERMS')}
  <div class="box notes">${escMultiline(d.notes)}</div>` : ''}

  ${bankBlock(ctx, { bg: '#f4f4f4', border: '#d8d8d8', labelColor: '#666' })}

  ${!isInvoice ? `
  <div class="nb accept">
    <div class="acceptintro">This quotation is not a contract or a bill. It is an estimate of the cost for the
    work described above. Please sign and return to accept.</div>
    <div class="sigrow">
      <div class="sigcell"><div class="sigline"></div><div class="siglabel">Signature</div></div>
      <div class="sigcell"><div class="sigline"></div><div class="siglabel">Printed name</div></div>
      <div class="sigcell narrow"><div class="sigline"></div><div class="siglabel">Date</div></div>
    </div>
  </div>` : ''}

  ${ctx.footerBits.length ? `<div class="foot">${ctx.footerBits.join('  ·  ')}</div>` : ''}
  `;

  const css = `
  .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8mm; }
  .bizname { font-size:15pt; font-weight:800; color:#1f3a63; letter-spacing:-0.2px; }
  .fromline { font-size:8.5pt; color:#444; margin-top:0.8mm; }
  .doctitle { font-size:26pt; font-weight:800; letter-spacing:-0.5px; color:#141310; text-align:right; }
  .metatable { width:78mm; margin-left:auto; margin-bottom:7mm; border:1px solid #999; }
  .metatable td { border:1px solid #999; padding:1.6mm 2.5mm; font-size:8.5pt; }
  .mlabel { background:#dcdcdc; font-weight:800; letter-spacing:0.6px; width:38%; }
  .mvalue { text-align:right; }
  .band { background:#dcdcdc; border:1px solid #999; border-bottom:none; padding:1.6mm 2.5mm;
          font-size:8pt; font-weight:800; letter-spacing:1.4px; }
  .box { border:1px solid #999; padding:3mm; margin-bottom:6mm; }
  .custname { font-size:11pt; font-weight:800; }
  .custline { font-size:9pt; color:#444; margin-top:0.6mm; }
  .muted { font-size:9pt; color:#999; font-style:italic; }
  .work { min-height:22mm; }
  .worktitle { font-size:11pt; font-weight:800; }
  .worktext { font-size:9.5pt; color:#333; margin-top:1.5mm; line-height:1.6; }
  .items { border:1px solid #999; border-top:none; margin-bottom:0; }
  .items th { background:#dcdcdc; border:1px solid #999; padding:1.6mm 2.5mm;
              font-size:8pt; font-weight:800; letter-spacing:1px; }
  .items td { border-left:1px solid #999; border-right:1px solid #999;
              border-bottom:1px dotted #c4c4c4; padding:1.6mm 2.5mm; font-size:9.5pt; }
  .items tbody tr:last-child td { border-bottom:1px solid #999; }
  .c-desc { text-align:left; width:58%; }
  .c-qty  { text-align:center; width:10%; }
  .c-unit { text-align:right; width:16%; white-space:nowrap; }
  .c-amt  { text-align:right; width:16%; white-space:nowrap; }
  .totals { width:78mm; margin-left:auto; margin-top:4mm; border:1px solid #999; }
  .totals td { border:1px solid #999; padding:1.8mm 2.5mm; font-size:9.5pt; }
  .tlabel { background:#f0f0f0; font-weight:800; letter-spacing:0.6px; }
  .tvalue { text-align:right; white-space:nowrap; font-weight:700; }
  .grand .tlabel { background:${accent}; color:#fff; font-size:10pt; }
  .grand .tvalue { font-size:12pt; font-weight:900; }
  .notes { font-size:9pt; color:#333; line-height:1.7; }
  .accept { margin-top:9mm; }
  .acceptintro { font-size:8pt; color:#555; line-height:1.6; margin-bottom:7mm; }
  .sigrow { display:flex; gap:6mm; }
  .sigcell { flex:2; }
  .sigcell.narrow { flex:1; }
  .sigline { border-bottom:1px solid #333; height:7mm; }
  .siglabel { font-size:7.5pt; color:#666; margin-top:1mm; }
  .foot { margin-top:9mm; padding-top:2.5mm; border-top:1px solid #ccc;
          text-align:center; font-size:8pt; color:#777; }
  `;

  return page({ ctx, css, body, padding: '14mm 14mm 16mm' });
}
