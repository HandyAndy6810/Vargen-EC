import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft, Save } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type DayConfig = { on: boolean; start: string; end: string };
type Hours = Record<DayKey, DayConfig>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const DEFAULT_HOURS: Hours = {
  mon: { on: true,  start: '07:30', end: '16:00' },
  tue: { on: true,  start: '07:30', end: '16:00' },
  wed: { on: true,  start: '07:30', end: '16:00' },
  thu: { on: true,  start: '07:30', end: '16:00' },
  fri: { on: true,  start: '07:30', end: '16:00' },
  sat: { on: false, start: '08:00', end: '12:00' },
  sun: { on: false, start: '08:00', end: '12:00' },
};

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
    titleWrap: { flex: 1 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
    saveBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    dayLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 },
    timeInput: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.ink, backgroundColor: c.paperDeep, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 60, textAlign: 'center' },
    timeSep: { fontSize: 13, color: c.muted, fontFamily: 'Manrope_500Medium' },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function WorkingHoursScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  useEffect(() => {
    if (settings?.workingHours) {
      try { setHours(JSON.parse(settings.workingHours)); } catch { /* use default */ }
    }
  }, [settings]);

  const saveHours = async (next: Hours) => {
    setHours(next);
    try {
      await update.mutateAsync({ workingHours: JSON.stringify(next) });
    } catch {
      showAlert('Error', 'Could not save. Please try again.');
    }
  };

  const toggleDay = (key: DayKey, val: boolean) => saveHours({ ...hours, [key]: { ...hours[key], on: val } });
  const updateTime = (key: DayKey, field: 'start' | 'end', val: string) =>
    setHours(h => ({ ...h, [key]: { ...h[key], [field]: val } }));

  const handleSave = async () => {
    try {
      await update.mutateAsync({ workingHours: JSON.stringify(hours) });
      router.back();
    } catch {
      showAlert('Error', 'Could not save. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Working Hours</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Schedule</Text>
          <View style={s.card}>
            {DAYS.map((day, i) => (
              <View key={day.key} style={[s.row, i > 0 && s.rowDivider]}>
                <Switch
                  value={hours[day.key].on}
                  onValueChange={(v) => toggleDay(day.key, v)}
                  trackColor={{ false: c.lineSoft, true: c.orange }}
                  thumbColor="#fff"
                />
                <Text style={[s.dayLabel, !hours[day.key].on && { color: c.muted }]}>{day.label}</Text>
                {hours[day.key].on && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      style={s.timeInput}
                      value={hours[day.key].start}
                      onChangeText={(v) => updateTime(day.key, 'start', v)}
                      placeholder="07:30"
                      placeholderTextColor={c.muted}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <Text style={s.timeSep}>–</Text>
                    <TextInput
                      style={s.timeInput}
                      value={hours[day.key].end}
                      onChangeText={(v) => updateTime(day.key, 'end', v)}
                      placeholder="16:00"
                      placeholderTextColor={c.muted}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={s.hint}>Used to show availability on customer-facing booking portals.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
