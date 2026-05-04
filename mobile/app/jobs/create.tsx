import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useCreateJob } from '@/hooks/use-jobs';
import { useCustomers } from '@/hooks/use-customers';
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

const TIMES = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const DURATIONS = [
  { label: '30 min', val: 0.5 },
  { label: '1 hr',   val: 1 },
  { label: '1.5 hr', val: 1.5 },
  { label: '2 hr',   val: 2 },
  { label: '3 hr',   val: 3 },
  { label: '4 hr',   val: 4 },
];

export default function JobCreateScreen() {
  const { mutate: createJob, isPending } = useCreateJob();
  const { data: customers } = useCustomers() as any;

  const [title, setTitle]         = useState('');
  const [address, setAddress]     = useState('');
  const [notes, setNotes]         = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [timeSlot, setTimeSlot]   = useState('9:00');
  const [duration, setDuration]   = useState(1);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const dayOptions = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i)),
    []
  );

  const selectedDay = dayOptions[dayOffset];
  const selectedCustomer = (customers as any[])?.find((c: any) => c.id === customerId);

  const filteredCustomers = useMemo(() => {
    const list = (customers as any[]) || [];
    if (!custSearch.trim()) return list.slice(0, 6);
    return list.filter((c: any) =>
      c.name?.toLowerCase().includes(custSearch.toLowerCase())
    ).slice(0, 6);
  }, [customers, custSearch]);

  const buildScheduledDate = () => {
    const [h, m] = timeSlot.split(':').map(Number);
    return setMinutes(setHours(selectedDay, h), m);
  };

  const handleSave = () => {
    if (!title.trim()) { setError('Job title is required'); return; }
    setError(null);
    const scheduledDate = buildScheduledDate();
    createJob(
      {
        title: title.trim(),
        address: address.trim() || null,
        notes: notes.trim() || null,
        customerId: customerId || null,
        scheduledDate,
        estimatedDuration: Math.round(duration * 60),
        status: 'scheduled',
      } as any,
      { onSuccess: () => router.back() }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>New job</Text>
            <Text style={s.title}>Schedule a job</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, gap: 14, paddingTop: 8 }}>

            {/* Title */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Job title *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Replace hot water system"
                placeholderTextColor={MUTED}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />
            </View>

            {/* Customer */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Customer</Text>
              {selectedCustomer ? (
                <TouchableOpacity
                  style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  activeOpacity={0.7}
                  onPress={() => { setCustomerId(null); setCustSearch(''); setShowCustList(true); }}
                >
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: INK }}>{selectedCustomer.name}</Text>
                  <Text style={{ fontFamily: 'Manrope_500Medium', fontSize: 12, color: MUTED }}>Change</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={s.input}
                    placeholder="Search customers…"
                    placeholderTextColor={MUTED}
                    value={custSearch}
                    onChangeText={v => { setCustSearch(v); setShowCustList(true); }}
                    onFocus={() => setShowCustList(true)}
                  />
                  {showCustList && filteredCustomers.length > 0 && (
                    <View style={s.custDropdown}>
                      {filteredCustomers.map((c: any) => (
                        <TouchableOpacity
                          key={c.id}
                          style={s.custRow}
                          activeOpacity={0.7}
                          onPress={() => { setCustomerId(c.id); setAddress(c.address || ''); setShowCustList(false); setCustSearch(''); }}
                        >
                          <View style={s.custAvatar}>
                            <Text style={s.custAvatarText}>{c.name?.slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.custName}>{c.name}</Text>
                            {c.phone && <Text style={s.custSub}>{c.phone}</Text>}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Address */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Address</Text>
              <TextInput
                style={s.input}
                placeholder="Job site address"
                placeholderTextColor={MUTED}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Day picker */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {dayOptions.map((d, i) => {
                  const active = dayOffset === i;
                  return (
                    <TouchableOpacity key={i} onPress={() => setDayOffset(i)} activeOpacity={0.7}
                      style={[s.dayChip, active && s.dayChipActive]}>
                      <Text style={[s.dayChipTop, active && { color: 'rgba(255,255,255,0.7)' }]}>
                        {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE')}
                      </Text>
                      <Text style={[s.dayChipNum, active && { color: '#fff' }]}>{format(d, 'd')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time picker */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Start time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {TIMES.map(t => {
                  const active = timeSlot === t;
                  const [h] = t.split(':').map(Number);
                  const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
                  return (
                    <TouchableOpacity key={t} onPress={() => setTimeSlot(t)} activeOpacity={0.7}
                      style={[s.timeChip, active && s.timeChipActive]}>
                      <Text style={[s.timeChipText, active && { color: '#fff' }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Duration */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Estimated duration</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DURATIONS.map(d => {
                  const active = duration === d.val;
                  return (
                    <TouchableOpacity key={d.val} onPress={() => setDuration(d.val)} activeOpacity={0.7}
                      style={[s.durationChip, active && s.durationChipActive]}>
                      <Text style={[s.durationChipText, active && { color: '#fff' }]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Notes</Text>
              <TextInput
                style={[s.input, { height: 88, textAlignVertical: 'top', paddingTop: 14 }]}
                placeholder="Gate codes, special instructions…"
                placeholderTextColor={MUTED}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {error && (
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#d23b3b', textAlign: 'center' }}>{error}</Text>
            )}
          </View>
        </ScrollView>

        {/* Save bar */}
        <View style={s.saveBar}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={s.saveSummary}>
              {format(selectedDay, 'EEE d MMM')} · {timeSlot.split(':').map((v, i) => {
                if (i === 0) { const h = Number(v); return h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`; }
                return '';
              }).join('')} · {DURATIONS.find(d => d.val === duration)?.label}
            </Text>
          </View>
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.85} onPress={handleSave} disabled={isPending}>
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Schedule job</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED, letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 18, fontFamily: 'Manrope_800ExtraBold',
    color: INK, letterSpacing: -0.4, marginTop: 2,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: INK, borderWidth: 1, borderColor: LINE_MID,
  },
  custDropdown: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: LINE_MID, overflow: 'hidden', marginTop: -4,
  },
  custRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: LINE_SOFT,
  },
  custAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: INK, alignItems: 'center', justifyContent: 'center',
  },
  custAvatarText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: ORANGE },
  custName: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: INK },
  custSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 1 },
  dayChip: {
    width: 56, height: 64, borderRadius: 16,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_MID,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dayChipActive: { backgroundColor: INK, borderColor: INK },
  dayChipTop: {
    fontSize: 9, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  dayChipNum: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: INK, lineHeight: 24 },
  timeChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_MID,
  },
  timeChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  timeChipText: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: INK },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_MID,
  },
  durationChipActive: { backgroundColor: INK, borderColor: INK },
  durationChipText: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: INK },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: PAPER, borderTopWidth: 1, borderTopColor: LINE_MID,
    paddingTop: 14, paddingHorizontal: 20, paddingBottom: 34,
  },
  saveSummary: {
    fontSize: 12, fontFamily: 'Manrope_600SemiBold',
    color: MUTED, textAlign: 'center', marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: ORANGE, borderRadius: 18, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
