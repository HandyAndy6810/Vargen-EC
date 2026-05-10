import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    swatchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
    swatch: { width: 36, height: 36, borderRadius: 10, borderWidth: 2 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

const TERM_DAYS = [7, 14, 21, 30];
const ACCENT_COLORS = ['#f26a2a', '#2563eb', '#16a34a', '#64748b', '#141310'];
const FONTS = [
  { value: 'inter', label: 'Inter' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'georgia', label: 'Georgia' },
];
const HEADER_STYLES = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'classic', label: 'Classic' },
];

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
      onError: () => Alert.alert('Error', 'Could not save. Please try again.'),
    });
  };

  const terms = settings?.paymentTermsDays ?? 14;
  const gst = settings?.includeGST ?? true;
  const accent = settings?.quoteAccentColor ?? '#f26a2a';
  const font = settings?.quoteFontFamily ?? 'inter';
  const headerStyle = settings?.quoteHeaderStyle ?? 'gradient';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Invoice & Quote Settings</Text>
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
                <Text style={s.rowSub}>Add 10% GST to all quotes and invoices</Text>
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

        {/* Accent colour */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Branding colour</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <Text style={s.rowLabel}>Accent colour</Text>
            </View>
            <View style={s.swatchRow}>
              {ACCENT_COLORS.map(col => (
                <TouchableOpacity
                  key={col}
                  style={[s.swatch, { backgroundColor: col, borderColor: accent === col ? col : 'transparent' }]}
                  onPress={() => save({ quoteAccentColor: col })}
                  activeOpacity={0.7}
                >
                  {accent === col && (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Font */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Quote font</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <Text style={s.rowLabel}>Font family</Text>
            </View>
            <View style={s.chipsRow}>
              {FONTS.map(f => {
                const active = font === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => save({ quoteFontFamily: f.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Header style */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Quote header style</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <Text style={s.rowLabel}>Layout</Text>
            </View>
            <View style={s.chipsRow}>
              {HEADER_STYLES.map(hs => {
                const active = headerStyle === hs.value;
                return (
                  <TouchableOpacity
                    key={hs.value}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => save({ quoteHeaderStyle: hs.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{hs.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Text style={s.hint}>Changes apply to new quotes and invoices going forward.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
