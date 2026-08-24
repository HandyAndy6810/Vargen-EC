import { useMemo } from 'react';
import { Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { makeInvoiceStyles } from '@/lib/invoice-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

const STEPS = ['Customer', 'Job', 'Items', 'Review'] as const;

export default function CustomerStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeInvoiceStyles(c), [c]);
  const d = useInvoiceDraft();

  return (
    <QuoteStepScaffold
      flowLabel="New invoice"
      steps={STEPS}
      stepIndex={0}
      title="Who's it for?"
      footerLabel="Next"
      onNext={() => router.push('/invoices/create/job')}
    >
      <Text style={s.sectionEyebrow}>Customer</Text>
      <TextInput
        style={s.input}
        placeholder="Customer name (optional)"
        placeholderTextColor={c.muted}
        value={d.customerName}
        onChangeText={d.setCustomerName}
        autoFocus
        returnKeyType="next"
      />
      <Text style={[s.typeHint, { marginTop: 12 }]}>
        A standalone invoice doesn't have to be linked to a saved customer — the name just prints on the invoice.
      </Text>
    </QuoteStepScaffold>
  );
}
