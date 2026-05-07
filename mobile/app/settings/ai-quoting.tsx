import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save, Info } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

const TRADE_TYPES = ['General', 'Electrical', 'Plumbing', 'HVAC', 'Carpentry', 'Painting'];

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
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    rowLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 },
    rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
    numericInput: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink, backgroundColor: c.paperDeep, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 72, textAlign: 'right' },
    banner: { flexDirection: 'row', gap: 10, backgroundColor: c.orangeSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: `${c.orange}33`, marginHorizontal: 20, marginTop: 22 },
    bannerText: { flex: 1, fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.orangeDeep, lineHeight: 18 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function AiQuotingScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState({
    tradeType: 'General',
    labourRate: '85',
    markupPercent: '15',
    callOutFee: '80',
    callOutFeeEnabled: false,
    includeGST: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        tradeType: settings.tradeType || 'General',
        labourRate: String(settings.labourRate ?? 85),
        markupPercent: String(settings.markupPercent ?? 15),
        callOutFee: String(settings.callOutFee ?? 80),
        callOutFeeEnabled: settings.callOutFeeEnabled ?? false,
        includeGST: settings.includeGST ?? true,
      });
    }
  }, [settings]);

  const autoSave = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    update.mutate({
      tradeType: next.tradeType,
      callOutFeeEnabled: next.callOutFeeEnabled,
      includeGST: next.includeGST,
    }, { onError: () => Alert.alert('Error', 'Could not save.') });
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        tradeType: form.tradeType,
        labourRate: parseInt(form.labourRate, 10) || 85,
        markupPercent: parseInt(form.markupPercent, 10) || 15,
        callOutFee: parseInt(form.callOutFee, 10) || 80,
        callOutFeeEnabled: form.callOutFeeEnabled,
        includeGST: form.includeGST,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
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
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>AI & Automations</Text>
          <Text style={s.title}>AI Quoting</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
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
              {TRADE_TYPES.map(t => {
                const active = form.tradeType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
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
              { key: 'labourRate',    label: 'Labour rate',  sub: 'Per hour charged to customer', suffix: '$/hr' },
              { key: 'markupPercent', label: 'Material markup', sub: 'Added on top of material cost', suffix: '%' },
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
                  />
                  <Text style={{ fontSize: 12, color: c.muted, fontFamily: 'Manrope_600SemiBold' }}>{field.suffix}</Text>
                </View>
              </View>
            ))}
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
                    />
                    <Text style={{ fontSize: 12, color: c.muted, fontFamily: 'Manrope_600SemiBold' }}>$</Text>
                  </View>
                )}
                <Switch
                  value={form.callOutFeeEnabled}
                  onValueChange={(v) => autoSave({ callOutFeeEnabled: v })}
                  trackColor={{ false: c.lineSoft, true: c.orange }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        </View>

        {/* GST */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Tax</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Include GST</Text>
                <Text style={s.rowSub}>Add 10% GST to all AI-generated quotes</Text>
              </View>
              <Switch
                value={form.includeGST}
                onValueChange={(v) => autoSave({ includeGST: v })}
                trackColor={{ false: c.lineSoft, true: c.orange }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <Text style={s.hint}>Tap Save to apply pricing changes to future AI quotes.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
