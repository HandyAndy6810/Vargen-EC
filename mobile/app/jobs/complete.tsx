import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Sparkles, ChevronRight } from 'lucide-react-native';
import { useJob, useUpdateJob } from '@/hooks/use-jobs';
import { useQueryClient } from '@tanstack/react-query';
import { api, buildUrl } from '@shared/mobile-routes';
import { useState, useMemo } from 'react';


export default function JobCompleteScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id ? Number(id) : 0) as any;
  const { mutate: updateJob, isPending } = useUpdateJob();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'form' | 'done'>('form');
  const [hoursWorked, setHoursWorked] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const title = job?.title || 'Job';
  const estimatedMins = job?.estimatedDuration || 0;
  const estimatedHrs = estimatedMins / 60;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={c.orange} />
      </SafeAreaView>
    );
  }

  const handleFinish = () => {
    const hours = parseFloat(hoursWorked);
    if (hoursWorked && isNaN(hours)) {
      setError('Hours must be a number (e.g. 2.5)');
      return;
    }
    setError(null);

    const completionData = JSON.stringify({
      actualHours: hoursWorked ? hours : null,
      extraNotes: completionNotes.trim() || null,
      completedAt: new Date().toISOString(),
      estimatedHours: estimatedMins ? estimatedMins / 60 : null,
      quotedAmount: null,
    });

    updateJob(
      {
        id: Number(id),
        status: 'completed',
        completionData,
      } as any,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [api.jobs.get.path, Number(id)] });
          queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
          setStep('done');
        },
        onError: (err: any) => {
          const msg = err?.message || 'Could not complete job. Please try again.';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        },
      }
    );
  };

  if (step === 'form') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
              <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 20, paddingTop: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={s.formEyebrow}>Finishing up</Text>
            <Text style={s.formTitle}>{title}</Text>

            {estimatedMins > 0 && (
              <Text style={s.formSub}>
                Estimated {estimatedHrs % 1 === 0 ? estimatedHrs : estimatedHrs.toFixed(1)}h
              </Text>
            )}

            <View style={{ marginTop: 28, gap: 14 }}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Hours worked</Text>
                <TextInput
                  style={[s.input, error ? { borderColor: '#d23b3b', borderWidth: 1 } : null]}
                  placeholder="e.g. 2.5"
                  placeholderTextColor={c.muted}
                  value={hoursWorked}
                  onChangeText={v => { setHoursWorked(v); if (error) setError(null); }}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                {error ? <Text style={s.errorText}>{error}</Text> : null}
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Completion notes</Text>
                <TextInput
                  style={[s.input, { height: 100, textAlignVertical: 'top', paddingTop: 14 }]}
                  placeholder="What was done, any issues found…"
                  placeholderTextColor={c.muted}
                  value={completionNotes}
                  onChangeText={setCompletionNotes}
                  multiline
                />
              </View>
            </View>
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={s.finishBtn} activeOpacity={0.7} onPress={() => router.back()}>
              <Text style={s.finishBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.makeInvoiceBtn} activeOpacity={0.8} onPress={handleFinish} disabled={isPending}>
              {isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.makeInvoiceBtnText}>Mark complete ›</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const actualHours = hoursWorked ? parseFloat(hoursWorked) : null;
  const summaryRows = [
    actualHours != null ? { label: 'Hours worked', value: `${actualHours}h` } : null,
    estimatedMins > 0 ? { label: 'Estimated', value: `${estimatedHrs % 1 === 0 ? estimatedHrs : estimatedHrs.toFixed(1)}h` } : null,
    job?.address ? { label: 'Location', value: job.address } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={s.hero}>
          <View style={s.checkCircle}>
            <Check size={40} color={c.green} strokeWidth={2.5} />
          </View>
          <Text style={s.heroEyebrow}>Job complete</Text>
          <Text style={s.heroTitle}>
            {title}{'\n'}
            <Text style={{ color: c.orange }}>wrapped.</Text>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {summaryRows.length > 0 && (
            <View style={s.summaryCard}>
              {summaryRows.map((row, i) => (
                <View
                  key={row.label}
                  style={[s.summaryRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}
                >
                  <Text style={s.summaryLabel}>{row.label}</Text>
                  <Text style={s.summaryValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.sectionEyebrow}>Next step</Text>
          <TouchableOpacity
            style={s.invoiceNudge}
            activeOpacity={0.85}
            onPress={() => router.push(`/invoices/create?jobId=${id}` as any)}
          >
            <View style={s.nudgeIcon}>
              <Sparkles size={20} color="#fff" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nudgeEyebrow}>Suggested</Text>
              <Text style={s.nudgeTitle}>Generate invoice from this job</Text>
            </View>
            <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.finishBtn} activeOpacity={0.7} onPress={() => router.replace('/')}>
          <Text style={s.finishBtnText}>Finish</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.makeInvoiceBtn}
          activeOpacity={0.8}
          onPress={() => router.push(`/invoices/create?jobId=${id}` as any)}
        >
          <Text style={s.makeInvoiceBtnText}>Make invoice ›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  formEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase',
  },
  formTitle: {
    fontSize: 24, fontFamily: 'Manrope_800ExtraBold',
    color: c.ink, letterSpacing: -0.5, marginTop: 4,
  },
  formSub: {
    fontSize: 13, fontFamily: 'Manrope_500Medium',
    color: c.muted, marginTop: 4,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: c.ink, borderWidth: 1, borderColor: c.lineMid,
  },
  errorText: {
    fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#d23b3b', marginTop: 4,
  },
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  heroEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30, fontFamily: 'Manrope_800ExtraBold',
    color: c.ink, letterSpacing: -1, textAlign: 'center', marginTop: 4, lineHeight: 34,
  },
  summaryCard: {
    backgroundColor: c.card, borderRadius: 18, borderWidth: 1,
    borderColor: c.lineSoft, marginTop: 22, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  summaryLabel: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.muted },
  summaryValue: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  sectionEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 22, marginBottom: 8,
  },
  invoiceNudge: {
    borderRadius: 18, padding: 16, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 6,
  },
  nudgeIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  nudgeEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.85)', letterSpacing: 1.4, textTransform: 'uppercase',
  },
  nudgeTitle: {
    fontSize: 15, fontFamily: 'Manrope_800ExtraBold',
    color: '#fff', letterSpacing: -0.3, marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(247,244,238,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 30,
  },
  finishBtn: {
    flex: 1, height: 54, borderRadius: 18,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid,
    alignItems: 'center', justifyContent: 'center',
  },
  finishBtnText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  makeInvoiceBtn: {
    flex: 2, height: 54, borderRadius: 18, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 8,
  },
  makeInvoiceBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
