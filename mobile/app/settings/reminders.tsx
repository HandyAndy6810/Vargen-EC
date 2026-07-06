import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useState, useEffect } from 'react';

const DAY_OPTIONS = [3, 7, 14, 21, 30];

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
    titleWrap: { flex: 1 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    rowLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 },
    rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
    channelRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
    channelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    channelLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function RemindersScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      </SafeAreaView>
    );
  }

  const serverEnabled = settings?.followUpEnabled ?? false;
  const [enabled, setEnabled] = useState(serverEnabled);
  useEffect(() => { setEnabled(serverEnabled); }, [serverEnabled]);

  const days: number[] = (() => { try { return JSON.parse(settings?.followUpDays ?? '[3,7,14]'); } catch { return [3, 7, 14]; } })();
  const channel = settings?.followUpChannel ?? 'sms';

  const save = (patch: object) => {
    update.mutate(patch as any, {
      onError: () => showAlert('Error', 'Could not save. Please try again.'),
    });
  };

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort((a, b) => a - b);
    if (next.length === 0) return;
    save({ followUpDays: JSON.stringify(next) });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>AI & Automations</Text>
          <Text style={s.title}>Reminders</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Follow-ups</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Automatic follow-ups</Text>
                <Text style={s.rowSub}>Chase unpaid invoices and overdue quotes</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(v) => { setEnabled(v); save({ followUpEnabled: v }); }}
                trackColor={{ false: c.lineSoft, true: c.orange }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <Text style={s.hint}>When enabled, customers receive a polite nudge at the intervals below.</Text>
        </View>

        {enabled && (
          <>
            <View style={s.group}>
              <Text style={s.groupLabel}>Send reminders after</Text>
              <View style={s.card}>
                <View style={[s.row, { paddingBottom: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>Days overdue</Text>
                    <Text style={s.rowSub}>Select all that apply</Text>
                  </View>
                </View>
                <View style={s.chipsRow}>
                  {DAY_OPTIONS.map(d => {
                    const active = days.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                        onPress={() => toggleDay(d)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{d} days</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={s.group}>
              <Text style={s.groupLabel}>Channel</Text>
              <View style={s.card}>
                <View style={[s.row, { paddingBottom: 8 }]}>
                  <Text style={s.rowLabel}>Send reminders via</Text>
                </View>
                <View style={s.channelRow}>
                  {(['sms', 'email'] as const).map(ch => {
                    const active = channel === ch;
                    return (
                      <TouchableOpacity
                        key={ch}
                        style={[s.channelBtn, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                        onPress={() => save({ followUpChannel: ch })}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.channelLabel, { color: active ? '#fff' : c.ink }]}>{ch === 'sms' ? 'SMS' : 'Email'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <Text style={s.hint}>SMS reminders require Twilio to be configured in your account settings.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
