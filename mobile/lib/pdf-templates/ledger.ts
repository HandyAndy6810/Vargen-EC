import {
  type Ctx, page, esc, escMultiline, fmt, logoTag, paidStamp, acceptanceBlock,
} from './shared';

/** Words for a total, the way an Australian tax invoice traditionally spells it out. */
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${under1000(n % 100)}` : ''}`;
}

function words(n: number): string {
  const whole = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - whole) * 100);
  if (whole === 0 && cents === 0) return 'zero';
  const parts: string[] = [];
  const scale: [number, string][] = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  let rest = whole;
  for (const [value, name] of scale) {
    if (rest >= value) {
      parts.push(`${under1000(Math.floor(rest / value))} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) parts.push(under1000(rest));
  const w = parts.join(' ') || 'zero';
  return cents > 0 ? `${w} AUD and ${under1000(cents)} cents` : `${w} AUD`;
}

/**
 * The everyday Australian document: centred title, hairline rules, no colour blocks,
 * business and payment details gathered at the foot. Reads as bookkeeping rather than
 * marketing, which suits trades billing other businesses.
 */
export function buildLedger(ctx: Ctx): string {
  const { d, s, accent, isInvoice, isPaid } = ctx;

  const rows = ctx.rows.map(r => `
    <tr>
      <td class="l-desc">${esc(r.description)}</td>
      <td class="l-qty">${esc(r.qtyLabel)}</td>
      <td class="l-unit">${r.unitLabel}</td>
      <td class="l-amt">${r.totalLabel}</td>
    </tr>`).join('');

  const footCell = (label: string, value?: string) => value
    ? `<div class="fcell"><div class="flabel">${label}</div><div class="fvalue">${esc(value)}</div></div>` : '';

  const body = `
  ${paidStamp(ctx)}

  <div class="head">
    <div>${logoTag(ctx, 46)}</div>
    <div class="headmeta">
      <div>Issue date: <strong>${ctx.issued}</strong></div>
      ${ctx.dateValue ? `<div>${ctx.dateLabel}: <strong>${ctx.dateValue}</strong></div>` : ''}
    </div>
  </div>

  <div class="to">
    <div class="tolabel">${isInvoice ? 'Bill to' : 'Prepared for'}</div>
    <div class="toname">${d.customerName ? esc(d.customerName) : '—'}</div>
    ${d.customerAddress ? `<div class="toline">${esc(d.customerAddress)}</div>` : ''}
    ${d.customerPhone   ? `<div class="toline">${esc(d.customerPhone)}</div>` : ''}
    ${d.customerEmail   ? `<div class="toline">${esc(d.customerEmail)}</div>` : ''}
  </div>

  <h1 class="title">${isInvoice ? 'Tax Invoice' : 'Price Quote'} # ${esc(ctx.docNumber)}</h1>

  <div class="job">
    <div class="jobtitle">${esc(d.jobTitle)}</div>
    ${d.summary ? `<div class="jobtext">${escMultiline(d.summary)}</div>` : ''}
    ${d.customMessage ? `<div class="jobtext">${escMultiline(d.customMessage)}</div>` : ''}
  </div>

  <table class="items nb">
    <thead>
      <tr>
        <th class="l-desc">Description</th>
        <th class="l-qty">Qty</th>
        <th class="l-unit">Unit price</th>
        <th class="l-amt">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td class="l-desc empty" colspan="4">No items</td></tr>`}</tbody>
  </table>

  <div class="words">${words(d.totalAmount).toUpperCase()}</div>

  <div class="totalsWrap nb">
    <table class="totals">
      ${ctx.showSubtotal ? `<tr><td>Subtotal:</td><td>$${fmt(d.subtotal)}</td></tr>` : ''}
      ${ctx.showGst ? `<tr><td>GST (10%):</td><td>$${fmt(d.gstAmount!)}</td></tr>` : ''}
      <tr class="grand"><td>${isInvoice ? (isPaid ? 'Paid:' : 'Total due:') : 'Total:'}</td><td>$${fmt(d.totalAmount)}</td></tr>
    </table>
  </div>

  ${d.notes ? `<div class="notes nb"><div class="notelabel">Notes &amp; terms</div>${escMultiline(d.notes)}</div>` : ''}

  ${acceptanceBlock(ctx, { line: '#bbb', label: '#888' })}

  <div class="footer nb">
    <div class="fcol">
      <div class="fbiz">${ctx.biz || '—'}</div>
      ${ctx.abn ? `<div class="fvalue">ABN: ${ctx.abn}</div>` : ''}
      ${ctx.addr ? `<div class="fvalue">${ctx.addr}</div>` : ''}
    </div>
    <div class="fcol">
      ${ctx.phone ? `<div class="fvalue">Phone: ${ctx.phone}</div>` : ''}
      ${ctx.email ? `<div class="fvalue">${ctx.email}</div>` : ''}
    </div>
    ${isInvoice && ctx.hasBank ? `
    <div class="fcol">
      ${footCell('Bank', s.bankName)}
      ${footCell('Account name', s.accountName)}
      ${footCell('BSB', s.bsb)}
      ${footCell('Account number', s.accountNumber)}
    </div>` : ''}
  </div>
  ${isInvoice && s.paymentTermsDays ? `<div class="terms">Payment due within ${s.paymentTermsDays} days of the issue date.</div>` : ''}
  `;

  const css = `
  .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12mm; }
  .headmeta { text-align:right; font-size:9pt; color:#444; line-height:1.8; }
  .to { margin-bottom:10mm; }
  .tolabel { font-size:9pt; color:#666; margin-bottom:1.5mm; }
  .toname { font-size:11pt; font-weight:800; }
  .toline { font-size:9pt; color:#555; margin-top:0.5mm; }
  .title { text-align:center; font-size:19pt; font-weight:800; letter-spacing:-0.3px; margin-bottom:9mm; }
  .job { margin-bottom:7mm; }
  .jobtitle { font-size:11pt; font-weight:800; }
  .jobtext { font-size:9.5pt; color:#555; line-height:1.7; margin-top:1.5mm; }
  .items th { text-align:left; font-size:9pt; font-weight:800; color:#141310;
              border-bottom:1.2px solid #141310; padding:0 2.5mm 2mm 0; }
  .items td { font-size:9.5pt; padding:2.8mm 2.5mm 2.8mm 0; border-bottom:1px solid #ebebeb;
              vertical-align:top; }
  .l-desc { width:52%; }
  .l-qty  { width:12%; text-align:right; }
  .l-unit { width:18%; text-align:right; white-space:nowrap; }
  .l-amt  { width:18%; text-align:right; white-space:nowrap; }
  .items th.l-qty, .items th.l-unit, .items th.l-amt { text-align:right; }
  .empty { color:#aaa; font-style:italic; }
  .words { font-size:9pt; color:#bbb; letter-spacing:0.4px; margin-top:5mm; }
  .totalsWrap { display:flex; justify-content:flex-end; margin-top:7mm; }
  .totals { width:auto; }
  .totals td { font-size:9.5pt; padding:1.4mm 0 1.4mm 9mm; text-align:right; white-space:nowrap; }
  .totals td:first-child { color:#666; padding-left:0; text-align:left; }
  .grand td { font-size:12pt; font-weight:900; color:${isPaid ? '#2a9d4c' : accent}; padding-top:2.5mm; }
  .grand td:first-child { color:#141310; }
  .notes { margin-top:9mm; font-size:9pt; color:#555; line-height:1.7; }
  .notelabel { font-size:8pt; font-weight:800; letter-spacing:1.4px; text-transform:uppercase;
               color:#999; margin-bottom:1.5mm; }
  .footer { display:flex; gap:10mm; margin-top:12mm; padding-top:4mm; border-top:1px solid #ddd; }
  .fcol { flex:1; }
  .fbiz { font-size:9.5pt; font-weight:800; margin-bottom:1mm; }
  .flabel { font-size:7.5pt; color:#999; }
  .fvalue { font-size:8.5pt; color:#555; margin-top:0.4mm; }
  .fcell { margin-bottom:1.2mm; }
  .terms { margin-top:3mm; font-size:8pt; color:#888; }
  `;

  return page({ ctx, css, body, padding: '16mm 16mm 14mm' });
}
