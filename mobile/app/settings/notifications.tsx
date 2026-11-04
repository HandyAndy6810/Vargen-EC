import { View, Text, Switch, StyleSheet, ActivityIndicator, Alert, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Receipt, Briefcase, Star, Bell } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary, wellFill } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
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

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginBottom: 8, marginLeft: 2 },
    card: { ...rimTile(c, isDark), overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
    rowSub: { fontSize: 11, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'HostGrotesk_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function NotificationsScreen() {
  const { colors: c, isDark } = useTheme();
  const { scrollY, scrollProps } = useGradientScroll();
  const s = makeStyles(c, isDark);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Preferences" title="Notifications" />

      <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Push notifications</Text>
          <View style={s.card}>
            {NOTIF_ITEMS.map((item, i) => (
              <View key={item.key} style={[s.row, i > 0 && s.rowDivider]}>
                <View style={[s.iconBox, { backgroundColor: wellFill(isDark) }]}>
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
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
