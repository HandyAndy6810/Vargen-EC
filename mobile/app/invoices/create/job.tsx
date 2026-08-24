import { useMemo } from 'react';
import { View, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { makeInvoiceStyles } from '@/lib/invoice-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

const STEPS = ['Customer', 'Job', 'Items', 'Review'] as const;

export default function JobStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeInvoiceStyles(c), [c]);
  const d = useInvoiceDraft();

  return (
    <QuoteStepScaffold
      flowLabel="New invoice"
      steps={STEPS}
      stepIndex={1}
      title="What's the job?"
      footerLabel="Next"
      onNext={() => router.push('/invoices/create/items')}
    >
      <Text style={s.sectionEyebrow}>Job title</Text>
      <TextInput
        style={s.input}
        placeholder="e.g. Bathroom renovation — supply & install"
        placeholderTextColor={c.muted}
        value={d.jobTitle}
        onChangeText={d.setJobTitle}
        onBlur={d.onJobTitleBlur}
        autoFocus
        returnKeyType="next"
      />

      <Text style={s.sectionEyebrow}>Labour</Text>
      <View style={s.card}>
        <View style={s.labourRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.labourLabel}>Rate</Text>
            <View style={s.labourInputWrap}>
              <Text style={s.labourUnit}>$/hr</Text>
              <TextInput style={s.labourInput} value={d.labourRate} onChangeText={d.setLabourRate} placeholder="0" placeholderTextColor={c.muted} keyboardType="decimal-pad" selectTextOnFocus />
            </View>
          </View>
          <View style={s.labourDivider} />
          <View style={{ flex: 1 }}>
            <Text style={s.labourLabel}>Hours</Text>
            <View style={s.labourInputWrap}>
              <Text style={s.labourUnit}>hrs</Text>
              <TextInput style={s.labourInput} value={d.labourHours} onChangeText={d.setLabourHours} placeholder="0" placeholderTextColor={c.muted} keyboardType="decimal-pad" selectTextOnFocus />
            </View>
          </View>
          <View style={s.labourDivider} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.labourLabel}>Total</Text>
            <Text style={s.labourTotal}>${d.labourTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionEyebrow}>Notes (optional)</Text>
      <TextInput
        style={[s.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }]}
        placeholder="Payment terms, job details, etc."
        placeholderTextColor={c.muted}
        value={d.notes}
        onChangeText={d.setNotes}
        multiline
      />
    </QuoteStepScaffold>
  );
}
