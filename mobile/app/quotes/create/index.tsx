import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useQuoteDraft } from '@/hooks/use-quote-draft';

/**
 * Entry to the quote flow. There is no chooser door any more — the job description
 * IS the entry point, so this just routes:
 *   editing an existing quote → straight to Review
 *   everything else           → Describe
 * Every "new quote" button in the app lands here, so the flow is the same wherever
 * it was started from.
 */
export default function QuoteCreateEntry() {
  const { colors: c } = useTheme();
  const { isEditing } = useQuoteDraft();

  useEffect(() => {
    router.replace(isEditing ? '/quotes/create/review' : '/quotes/create/describe');
  }, [isEditing]);

  // Nothing renders here — it's a redirect. Painting the page colour avoids a flash.
  return <View style={{ flex: 1, backgroundColor: c.paper }} />;
}
