import {
  type Ctx, page, esc, escMultiline, fmt, logoTag, paidStamp, bankBlock, acceptanceBlock,
} from './shared';

/**
 * The colour-band header the app shipped with, kept so anyone already sending this
 * style keeps it, and rebuilt on the A4 shell like the rest.
 *
 * The logo sits over the accent band with multiply blending, which lets a logo
 * exported on a white background sit on the colour without a white box around it.
 */
export function buildModern(ctx: Ctx): string {
  const { d, accent, isInvoice, isPaid, isOverdue } = ctx;

  const rows = ctx.rows.map((r, i) => `
    <tr${i % 2 ? ' class="alt"' : ''}>
      <td class="m-desc">${esc(r.description)}</td>
      <td class="m-qty">${esc(r.qtyLabel)}</td>
      <td class="m-unit">${r.unitLabel}</td>
      <td class="m-amt">${r.totalLabel}</td>
    </tr>`).join('');

  const body = `
  ${paidStamp(ctx)}

  <div class="band">
    <div class="bandinner">
      <div>
        ${logoTag(ctx, 46, 'margin-bottom:2.5mm;mix-blend-mode:multiply;')}
        <div class="biz">${ctx.biz || '—'}</div>
        ${ctx.addr ? `<div class="bandline">${ctx.addr}</div>` : ''}
        ${[ctx.phone, ctx.email].filter(Boolean).length
          ? `<div class="bandline">${[ctx.phone, ctx.email].filter(Boolean).join('  ·  ')}</div>` : ''}
      </div>
      <div class="bandright">
        <div class="doclabel">${ctx.docLabel}</div>
        <div class="docnum">#${esc(ctx.docNumber)}</div>
      </div>
    </div>
  </div>

  <div class="strip">
    <div class="stripcell wide">
      <div class="slabel">${isInvoice ? 'Bill to' : 'Prepared for'}</div>
      ${d.customerName ? `
        <div class="sname">${esc(d.customerName)}</div>
        ${d.customerAddress ? `<div class="sline">${esc(d.customerAddress)}</div>` : ''}
        ${d.customerPhone   ? `<div class="sline">${esc(d.customerPhone)}</div>` : ''}
        ${d.customerEmail   ? `<div class="sline">${esc(d.customerEmail)}</div>` : ''}`
        : `<div class="snone">No customer on file</div>`}
    </div>
    <div class="divider"></div>
    <div class="stripcell">
      <div class="slabel">Issued</div>
      <div class="sval">${ctx.issued}</div>
      ${ctx.dateValue ? `
      <div class="slabel top">${ctx.dateLabel}</div>
      <div class="sval"${isOverdue ? ' style="color:#d94d0e;"' : ''}>${ctx.dateValue}</div>` : ''}
    </div>
    <div class="divider"></div>
    <div class="stripcell center">
      <div class="slabel">${isInvoice ? 'Amount due' : 'Quote total'}</div>
      <div class="bigtotal">$${fmt(d.totalAmount)}</div>
      ${isPaid ? `<div class="paidtag">PAID ✓</div>` : ''}
    </div>
  </div>

  <div class="job nb">
    <div class="jobtitle">${esc(d.jobTitle)}</div>
    ${d.summary ? `<div class="jobsummary">${escMultiline(d.summary)}</div>` : ''}
  </div>

  ${d.customMessage ? `
  <div class="message nb">
    <div class="messagelabel">Message</div>
    <div class="messagetext">${escMultiline(d.customMessage)}</div>
  </div>` : ''}

  <table class="items nb">
    <thead>
      <tr>
        <th class="m-desc">Description</th>
        <th class="m-qty">Qty</th>
        <th class="m-unit">Unit price</th>
        <th class="m-amt">Total</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="empty">No items</td></tr>`}</tbody>
  </table>

  <div class="totalsWrap nb">
    <div class="totalsCol">
      ${ctx.showSubtotal ? `<div class="trow"><span>Subtotal</span><span>$${fmt(d.subtotal)}</span></div>` : ''}
      ${ctx.showGst ? `<div class="trow"><span>GST (10%)</span><span>$${fmt(d.gstAmount!)}</span></div>` : ''}
      <div class="grand">
        <span class="grandlabel">TOTAL</span>
        <span class="grandvalue">$${fmt(d.totalAmount)}</span>
      </div>
    </div>
  </div>

  ${d.notes ? `
  <div class="notes nb">
    <div class="noteslabel">Notes &amp; terms</div>
    <div class="notesbody">${escMultiline(d.notes)}</div>
  </div>` : ''}

  <!-- The sheet has no padding so the band can bleed to the edges, so the shared
       blocks need the page margin applied around them here. -->
  <div style="margin:0 14mm;">
    ${bankBlock(ctx, { bg: '#f7f4ee', border: 'rgba(20,19,16,0.07)', labelColor: 'rgba(20,19,16,0.4)' })}
    ${acceptanceBlock(ctx, { line: 'rgba(20,19,16,0.2)', label: 'rgba(20,19,16,0.4)' })}
  </div>

  ${ctx.footerBits.length ? `<div class="foot">${ctx.footerBits.join('  ·  ')}</div>` : ''}
  `;

  const css = `
  .sheet { padding:0; }
  .band { background:${accent}; padding:11mm 14mm 10mm; }
  .bandinner { display:flex; justify-content:space-between; align-items:flex-start; }
  .biz { font-size:15pt; font-weight:900; color:#fff; letter-spacing:-0.4px; line-height:1.1; }
  .bandline { font-size:8.5pt; color:rgba(255,255,255,0.75); margin-top:1.2mm; }
  .bandright { text-align:right; }
  .doclabel { font-size:8pt; font-weight:900; color:rgba(255,255,255,0.7);
              letter-spacing:3px; margin-bottom:1mm; }
  .docnum { font-size:22pt; font-weight:900; color:#fff; letter-spacing:-1px; line-height:1; }
  .strip { display:flex; border-bottom:1px solid rgba(20,19,16,0.08); }
  .stripcell { flex:1; padding:6mm 7mm; }
  .stripcell.wide { flex:2; padding-left:14mm; }
  .stripcell.center { display:flex; flex-direction:column; justify-content:center; padding-right:14mm; }
  .divider { width:1px; background:rgba(20,19,16,0.07); margin:4mm 0; }
  .slabel { font-size:7.5pt; font-weight:900; letter-spacing:2px; text-transform:uppercase;
            color:rgba(20,19,16,0.4); margin-bottom:1.5mm; }
  .slabel.top { margin-top:4mm; }
  .sname { font-size:11pt; font-weight:800; }
  .sline { font-size:8.5pt; color:rgba(20,19,16,0.55); margin-top:0.6mm; }
  .snone { font-size:9pt; color:rgba(20,19,16,0.3); font-style:italic; }
  .sval { font-size:9.5pt; font-weight:700; }
  .bigtotal { font-size:18pt; font-weight:900; color:${isPaid ? '#2a9d4c' : accent}; letter-spacing:-0.8px; line-height:1.1; }
  .paidtag { font-size:8pt; font-weight:800; color:#2a9d4c; margin-top:1mm; letter-spacing:0.5px; }
  .job { margin:8mm 14mm 0; }
  .jobtitle { font-size:13pt; font-weight:800; letter-spacing:-0.2px; }
  .jobsummary { font-size:9.5pt; color:rgba(20,19,16,0.65); line-height:1.7; margin-top:2mm;
                padding:3.5mm 4mm; background:#f7f4ee; border-radius:2mm; }
  .message { margin:6mm 14mm 0; padding:3.5mm 4mm; background:#f0f7ff;
             border-left:1mm solid #1f6feb; border-radius:0 2mm 2mm 0; }
  .messagelabel { font-size:8pt; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;
                  color:#1f6feb; margin-bottom:1.5mm; }
  .messagetext { font-size:9.5pt; color:rgba(20,19,16,0.75); line-height:1.7; }
  .items { margin:8mm 0 0; width:auto; margin-left:14mm; margin-right:14mm; }
  .items th { font-size:7.5pt; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;
              color:rgba(20,19,16,0.4); padding:2mm 3mm 2mm 0; border-bottom:0.6mm solid ${accent}; text-align:left; }
  .items td { font-size:9.5pt; padding:2.8mm 3mm 2.8mm 0; border-bottom:1px solid rgba(20,19,16,0.05); vertical-align:top; }
  .items tr.alt td { background:rgba(20,19,16,0.025); }
  .m-desc { width:53%; }
  .m-qty  { width:11%; text-align:center; }
  .m-unit { width:18%; text-align:right; white-space:nowrap; }
  .m-amt  { width:18%; text-align:right; white-space:nowrap; font-weight:700; }
  .items th.m-qty { text-align:center; }
  .items th.m-unit, .items th.m-amt { text-align:right; }
  .empty { color:rgba(20,19,16,0.35); font-style:italic; }
  .totalsWrap { display:flex; justify-content:flex-end; margin:3mm 14mm 0; }
  .totalsCol { min-width:62mm; }
  .trow { display:flex; justify-content:space-between; padding:1.3mm 0;
          font-size:9.5pt; color:rgba(20,19,16,0.55); }
  .grand { display:flex; justify-content:space-between; align-items:center;
           padding:3mm 4mm; background:${isPaid ? '#2a9d4c' : accent}; border-radius:2.5mm; margin-top:2mm; }
  .grandlabel { font-size:10pt; font-weight:900; color:#fff; letter-spacing:0.5px; }
  .grandvalue { font-size:15pt; font-weight:900; color:#fff; letter-spacing:-0.5px; }
  .notes { margin:8mm 14mm 0; }
  .noteslabel { font-size:7.5pt; font-weight:900; letter-spacing:2px; text-transform:uppercase;
                color:rgba(20,19,16,0.4); margin-bottom:2mm; }
  .notesbody { font-size:9pt; color:rgba(20,19,16,0.65); line-height:1.8; background:#f7f4ee;
               padding:3.5mm 4mm; border-radius:2.5mm; border:1px solid rgba(20,19,16,0.07); }
  .foot { margin:9mm 14mm 12mm; padding-top:3mm; border-top:1px solid rgba(20,19,16,0.08);
          font-size:8pt; color:rgba(20,19,16,0.35); text-align:center; letter-spacing:0.3px; }
  `;

  return page({ ctx, css, body, padding: '0' });
}
