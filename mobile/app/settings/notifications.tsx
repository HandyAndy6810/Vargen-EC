import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, Receipt, Briefcase, Star, Bell } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

type NotifPrefs = { quotes: boolean; invoices: boolean; jobs: boolean; reviews: boolean; reminders: boolean };

const NOTIF_ITEMS: { key: keyof NotifPrefs; label: string; sub: string; Icon: any }[] = [
  { key: 'quotes',    label: 'New quote requests',  sub: 'When a customer requests a quote',       Icon: FileText },
  { key: 'invoices',  label: 'Invoice paid',         sub: 'When a payment is received',             Icon: Receipt },
  { key: 'jobs',      label: 'Job updates',          sub: 'Scheduling changes and completions',     Icon: Briefcase },
  { key: 'reviews',   label: 'Customer reviews',     sub: 'When a review is submitted',             Icon: Star },
  { key: 'reminders', label: 'Reminder nudges',      sub: 'Follow-up and overdue alerts',           Icon: Bell },
];

const DEFAULT_PREFS: NotifPrefs = { quotes: true, invoices: true, jobs: true, reviews: true, reminders: true };

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
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink },
    rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function NotificationsScreen() {
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

  const prefs: NotifPrefs = (() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(settings?.notificationPrefs ?? '{}') }; }
    catch { return DEFAULT_PREFS; }
  })();

  const toggle = (key: keyof NotifPrefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    update.mutate({ notificationPrefs: JSON.stringify(next) }, {
      onError: () => {
        if (Platform.OS === 'web') window.alert('Could not save notification preferences. Please try again.');
        else Alert.alert('Error', 'Could not save. Please try again.');
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Preferences</Text>
          <Text style={s.title}>Notifications</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Push notifications</Text>
          <View style={s.card}>
            {NOTIF_ITEMS.map((item, i) => (
              <View key={item.key} style={[s.row, i > 0 && s.rowDivider]}>
                <View style={[s.iconBox, { backgroundColor: c.paperDeep }]}>
                  <item.Icon size={16} color={c.ink} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                <Switch
                  value={prefs[item.key]}
                  onValueChange={(v) => toggle(item.key, v)}
                  trackColor={{ false: c.lineSoft, true: c.orange }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
          <Text style={s.hint}>Push notifications require permission to be granted in your device settings.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
