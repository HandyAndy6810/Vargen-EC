/**
 * What the customer receives when a quote is sent: a short message with the total
 * and the link to their quote (the portal, where they accept or decline). Built
 * here, pure, so every channel says the same thing and it can be tested.
 *
 * The link is always the server's portalUrl. A message is never built without one:
 * "please find your quote attached" with nothing attached is how quotes used to go
 * out.
 */

export type QuoteMessageInput = {
  customerName?: string | null;
  businessName?: string | null;
  jobTitle?: string | null;
  total: number;
  includeGST: boolean;
  portalUrl: string;
};

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function quoteMessage(q: QuoteMessageInput): string {
  const first = (q.customerName || '').trim().split(/\s+/)[0] || 'there';
  const what = q.jobTitle?.trim() ? `your quote for ${q.jobTitle.trim()}` : 'your quote';
  const lines = [
    `Hi ${first},`,
    '',
    `Here's ${what}: ${money(q.total)}${q.includeGST ? ' inc. GST' : ''}.`,
    `View and accept it here: ${q.portalUrl}`,
    '',
    `Thanks${q.businessName?.trim() ? `,\n${q.businessName.trim()}` : ''}`,
  ];
  return lines.join('\n');
}

/** A mailto: link with subject and body, fully encoded. */
export function emailUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * An sms: link with the message filled in. iOS separates the body with "&", Android
 * with "?" (the documented forms for each); the body is fully encoded either way.
 */
export function smsUrl(phone: string, body: string, platform: 'ios' | 'android' | string): string {
  const sep = platform === 'ios' ? '&' : '?';
  const number = phone.replace(/[^\d+]/g, '');
  return `sms:${number}${sep}body=${encodeURIComponent(body)}`;
}

export function quoteEmailUrl(email: string, q: QuoteMessageInput): string {
  const subject = q.businessName?.trim() ? `Your quote from ${q.businessName.trim()}` : 'Your quote';
  return emailUrl(email, subject, quoteMessage(q));
}

export function quoteSmsUrl(phone: string, q: QuoteMessageInput, platform: 'ios' | 'android' | string): string {
  return smsUrl(phone, quoteMessage(q), platform);
}

export type InvoiceMessageInput = {
  customerName?: string | null;
  businessName?: string | null;
  invoiceNumber?: string | null;
  total: number;
  includeGST: boolean;
  /** Already formatted, e.g. "17 Nov 2026". */
  dueDate?: string | null;
  invoiceUrl: string;
};

/** An invoice's message: the amount, when it's due, and the link to view and pay it. */
export function invoiceMessage(i: InvoiceMessageInput): string {
  const first = (i.customerName || '').trim().split(/\s+/)[0] || 'there';
  const which = i.invoiceNumber?.trim() ? `invoice ${i.invoiceNumber.trim()}` : 'your invoice';
  return [
    `Hi ${first},`,
    '',
    `Here's ${which}: ${money(i.total)}${i.includeGST ? ' inc. GST' : ''}${i.dueDate ? `, due ${i.dueDate}` : ''}.`,
    `View and pay it here: ${i.invoiceUrl}`,
    '',
    `Thanks${i.businessName?.trim() ? `,\n${i.businessName.trim()}` : ''}`,
  ].join('\n');
}

export function invoiceEmailUrl(email: string, i: InvoiceMessageInput): string {
  const subject = `${i.invoiceNumber?.trim() ? `Invoice ${i.invoiceNumber.trim()}` : 'Your invoice'}${i.businessName?.trim() ? ` from ${i.businessName.trim()}` : ''}`;
  return emailUrl(email, subject, invoiceMessage(i));
}

/**
 * Chasing up (s8, Calendar → Outreach): a short, friendly nudge with the same
 * link, so the customer can act on it from the message itself.
 */
export type FollowUpInput =
  | { kind: 'quote'; customerName?: string | null; businessName?: string | null; jobTitle?: string | null; url: string }
  | { kind: 'invoice'; customerName?: string | null; businessName?: string | null; invoiceNumber?: string | null; outstanding: number; dueDate?: string | null; url: string };

export function followUpMessage(f: FollowUpInput): string {
  const first = (f.customerName || '').trim().split(/\s+/)[0] || 'there';
  const sign = `Thanks${f.businessName?.trim() ? `,\n${f.businessName.trim()}` : ''}`;
  if (f.kind === 'quote') {
    const what = f.jobTitle?.trim() ? `the quote for ${f.jobTitle.trim()}` : 'the quote I sent';
    return [
      `Hi ${first},`,
      '',
      `Just following up on ${what}. Happy to answer any questions or adjust anything.`,
      `You can view and accept it here: ${f.url}`,
      '',
      sign,
    ].join('\n');
  }
  const which = f.invoiceNumber?.trim() ? `invoice ${f.invoiceNumber.trim()}` : 'your invoice';
  return [
    `Hi ${first},`,
    '',
    `A quick reminder that ${which} has ${money(f.outstanding)} still owing${f.dueDate ? ` (due ${f.dueDate})` : ''}. If it's already on its way, please ignore this.`,
    `You can view and pay it here: ${f.url}`,
    '',
    sign,
  ].join('\n');
}

export function followUpSubject(f: FollowUpInput): string {
  const from = f.businessName?.trim() ? ` from ${f.businessName.trim()}` : '';
  if (f.kind === 'quote') return `Following up: your quote${from}`;
  return `Reminder: ${f.invoiceNumber?.trim() ? `invoice ${f.invoiceNumber.trim()}` : 'your invoice'}${from}`;
}
