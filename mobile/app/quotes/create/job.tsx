import { useMemo } from 'react';
import { View, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/hooks/use-theme';
import { makeQuoteStyles } from '@/lib/quote-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useQuoteDraft } from '@/hooks/use-quote-draft';

export default function JobStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeQuoteStyles(c), [c]);
  const d = useQuoteDraft();

  return (
    <QuoteStepScaffold
      stepIndex={1}
      title="What's the job?"
      footerLabel="Next"
      onNext={() => router.push('/quotes/create/items')}
      nextDisabled={!d.jobTitle.trim()}
    >
      <Text style={[s.sectionEyebrow, { marginTop: 8 }]}>Details</Text>
      <View style={s.fieldGroup}>
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Job title</Text>
          <TextInput
            style={s.fieldInput}
            placeholder="e.g. Hot water swap"
            placeholderTextColor={c.muted}
            value={d.jobTitle}
            onChangeText={d.setJobTitle}
            returnKeyType="next"
            autoFocus
          />
        </View>
        <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start' }]}>
          <Text style={[s.fieldLabel, { paddingTop: 2 }]}>Description</Text>
          <TextInput
            style={[s.fieldInput, { flex: 1 }]}
            placeholder="What the job involves…"
            placeholderTextColor={c.muted}
            value={d.summary}
            onChangeText={d.setSummary}
            multiline
          />
        </View>
        <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
          <Text style={s.fieldLabel}>Date</Text>
          <TextInput
            style={s.fieldInput}
            placeholder={format(new Date(), "EEE d MMM · h:mm a")}
            placeholderTextColor={c.muted}
            value={d.schedDate}
            onChangeText={d.setSchedDate}
            returnKeyType="next"
          />
        </View>
        <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
          <Text style={s.fieldLabel}>Expires</Text>
          <TextInput
            style={s.fieldInput}
            placeholder="e.g. 30 Jun 2026"
            placeholderTextColor={c.muted}
            value={d.expiryDate}
            onChangeText={d.setExpiryDate}
            returnKeyType="next"
          />
        </View>
        <View style={[s.fieldRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start' }]}>
          <Text style={[s.fieldLabel, { paddingTop: 2 }]}>Notes</Text>
          <TextInput
            style={[s.fieldInput, { flex: 1 }]}
            placeholder="Visible to customer…"
            placeholderTextColor={c.muted}
            value={d.notes}
            onChangeText={d.setNotes}
            multiline
          />
        </View>
      </View>
    </QuoteStepScaffold>
  );
}
