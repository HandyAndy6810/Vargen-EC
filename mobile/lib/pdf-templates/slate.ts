import {
  type Ctx, page, esc, escMultiline, fmt, logoTag, paidStamp, bankBlock, acceptanceBlock, customerExtraLines, noGstRow } from './shared';

/**
 * Formal and quiet: a narrow accent rail down the left edge, serif headings, and
 * figures set in a column rather than a boxed table. Intended for the larger,
 * slower jobs where a quote is read carefully rather than glanced at.
 *
 * Headings are forced to a serif regardless of the font setting — the rail and the
 * serif are the whole identity of this one, and a sans heading collapses it into a
 * plainer template we already have.
 */
export function buildSlate(ctx: Ctx): string {
  const { d, accent, isInvoice, isPaid } = ctx;

  const rows = ctx.rows.map(r => `
    <tr>
      <td class="s-desc">${esc(r.description)}</td>
      <td class="s-qty">${esc(r.qtyLabel)}</td>
      <td class="s-unit">${r.unitLabel}</td>
      <td class="s-amt">${r.totalLabel}</td>
    </tr>`).join('');

  const body = `
  <div class="rail"></div>
  ${paidStamp(ctx)}

  <div class="inner">
    <div class="head">
      <div>
        ${logoTag(ctx, 44, 'margin-bottom:3mm;')}
        <div class="biz">${ctx.biz || '—'}</div>
        <div class="bizmeta">
          ${[ctx.addr, ctx.phone, ctx.email].filter(Boolean).join('<br>')}
          ${ctx.abn ? `${[ctx.addr, ctx.phone, ctx.email].filter(Boolean).length ? '<br>' : ''}ABN ${ctx.abn}` : ''}
        </div>
      </div>
      <div class="headright">
        <div class="doctype">${isInvoice ? 'Tax Invoice' : 'Quotation'}</div>
        <div class="docnum">No. ${esc(ctx.docNumber)}</div>
        <div class="docdate">${ctx.issued}</div>
        ${ctx.dateValue ? `<div class="docdate">${ctx.dateLabel}: ${ctx.dateValue}</div>` : ''}
      </div>
    </div>

    <div class="hr"></div>

    <div class="two">
      <div class="half">
        <div class="minilabel">${isInvoice ? 'Billed to' : 'Prepared for'}</div>
        <div class="party">${d.customerName ? esc(d.customerName) : '—'}</div>
        ${customerExtraLines(d, 'partyline', esc)}
    ${d.customerAddress ? `<div class="partyline">${esc(d.customerAddress)}</div>` : ''}
        ${d.customerPhone   ? `<div class="partyline">${esc(d.customerPhone)}</div>` : ''}
        ${d.customerEmail   ? `<div class="partyline">${esc(d.customerEmail)}</div>` : ''}
      </div>
      <div class="half">
        <div class="minilabel">${isInvoice ? 'Amount due' : 'Quoted total'}</div>
        <div class="headline">$${fmt(d.totalAmount)}</div>
        ${isPaid ? `<div class="paidnote">Paid in full</div>` : ''}
      </div>
    </div>

    <div class="section nb">
      <div class="minilabel">The work</div>
      <div class="worktitle">${esc(d.jobTitle)}</div>
      ${d.summary ? `<div class="worktext">${escMultiline(d.summary)}</div>` : ''}
      ${d.customMessage ? `<div class="worktext">${escMultiline(d.customMessage)}</div>` : ''}
    </div>

    <div class="section">
      <div class="minilabel">Breakdown</div>
      <table class="items">
        <thead>
          <tr>
            <th class="s-desc">Item</th>
            <th class="s-qty">Qty</th>
            <th class="s-unit">Rate</th>
            <th class="s-amt">Amount</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4" class="empty">No items</td></tr>`}</tbody>
      </table>

      <div class="totalsWrap nb">
        <table class="totals">
          ${ctx.showSubtotal ? `<tr><td>Subtotal</td><td>$${fmt(d.subtotal)}</td></tr>` : ''}
          ${ctx.showGst ? `<tr><td>GST (10%)</td><td>$${fmt(d.gstAmount!)}</td></tr>` : ''}
          <tr class="grand"><td>${isInvoice ? (isPaid ? 'Paid' : 'Total due') : 'Total'}</td><td>$${fmt(d.totalAmount)}</td></tr>
      ${noGstRow(ctx)}
        </table>
      </div>
    </div>

    ${d.notes ? `
    <div class="section nb">
      <div class="minilabel">Notes &amp; terms</div>
      <div class="worktext">${escMultiline(d.notes)}</div>
    </div>` : ''}

    ${bankBlock(ctx, { bg: '#fafaf8', border: '#e2e2dd', labelColor: '#999' })}
    ${acceptanceBlock(ctx, { line: '#c4c4be', label: '#999' })}

    ${isInvoice && ctx.s.paymentTermsDays
      ? `<div class="foot">Payment due within ${ctx.s.paymentTermsDays} days of the issue date.</div>` : ''}
  </div>
  `;

  const css = `
  .sheet { padding:0; }
  /* q13. Fixed, so the rail repeats on every printed page (it used to stop
     partway down page 2). Page margins give a continuation page room at the
     top and bottom; page 1 keeps its own spacing through .inner. A typical
     quote fits one A4 page; a long one breaks between rows, not mid-row. */
  @page { size: A4; margin: 10mm 0 12mm 0; }
  @page :first { margin-top: 0; }
  .sheet { min-height: 0 !important; overflow: visible; }
  .rail { position:fixed; left:0; top:-10mm; bottom:-12mm; width:6mm; background:${accent}; }
  .items tr { page-break-inside: avoid; }
  .items thead { display: table-header-group; }
  .inner { padding:13mm 16mm 0 22mm; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10mm; }
  .biz { font-family:Georgia,'Times New Roman',serif; font-size:15pt; font-weight:700; letter-spacing:-0.2px; }
  .bizmeta { font-size:8.5pt; color:#666; line-height:1.7; margin-top:1.5mm; }
  .headright { text-align:right; flex-shrink:0; }
  .doctype { font-family:Georgia,'Times New Roman',serif; font-size:16pt; font-weight:700;
             color:${accent}; letter-spacing:-0.2px; }
  .docnum { font-size:9.5pt; font-weight:700; margin-top:1.5mm; }
  .docdate { font-size:8.5pt; color:#777; margin-top:0.8mm; }
  .hr { height:1px; background:#dedad2; margin:5mm 0; }
  .two { display:flex; gap:12mm; margin-bottom:7mm; }
  .half { flex:1; }
  .minilabel { font-size:7.5pt; font-weight:800; letter-spacing:2px; text-transform:uppercase;
               color:#a3a097; margin-bottom:2mm; }
  .party { font-size:11pt; font-weight:700; }
  .partyline { font-size:9pt; color:#666; margin-top:0.6mm; }
  .headline { font-family:Georgia,'Times New Roman',serif; font-size:22pt; font-weight:700;
              color:${isPaid ? '#2a9d4c' : '#141310'}; letter-spacing:-0.8px; line-height:1.1; }
  .paidnote { font-size:8.5pt; font-weight:700; color:#2a9d4c; margin-top:1mm; }
  .section { margin-bottom:6mm; }
  .worktitle { font-family:Georgia,'Times New Roman',serif; font-size:12pt; font-weight:700; }
  .worktext { font-size:9.5pt; color:#555; line-height:1.8; margin-top:1.5mm; }
  .items th { text-align:left; font-size:8pt; font-weight:800; letter-spacing:1.2px;
              text-transform:uppercase; color:#a3a097; padding:0 3mm 2mm 0;
              border-bottom:1px solid #dedad2; }
  .items td { font-size:9.5pt; padding:2.4mm 3mm 2.4mm 0; border-bottom:1px solid #f0eee9; vertical-align:top; }
  .s-desc { width:54%; }
  .s-qty  { width:11%; text-align:right; }
  .s-unit { width:17%; text-align:right; white-space:nowrap; }
  .s-amt  { width:18%; text-align:right; white-space:nowrap; }
  .items th.s-qty, .items th.s-unit, .items th.s-amt { text-align:right; }
  .empty { color:#b5b2aa; font-style:italic; }
  .totalsWrap { display:flex; justify-content:flex-end; margin-top:5mm; }
  .totals { width:auto; }
  .totals td { font-size:9.5pt; padding:1.4mm 0 1.4mm 12mm; text-align:right; white-space:nowrap; color:#666; }
  .totals td:first-child { padding-left:0; text-align:left; }
  .grand td { font-family:Georgia,'Times New Roman',serif; font-size:13pt; font-weight:700;
              color:${isPaid ? '#2a9d4c' : '#141310'}; padding-top:2.5mm;
              border-top:1px solid #dedad2; }
  .foot { margin-top:5mm; font-size:8pt; color:#999; }
  `;

  return page({ ctx, css, body, padding: '0' });
}
