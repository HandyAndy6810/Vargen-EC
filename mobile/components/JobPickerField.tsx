import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Briefcase, Check, ChevronRight } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useJobs } from '@/hooks/use-jobs';
import { BottomSheetModal } from '@/components/BottomSheetModal';

/**
 * Pick which job a receipt belongs to. The job decides whose profit the receipt
 * counts against, so "no job" is always offered and is the honest default.
 */
export function JobPickerField({
  jobId,
  onChange,
}: {
  jobId: number | null;
  onChange: (jobId: number | null) => void;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: jobs } = useJobs();
  const [open, setOpen] = useState(false);

  // Most recent first: a receipt is nearly always for this week's work.
  const sorted = useMemo(() => {
    const list = ((jobs as any[]) || []).filter((j) => j.status !== 'cancelled');
    return list.sort((a, b) => {
      const ta = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const tb = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return tb - ta;
    });
  }, [jobs]);

  const selected = sorted.find((j) => j.id === jobId) ?? ((jobs as any[]) || []).find((j) => j.id === jobId);

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={s.field}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Choose job"
      >
        <View style={s.icon}><Briefcase size={16} color={c.ink} strokeWidth={2.1} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.label}>Job</Text>
          <Text style={[s.value, !selected && { color: c.muted }]} numberOfLines={1}>
            {selected ? selected.title : 'Not linked to a job'}
          </Text>
        </View>
        <ChevronRight size={14} color={c.muted} strokeWidth={2} />
      </TouchableOpacity>

      <BottomSheetModal visible={open} onClose={() => setOpen(false)} avoidKeyboard={false}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Which job was this for?</Text>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <Row label="No job" sub="Keep it as a general business expense" active={jobId === null} onPress={() => pick(null)} s={s} c={c} />
            {sorted.map((j) => (
              <Row
                key={j.id}
                label={j.title}
                sub={[
                  j.scheduledDate ? format(new Date(j.scheduledDate), 'd MMM') : null,
                  j.status === 'completed' ? 'Completed' : null,
                ].filter(Boolean).join(' · ') || undefined}
                active={j.id === jobId}
                onPress={() => pick(j.id)}
                s={s}
                c={c}
                bordered
              />
            ))}
            {sorted.length === 0 ? <Text style={s.empty}>No jobs yet.</Text> : null}
          </ScrollView>
        </View>
      </BottomSheetModal>
    </>
  );
}

function Row({ label, sub, active, onPress, s, c, bordered }: {
  label: string; sub?: string; active: boolean; onPress: () => void;
  s: ReturnType<typeof makeStyles>; c: Colors; bordered?: boolean;
}) {
  return (
    <TouchableOpacity style={[s.row, bordered && s.rowBorder]} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowText} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {active ? <Check size={16} color={c.orange} strokeWidth={2.5} /> : null}
    </TouchableOpacity>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.paperDeep, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink },
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 34, paddingTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineMid, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.muted, textAlign: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 8, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.lineSoft },
  rowText: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink },
  rowSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
  empty: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, textAlign: 'center', paddingVertical: 16 },
});
