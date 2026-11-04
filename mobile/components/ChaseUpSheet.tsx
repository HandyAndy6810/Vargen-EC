import { useRef } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Mail, MessageSquare, Share2, PenLine } from 'lucide-react-native';
import { ActionSheetModal, type SheetAction } from '@/components/ActionSheetModal';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { followUpMessage, followUpSubject, emailUrl, smsUrl, type FollowUpInput } from '@shared/quote-message';
import { chaseChannels } from '@shared/follow-up-channels';
import { parseQuoteContent } from '@shared/mobile-types';

/** One row from GET /api/follow-ups/due, as the server now sends it (s8). */
export type FollowUpItem = {
  kind: 'quote' | 'invoice';
  quote?: any;
  invoice?: any;
  dueIndex?: number;
  outstanding?: number;
  link?: string | null;
  customer?: { id: number | null; name: string | null; phone: string | null; email: string | null; preferredContact: string | null };
};

const keyOf = (item: FollowUpItem) =>
  item.kind === 'quote' ? `q${item.quote?.id}:${item.dueIndex}` : `i${item.invoice?.id}`;

/**
 * Calendar → Outreach → Chase up (s8): a send menu, like sending a quote.
 * Email, SMS (their preferred way first) and Share link, each with a follow-up
 * message carrying the quote or invoice link; or write your own in Compose.
 *
 * The phone sends, never the server. Afterwards it asks "Did you send it?" once;
 * "Yes, sent" adds it to the customer's contact log and ticks off the follow-up.
 * An item already confirmed this session can't be confirmed again, so nothing is
 * logged or ticked twice.
 */
export function ChaseUpSheet({ item, onClose }: { item: FollowUpItem | null; onClose: () => void }) {
  const { colors: c } = useTheme();
  const { data: settings } = useSettings() as any;
  const done = useRef(new Set<string>());

  if (!item) return <ActionSheetModal visible={false} actions={[]} onClose={onClose} />;

  const cust = item.customer;
  const name = cust?.name || (item.kind === 'quote' ? parseQuoteContent(item.quote?.content).customerName : item.invoice?.customerName) || 'the customer';
  const first = String(name).split(' ')[0];
  const businessName = settings?.businessName || null;

  const input: FollowUpInput | null = !item.link ? null
    : item.kind === 'quote'
      ? { kind: 'quote', customerName: name, businessName, jobTitle: parseQuoteContent(item.quote?.content).jobTitle || item.quote?.jobTitle, url: item.link }
      : {
          kind: 'invoice', customerName: name, businessName, invoiceNumber: item.invoice?.invoiceNumber,
          outstanding: Number(item.outstanding) || 0,
          dueDate: item.invoice?.dueDate ? format(new Date(item.invoice.dueDate), 'd MMM yyyy') : null,
          url: item.link,
        };
  const body = input ? followUpMessage(input) : '';

  const record = async (channel: 'sms' | 'email' | 'note') => {
    const key = keyOf(item);
    if (done.current.has(key)) return;
    done.current.add(key);
    if (cust?.id) {
      try {
        await apiRequest('POST', `/api/customers/${cust.id}/messages`, {
          body, channel, direction: 'out', quoteId: item.kind === 'quote' ? item.quote?.id : undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/customers', cust.id, 'messages'] });
      } catch { /* it went; a failed log entry shouldn't undo the follow-up */ }
    }
    if (item.kind === 'quote' && item.quote?.id != null && item.dueIndex != null) {
      try { await apiRequest('POST', `/api/follow-ups/${item.quote.id}/mark-sent`, { dayIndex: item.dueIndex }); } catch { /* retried next time it shows */ }
    }
    queryClient.invalidateQueries({ queryKey: ['/api/follow-ups/due'] });
  };

  // Opening Messages or Mail doesn't mean it went, so ask, once.
  const askSent = (channel: 'sms' | 'email' | 'note') => {
    if (done.current.has(keyOf(item))) return;
    showConfirm({
      title: 'Did you send it?',
      message: item.kind === 'quote'
        ? `Mark this follow-up as done${cust?.id ? ` and add it to ${first}'s contact log` : ''}.`
        : cust?.id ? `Add it to ${first}'s contact log.` : 'Note it as chased.',
      confirmLabel: 'Yes, sent',
      cancelLabel: 'Not yet',
      onConfirm: () => record(channel),
    });
  };

  const noLink = () => showAlert('No link yet', 'Pull down to refresh Outreach, then try again.');

  const icon = (I: any) => <I size={18} color={c.ink} strokeWidth={2.1} />;
  const actions: SheetAction[] = chaseChannels(cust).map((ch): SheetAction => {
    if (ch === 'email') return {
      label: `Email ${first}`,
      icon: icon(Mail),
      onPress: () => {
        if (!input) return noLink();
        Linking.openURL(emailUrl(cust!.email!, followUpSubject(input), body))
          .then(() => askSent('email'))
          .catch(() => showAlert('Cannot open Mail', 'No mail app found.'));
      },
    };
    if (ch === 'sms') return {
      label: `Text ${first}`,
      icon: icon(MessageSquare),
      onPress: () => {
        if (!input) return noLink();
        Linking.openURL(smsUrl(cust!.phone!, body, Platform.OS))
          .then(() => askSent('sms'))
          .catch(() => showAlert('Cannot open Messages', 'Make sure a SIM is installed.'));
      },
    };
    return {
      label: 'Share link',
      icon: icon(Share2),
      onPress: () => {
        if (!input) return noLink();
        Share.share({ message: body })
          .then((r) => { if (r.action === Share.sharedAction) askSent('note'); })
          .catch(() => {});
      },
    };
  });
  actions.push({
    label: 'Write my own message',
    icon: icon(PenLine),
    onPress: () => router.push(
      `/customers/compose?customerId=${cust?.id ?? ''}&customerName=${encodeURIComponent(name)}`
      + `&customerPhone=${encodeURIComponent(cust?.phone ?? '')}&customerEmail=${encodeURIComponent(cust?.email ?? '')}`
      + (item.kind === 'quote'
        ? `&context=quote_followup&quoteId=${item.quote?.id ?? ''}&dayIndex=${item.dueIndex ?? ''}`
        : `&context=invoice_overdue&invoiceId=${item.invoice?.id ?? ''}&invoiceNumber=${encodeURIComponent(item.invoice?.invoiceNumber || '')}`
          + `&amount=${encodeURIComponent(`$${(Number(item.outstanding) || 0).toFixed(2)}`)}`
          + `&due=${encodeURIComponent(item.invoice?.dueDate ? format(new Date(item.invoice.dueDate), 'd MMM') : '')}`) as any,
    ),
  });

  return (
    <ActionSheetModal
      visible
      title={item.kind === 'quote' ? `Chase up ${first}'s quote` : `Chase up ${first}'s invoice`}
      actions={actions}
      onClose={onClose}
    />
  );
}
