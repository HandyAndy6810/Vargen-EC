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

export function quoteEmailUrl(email: string, q: QuoteMessageInput): string {
  const subject = q.businessName?.trim() ? `Your quote from ${q.businessName.trim()}` : 'Your quote';
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(quoteMessage(q))}`;
}

/**
 * An sms: link with the message filled in. iOS separates the body with "&", Android
 * with "?" (the documented forms for each); the body is fully encoded either way.
 */
export function quoteSmsUrl(phone: string, q: QuoteMessageInput, platform: 'ios' | 'android' | string): string {
  const sep = platform === 'ios' ? '&' : '?';
  const number = phone.replace(/[^\d+]/g, '');
  return `sms:${number}${sep}body=${encodeURIComponent(quoteMessage(q))}`;
}
