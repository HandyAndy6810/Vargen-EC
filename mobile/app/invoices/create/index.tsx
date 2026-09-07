import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
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

  useEffect(() => {
    const prefilled = isEditing || fromQuote || sourceQuoteId > 0;
    router.replace(prefilled ? '/invoices/create/review' : '/invoices/create/describe');
  }, [isEditing, fromQuote, sourceQuoteId]);

  // Paint the page colour so the redirect doesn't flash white.
  return <View style={{ flex: 1, backgroundColor: c.paper }} />;
}
