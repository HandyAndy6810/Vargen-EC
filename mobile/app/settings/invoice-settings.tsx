import { View, Text, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary, wellFill } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginBottom: 8, marginLeft: 2 },
    card: { ...rimTile(c, isDark), overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
    rowLabel: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink, flex: 1 },
    rowSub: { fontSize: 11, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold' },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'HostGrotesk_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

const TERM_DAYS = [7, 14, 21, 30];
export default function InvoiceSettingsScreen() {
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

  const save = (patch: object) => {
    update.mutate(patch as any, {
      onError: () => showAlert('Error', 'Could not save. Please try again.'),
    });
  };

  const terms = settings?.paymentTermsDays ?? 14;
  const gst = settings?.includeGST ?? true;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Business" title="Quotes & invoices" />

      <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
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
                    style={[s.chip, { backgroundColor: active ? c.orange : wellFill(isDark), borderColor: active ? c.orange : c.lineSoft }]}
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
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
