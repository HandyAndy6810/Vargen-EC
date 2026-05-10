import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

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
    row: { paddingHorizontal: 14, paddingVertical: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    label: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    input: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.ink, padding: 0 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

const IDENTITY_FIELDS = [
  { key: 'businessName', label: 'Business name', placeholder: 'Your trading name' },
  { key: 'abn', label: 'ABN', placeholder: '00 000 000 000', keyboardType: 'numeric' },
  { key: 'phone', label: 'Phone', placeholder: '0400 000 000', keyboardType: 'phone-pad' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address' },
  { key: 'address', label: 'Address', placeholder: '123 Street, Suburb NSW 2000' },
  { key: 'logoUrl', label: 'Logo URL', placeholder: 'https://example.com/logo.png', keyboardType: 'url' },
] as const;

const BANK_FIELDS = [
  { key: 'bankName', label: 'Bank name', placeholder: 'Commonwealth Bank' },
  { key: 'bsb', label: 'BSB', placeholder: '062-000', keyboardType: 'numeric' },
  { key: 'accountNumber', label: 'Account number', placeholder: '12345678', keyboardType: 'numeric' },
  { key: 'accountName', label: 'Account name', placeholder: 'Your Business Pty Ltd' },
] as const;

type FormKeys = (typeof IDENTITY_FIELDS[number] | typeof BANK_FIELDS[number])['key'];
type Form = Record<FormKeys, string>;

export default function BusinessDetailsScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Form>({
    businessName: '', abn: '', phone: '', email: '', address: '', logoUrl: '',
    bankName: '', bsb: '', accountNumber: '', accountName: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        businessName: settings.businessName || '',
        abn: settings.abn || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        logoUrl: settings.logoUrl || '',
        bankName: settings.bankName || '',
        bsb: settings.bsb || '',
        accountNumber: settings.accountNumber || '',
        accountName: settings.accountName || '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await update.mutateAsync(form);
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

  const renderFields = (fields: readonly { key: FormKeys; label: string; placeholder: string; keyboardType?: string }[]) =>
    fields.map((field, i) => (
      <View key={field.key} style={[s.row, i > 0 && s.rowDivider]}>
        <Text style={s.label}>{field.label}</Text>
        <TextInput
          style={s.input}
          value={form[field.key]}
          onChangeText={(v) => setForm(f => ({ ...f, [field.key]: v }))}
          placeholder={field.placeholder}
          placeholderTextColor={c.muted}
          keyboardType={(field as any).keyboardType || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    ));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Business Details</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Identity</Text>
          <View style={s.card}>{renderFields(IDENTITY_FIELDS)}</View>
          <Text style={s.hint}>Your logo URL appears on invoices and quotes sent to customers.</Text>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Bank & payment</Text>
          <View style={s.card}>{renderFields(BANK_FIELDS)}</View>
          <Text style={s.hint}>Bank details appear on invoices so customers can pay via direct transfer.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
