import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

/**
 * Entry to the invoice flow — a redirect, not a screen. The chooser that used to
 * live here ("build from a quote" or "build manually") has moved onto Describe as a
 * button, so there's no longer a door to open before the real first screen.
 *
 *   editing, or arriving pointed at a quote or a finished job → Review, populated
 *   everything else                                           → Describe
 */
export default function InvoiceCreateEntry() {
  const { colors: c } = useTheme();
  const { isEditing, sourceQuoteId, fromQuote } = useInvoiceDraft();
  const params = useGlobalSearchParams<Record<string, string>>();

  useEffect(() => {
    // The query string has to travel with the redirect. Dropping it is what made
    // every "convert", "invoice the balance" and "edit invoice" open blank: on the
    // first frame the router had not resolved the params yet, so this redirected to
    // Describe AND threw the id away, leaving nothing for the draft to latch onto.
    // Callers now name their destination directly, so this is only a safety net —
    // but a redirect that loses its own arguments is a trap either way.
    const qs = ['quoteId', 'jobId', 'invoiceId', 'type']
      .filter(k => params[k])
      .map(k => `${k}=${encodeURIComponent(String(params[k]))}`)
      .join('&');
    const prefilled = isEditing || fromQuote || sourceQuoteId > 0 || !!qs;
    const to = prefilled ? '/invoices/create/review' : '/invoices/create/describe';
    router.replace((qs ? `${to}?${qs}` : to) as any);
  }, [isEditing, fromQuote, sourceQuoteId, params]);

  // Paint the page colour so the redirect doesn't flash white.
  return <View style={{ flex: 1, backgroundColor: c.paper }} />;
}
