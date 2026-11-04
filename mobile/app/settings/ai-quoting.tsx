import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { Save, Info } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary, wellFill } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { TRADE_LABELS, tradeLabel } from '@shared/trades';

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    saveBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginBottom: 8, marginLeft: 2 },
    card: { ...rimTile(c, isDark), overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
    rowLabel: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink, flex: 1 },
    rowSub: { fontSize: 11, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold' },
    numericInput: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.ink, backgroundColor: wellFill(isDark), borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 72, textAlign: 'right' },
    banner: { flexDirection: 'row', gap: 10, backgroundColor: c.orangeSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: `${c.orange}33`, marginHorizontal: 20, marginTop: 22 },
    bannerText: { flex: 1, fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.orangeDeep, lineHeight: 18 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'HostGrotesk_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function AiQuotingScreen() {
  const { colors: c, isDark } = useTheme();
  const { scrollY, scrollProps } = useGradientScroll();
  const s = makeStyles(c, isDark);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState({
    tradeType: 'General',
    labourRate: '85',
    markupPercent: '15',
    labourCostRate: '',
    markupLabour: false,
    callOutFee: '80',
    callOutFeeEnabled: false,
  });

  // Seeded from the server ONCE. This used to re-seed on every settings refetch,
  // and flipping a switch saves (autoSave) and so refetches: anything typed but not
  // yet saved, the charge-out rate or markup, snapped back before Save was pressed
  // (q5). Hence "it only applies on the second attempt".
  const seeded = useRef(false);
  useEffect(() => {
    if (settings && !seeded.current) {
      seeded.current = true;
      setForm({
        tradeType: settings.tradeType || 'General',
        labourRate: String(settings.labourRate ?? 85),
        markupPercent: String(settings.markupPercent ?? 15),
        labourCostRate: settings.labourCostRate != null ? String(settings.labourCostRate) : '',
        markupLabour: settings.markupLabour ?? false,
        callOutFee: String(settings.callOutFee ?? 80),
        callOutFeeEnabled: settings.callOutFeeEnabled ?? false,
      });
    }
  }, [settings]);

  /** The typed fields, as the settings API takes them. */
  const numbersOf = (f: typeof form) => ({
    labourRate: parseInt(f.labourRate, 10) || 85,
    markupPercent: Number.isFinite(parseInt(f.markupPercent, 10)) ? parseInt(f.markupPercent, 10) : 15,
    // Blank means "not set": labour lines then report no cost.
    labourCostRate: parseInt(f.labourCostRate, 10) > 0 ? parseInt(f.labourCostRate, 10) : null,
    callOutFee: parseInt(f.callOutFee, 10) || 80,
  });

  // The call-out fee is the lowest input on the screen: once the keyboard is up,
  // scroll it into view (st4: the keyboard covered it on the first try).
  const scrollRef = useRef<ScrollView>(null);
  const lowInputFocused = useRef(false);
  useEffect(() => {
    const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      if (lowInputFocused.current) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => sub.remove();
  }, []);

  const autoSave = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    // Everything on screen goes with the switch, typed numbers included, so a
    // switch never saves an older version of the rest.
    update.mutate({
      ...numbersOf(next),
      tradeType: next.tradeType,
      callOutFeeEnabled: next.callOutFeeEnabled,
      markupLabour: next.markupLabour,
    }, { onError: () => showAlert('Error', 'Could not save.') });
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        ...numbersOf(form),
        tradeType: form.tradeType,
        markupLabour: form.markupLabour,
        callOutFeeEnabled: form.callOutFeeEnabled,
      });
      router.back();
    } catch {
      showAlert('Error', 'Could not save changes. Please try again.');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Pricing" title="AI quoting" right={<>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending} accessibilityRole="button" accessibilityLabel="Save AI quoting settings">
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </>} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.ScrollView {...scrollProps} ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.banner}>
          <Info size={16} color={c.orange} strokeWidth={2.1} style={{ marginTop: 1 }} />
          <Text style={s.bannerText}>
            These settings are fed directly to the AI when generating quotes. Accurate rates lead to more accurate quotes.
          </Text>
        </View>

        {/* Trade type */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Trade type</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 8 }]}>
              <Text style={s.rowLabel}>Your trade</Text>
            </View>
            <View style={s.chipsRow}>
              {TRADE_LABELS.map(t => {
                // Match on meaning, not on the exact string — an account set up in
                // the web app holds "Electrician", not "Electrical".
                const active = tradeLabel(form.tradeType) === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, { backgroundColor: active ? c.orange : wellFill(isDark), borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => autoSave({ tradeType: t })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Default pricing</Text>
          <View style={s.card}>
            {[
              { key: 'labourRate',     label: 'Charge out rate ($/hr)', sub: "What the customer pays per hour. Markup isn't added on top.", suffix: '$/hr' },
              { key: 'labourCostRate', label: 'What an hour costs you (optional)', sub: 'Only used to show your profit on labour', suffix: '$/hr' },
              { key: 'markupPercent',  label: form.markupLabour ? 'Markup' : 'Materials markup',
                sub: form.markupLabour ? 'Added on top of material and labour cost' : 'Added on top of material cost', suffix: '%' },
            ].map((field, i) => (
              <View key={field.key} style={[s.row, i > 0 && s.rowDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{field.label}</Text>
                  <Text style={s.rowSub}>{field.sub}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={s.numericInput}
                    value={(form as any)[field.key]}
                    onChangeText={(v) => setForm(f => ({ ...f, [field.key]: v }))}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder={field.key === 'labourCostRate' ? '—' : undefined}
                    placeholderTextColor={c.muted}
                    accessibilityLabel={field.label}
                  />
                  <Text style={{ fontSize: 12, color: c.muted, fontFamily: 'HostGrotesk_600SemiBold' }}>{field.suffix}</Text>
                </View>
              </View>
            ))}
            <View style={[s.row, s.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Mark up labour too</Text>
                <Text style={s.rowSub}>For cost-plus pricing across the whole job. Off: your charge out rate is what the customer pays.</Text>
              </View>
              <Switch
                accessibilityLabel="Mark up labour too"
                value={form.markupLabour}
                onValueChange={(v) => autoSave({ markupLabour: v })}
                trackColor={{ false: c.lineSoft, true: c.orange }}
                thumbColor="#fff"
              />
            </View>
            <View style={[s.row, s.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Call-out fee</Text>
                <Text style={s.rowSub}>Flat fee for attending a job</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {form.callOutFeeEnabled && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      style={s.numericInput}
                      value={form.callOutFee}
                      onChangeText={(v) => setForm(f => ({ ...f, callOutFee: v }))}
                      keyboardType="numeric"
                      maxLength={5}
                      accessibilityLabel="Call-out fee amount"
                      onFocus={() => { lowInputFocused.current = true; }}
                      onBlur={() => { lowInputFocused.current = false; }}
                    />
                    <Text style={{ fontSize: 12, color: c.muted, fontFamily: 'HostGrotesk_600SemiBold' }}>$</Text>
                  </View>
                )}
                <Switch
                  accessibilityLabel="Charge a call-out fee"
                  value={form.callOutFeeEnabled}
                  onValueChange={(v) => autoSave({ callOutFeeEnabled: v })}
                  trackColor={{ false: c.lineSoft, true: c.orange }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        </View>

        {/* GST is set once, in Quotes & invoices. It used to have a switch here
            too, and this screen's Save sent its copy back — so saving your rates
            could quietly undo a GST change made on the other screen. */}
        <View style={s.group}>
          <Text style={s.hint}>Tap Save to apply pricing changes to future AI quotes. GST is set in Quotes & invoices.</Text>
        </View>
      </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
