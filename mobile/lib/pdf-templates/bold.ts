import {
  type Ctx, page, esc, escMultiline, fmt, paidStamp, acceptanceBlock,
} from './shared';

/**
 * Big friendly masthead in the accent colour, a logo disc, and a soft grey panel
 * holding the reference details. The most approachable of the set — aimed at
 * domestic customers rather than trade accounts.
 *
 * Where there's no logo the disc falls back to the business initials, so the corner
 * never sits empty and the masthead keeps its balance.
 */
export function buildBold(ctx: Ctx): string {
  const { d, s, accent, isInvoice, isPaid } = ctx;

  const initials = (ctx.s.businessName ?? '')
    .trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '—';

  const disc = ctx.logoUrl
    ? `<div class="disc"><img src="${esc(ctx.logoUrl)}" alt="" /></div>`
    : `<div class="disc discInitials">${esc(initials)}</div>`;

  const rows = ctx.rows.map(r => `
    <tr>
      <td class="b-desc">${esc(r.description)}</td>
      <td class="b-qty">${esc(r.qtyLabel)}</td>
      <td class="b-unit">${r.unitLabel}</td>
      <td class="b-amt">${r.totalLabel}</td>
    </tr>`).join('');

  const metaRow = (label: string, value: string) =>
    `<tr><td class="mk">${label}</td><td class="mv">${value}</td></tr>`;

  const body = `
  ${paidStamp(ctx)}

  <div class="masthead">
    <div class="bigword">${isInvoice ? 'Invoice' : 'Quote'}</div>
    ${disc}
  </div>
  <div class="rule"></div>

  <div class="cols">
    <div class="colleft">
      <div class="biz">${ctx.biz || '—'}</div>
      ${ctx.addr  ? `<div class="bizline">${ctx.addr}</div>` : ''}
      ${ctx.phone ? `<div class="bizline">Phone: ${ctx.phone}</div>` : ''}
      ${ctx.email ? `<div class="bizline">${ctx.email}</div>` : ''}
      ${ctx.abn   ? `<div class="bizline">ABN ${ctx.abn}</div>` : ''}

      <div class="tolabel">To</div>
      <div class="toname">${d.customerName ? esc(d.customerName) : '—'}</div>
      ${d.customerAddress ? `<div class="bizline">${esc(d.customerAddress)}</div>` : ''}
      ${d.customerPhone   ? `<div class="bizline">${esc(d.customerPhone)}</div>` : ''}
      ${d.customerEmail   ? `<div class="bizline">${esc(d.customerEmail)}</div>` : ''}
    </div>

    <div class="panel">
      <table class="metatable">
        ${metaRow(isInvoice ? 'Invoice date:' : 'Quote date:', ctx.issued)}
        ${metaRow(isInvoice ? 'Invoice number:' : 'Quote reference:', `#${esc(ctx.docNumber)}`)}
        ${ctx.dateValue ? metaRow(`${ctx.dateLabel}:`, ctx.dateValue) : ''}
        ${d.customerName ? metaRow('Client:', esc(d.customerName)) : ''}
      </table>
    </div>
  </div>

  <div class="info">
    <div class="infolabel">${esc(d.jobTitle)}</div>
    ${d.summary ? `<div class="infotext">${escMultiline(d.summary)}</div>` : ''}
    ${d.customMessage ? `<div class="infotext">${escMultiline(d.customMessage)}</div>` : ''}
  </div>

  <div class="rule thin"></div>

  <table class="items nb">
    <thead>
      <tr>
        <th class="b-desc">Description</th>
        <th class="b-qty">Qty</th>
        <th class="b-unit">Unit price</th>
        <th class="b-amt">Total</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="empty">No items</td></tr>`}</tbody>
  </table>

  <div class="totalsWrap nb">
    <table class="totals">
      ${ctx.showSubtotal ? `<tr><td>Subtotal</td><td>$${fmt(d.subtotal)}</td></tr>` : ''}
      ${ctx.showGst ? `<tr><td>GST (10%)</td><td>$${fmt(d.gstAmount!)}</td></tr>` : ''}
      <tr class="grand"><td>${isInvoice ? (isPaid ? 'Paid' : 'Total due') : 'Total'}</td><td>$${fmt(d.totalAmount)}</td></tr>
    </table>
  </div>

  ${d.notes ? `<div class="notes nb"><div class="noteslabel">Notes &amp; terms</div>${escMultiline(d.notes)}</div>` : ''}

  ${acceptanceBlock(ctx, { line: '#c9c9c9', label: '#999' })}

  <div class="footer nb">
    <div class="fcol">
      <div class="flabel">Registered address</div>
      <div class="fval">${ctx.biz || '—'}</div>
      ${ctx.addr ? `<div class="fval">${ctx.addr}</div>` : ''}
    </div>
    <div class="fcol">
      <div class="flabel">Contact</div>
      ${ctx.phone ? `<div class="fval">${ctx.phone}</div>` : ''}
      ${ctx.email ? `<div class="fval">${ctx.email}</div>` : ''}
    </div>
    ${isInvoice && ctx.hasBank ? `
    <div class="fcol">
      <div class="flabel">Payment details</div>
      ${s.bankName      ? `<div class="fval">${esc(s.bankName)}</div>` : ''}
      ${s.accountName   ? `<div class="fval">${esc(s.accountName)}</div>` : ''}
      ${s.bsb           ? `<div class="fval">BSB ${esc(s.bsb)}</div>` : ''}
      ${s.accountNumber ? `<div class="fval">Acct ${esc(s.accountNumber)}</div>` : ''}
    </div>` : ''}
  </div>
  <div class="baseband"></div>
  `;

  const css = `
  .sheet { padding-bottom:22mm; }
  .masthead { display:flex; justify-content:space-between; align-items:center; margin-bottom:7mm; }
  .bigword { font-size:38pt; font-weight:900; color:${accent}; letter-spacing:-1.5px; line-height:1; }
  .disc { width:26mm; height:26mm; border-radius:50%; background:${accent};
          display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
  .disc img { max-width:19mm; max-height:19mm; object-fit:contain; }
  .discInitials { color:#fff; font-size:15pt; font-weight:900; letter-spacing:0.5px; }
  .rule { height:1.2mm; background:${accent}; margin-bottom:9mm; }
  .rule.thin { height:0.5mm; background:${accent}; margin:7mm 0 0; }
  .cols { display:flex; gap:10mm; margin-bottom:9mm; }
  .colleft { flex:1; }
  .biz { font-size:11.5pt; font-weight:900; }
  .bizline { font-size:8.5pt; color:#555; margin-top:0.6mm; font-style:italic; }
  .tolabel { font-size:10pt; font-weight:900; margin-top:6mm; }
  .toname { font-size:10.5pt; font-weight:800; margin-top:1mm; }
  .panel { width:78mm; background:#f2f2f2; border-radius:2mm; padding:5mm; align-self:flex-start; }
  .metatable td { font-size:8.5pt; padding:1.1mm 0; vertical-align:top; }
  .mk { color:#555; width:52%; }
  .mv { text-align:right; font-weight:700; }
  .info { margin-bottom:2mm; }
  .infolabel { font-size:10.5pt; font-weight:900; }
  .infotext { font-size:9.5pt; color:#555; line-height:1.7; margin-top:1.5mm; }
  .items { margin-top:7mm; }
  .items th { text-align:left; font-size:8.5pt; font-weight:800; color:#141310;
              padding:0 3mm 2.5mm 0; border-bottom:1px solid ${accent}; }
  .items td { font-size:9.5pt; padding:3.2mm 3mm 3.2mm 0; border-bottom:1px solid #ededed; vertical-align:top; }
  .b-desc { width:50%; }
  .b-qty  { width:12%; text-align:right; }
  .b-unit { width:19%; text-align:right; white-space:nowrap; }
  .b-amt  { width:19%; text-align:right; white-space:nowrap; }
  .items th.b-qty, .items th.b-unit, .items th.b-amt { text-align:right; }
  .empty { color:#aaa; font-style:italic; }
  .totalsWrap { display:flex; justify-content:flex-end; margin-top:6mm; }
  .totals { width:auto; }
  .totals td { font-size:9.5pt; font-weight:700; padding:1.5mm 0 1.5mm 12mm; text-align:right; white-space:nowrap; }
  .totals td:first-child { padding-left:0; text-align:left; color:#666; font-weight:600; }
  .grand td { font-size:13pt; font-weight:900; color:${isPaid ? '#2a9d4c' : accent}; padding-top:3mm; }
  .grand td:first-child { color:${isPaid ? '#2a9d4c' : accent}; font-size:11pt; }
  .notes { margin-top:9mm; font-size:9pt; color:#555; line-height:1.7; }
  .noteslabel { font-size:8pt; font-weight:800; letter-spacing:1.4px; text-transform:uppercase;
                color:#999; margin-bottom:1.5mm; }
  .footer { display:flex; gap:9mm; margin-top:12mm; padding-top:4mm; border-top:1px solid #ddd; }
  .fcol { flex:1; }
  .flabel { font-size:8.5pt; font-weight:900; margin-bottom:1.2mm; }
  .fval { font-size:8pt; color:#555; margin-top:0.4mm; }
  .baseband { position:absolute; left:0; right:0; bottom:0; height:8mm; background:${accent}; }
  `;

  return page({ ctx, css, body, padding: '15mm 15mm 15mm' });
}
