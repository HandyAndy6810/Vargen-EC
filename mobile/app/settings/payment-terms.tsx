import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft, Check, CreditCard } from 'lucide-react-native';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import * as Haptics from 'expo-haptics';


const TERMS_OPTIONS = [7, 14, 21, 30];

export default function PaymentTermsScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [termsDays, setTermsDays]       = useState(14);
  const [includeGST, setIncludeGST]     = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [squareEnabled, setSquareEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setTermsDays(settings.paymentTermsDays ?? 14);
      setIncludeGST(settings.includeGST ?? true);
      setStripeEnabled(settings.stripeEnabled ?? false);
      setSquareEnabled(settings.squareEnabled ?? false);
    }
  }, [settings]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings.mutate(
      { paymentTermsDays: termsDays, includeGST, stripeEnabled, squareEnabled },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onError: (err: any) => showAlert('Error', err.message),
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Settings</Text>
          <Text style={s.title}>Invoice & payment</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>

        {/* Payment terms */}
        <Text style={s.sectionLabel}>Payment terms</Text>
        <View style={s.chipRow}>
          {TERMS_OPTIONS.map(d => (
            <TouchableOpacity
              key={d}
              style={[s.chip, termsDays === d && s.chipActive]}
              onPress={() => { Haptics.selectionAsync(); setTermsDays(d); }}
              activeOpacity={0.75}
            >
              <Text style={[s.chipText, termsDays === d && s.chipTextActive]}>{d} days</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* GST toggle */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Tax</Text>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Include GST (10%)</Text>
            <Text style={s.toggleSub}>Automatically added to all invoices and quotes</Text>
          </View>
          <Switch
            value={includeGST}
            onValueChange={setIncludeGST}
            trackColor={{ false: c.lineMid, true: c.orange }}
            thumbColor="#fff"
          />
        </View>

        {/* Card payment processors */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Card payments</Text>
        <View style={s.card}>
          <View style={s.infoBox}>
            <CreditCard size={16} color={c.blue} strokeWidth={2} />
            <Text style={s.infoBoxText}>
              Enable your payment processors below. API keys must be configured on your server for these to work.
            </Text>
          </View>

          <View style={[s.toggleRow, { paddingHorizontal: 0, paddingTop: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>Stripe</Text>
              <Text style={s.toggleSub}>1.7% + 30¢ per transaction · Cards, Apple Pay, Google Pay</Text>
            </View>
            <Switch
              value={stripeEnabled}
              onValueChange={setStripeEnabled}
              trackColor={{ false: c.lineMid, true: c.orange }}
              thumbColor="#fff"
            />
          </View>

          <View style={[s.divider]} />

          <View style={[s.toggleRow, { paddingHorizontal: 0, paddingBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>Square</Text>
              <Text style={s.toggleSub}>1.6% per transaction · Cards, Apple Pay, Google Pay</Text>
            </View>
            <Switch
              value={squareEnabled}
              onValueChange={setSquareEnabled}
              trackColor={{ false: c.lineMid, true: c.orange }}
              thumbColor="#fff"
            />
          </View>
        </View>

      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, saved && { backgroundColor: c.green }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={updateSettings.isPending}
        >
          {saved ? (
            <>
              <Check size={18} color="#fff" strokeWidth={2.5} />
              <Text style={s.saveBtnText}>Saved</Text>
            </>
          ) : (
            <Text style={s.saveBtnText}>{updateSettings.isPending ? 'Saving…' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  title: {
    fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5,
  },
  sectionLabel: {
    fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid,
  },
  chipActive: { backgroundColor: c.ink, borderColor: c.ink },
  chipText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  chipTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 0, paddingVertical: 12,
  },
  toggleTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink },
  toggleSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
  card: {
    backgroundColor: c.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: c.lineSoft,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eaf2ff', borderRadius: 10, padding: 12,
  },
  infoBoxText: {
    flex: 1, fontSize: 12, fontFamily: 'Manrope_500Medium',
    color: c.ink, lineHeight: 17,
  },
  divider: { height: 1, backgroundColor: c.lineSoft, marginVertical: 4 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20,
    backgroundColor: c.paper,
    borderTopWidth: 1, borderTopColor: c.lineSoft,
    shadowColor: c.ink, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 12,
  },
  saveBtn: {
    backgroundColor: c.orange, borderRadius: 18, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
