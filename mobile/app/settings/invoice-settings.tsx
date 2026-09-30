import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

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
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    rowLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 },
    rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

const TERM_DAYS = [7, 14, 21, 30];
export default function InvoiceSettingsScreen() {
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

  const save = (patch: object) => {
    update.mutate(patch as any, {
      onError: () => showAlert('Error', 'Could not save. Please try again.'),
    });
  };

  const terms = settings?.paymentTermsDays ?? 14;
  const gst = settings?.includeGST ?? true;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Quotes & invoices</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Payment terms */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Payment</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Payment terms</Text>
                <Text style={s.rowSub}>Days until invoice is due</Text>
              </View>
            </View>
            <View style={s.chipsRow}>
              {TERM_DAYS.map(d => {
                const active = terms === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => save({ paymentTermsDays: d })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{d} days</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[s.row, s.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Include GST</Text>
                <Text style={s.rowSub}>Add 10% GST to new quotes and invoices</Text>
              </View>
              <Switch
                value={gst}
                onValueChange={(v) => save({ includeGST: v })}
                trackColor={{ false: c.lineSoft, true: c.orange }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <Text style={[s.hint, { paddingHorizontal: 22 }]}>
          Logo and bank details live in Business profile; colours, fonts and layout in Quote style.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
