/**
 * Which ways a Chase up can go (s8), in order: Email and SMS when the customer
 * has an address or number, and Share link always (WhatsApp, Messenger, copy).
 * Their preferred way comes first: "call" prefers SMS (a text they can reply to
 * by calling back). Pure, tested in follow-up-channels.test.ts.
 */
export type ChaseChannel = 'email' | 'sms' | 'share';

export function chaseChannels(c: { email?: string | null; phone?: string | null; preferredContact?: string | null } | null | undefined): ChaseChannel[] {
  const list: ChaseChannel[] = [];
  if (c?.email?.trim()) list.push('email');
  if (c?.phone?.trim()) list.push('sms');
  const prefer: ChaseChannel | null =
    c?.preferredContact === 'email' ? 'email'
      : c?.preferredContact === 'sms' || c?.preferredContact === 'call' ? 'sms'
      : null;
  if (prefer && list.includes(prefer)) list.sort((a, b) => Number(b === prefer) - Number(a === prefer));
  list.push('share');
  return list;
}
