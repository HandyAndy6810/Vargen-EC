import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { showAlert } from '@/lib/dialogs';
import { LogoPicker } from '@/components/LogoPicker';

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
    readOnly: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.mutedHi },
  });
}

const IDENTITY_FIELDS = [
  { key: 'businessName', label: 'Business name', placeholder: 'Your trading name' },
  { key: 'abn', label: 'ABN', placeholder: '00 000 000 000', keyboardType: 'numeric' },
  { key: 'phone', label: 'Phone', placeholder: '0400 000 000', keyboardType: 'phone-pad' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address' },
  { key: 'address', label: 'Address', placeholder: '123 Street, Suburb NSW 2000' },
] as const;

const BANK_FIELDS = [
  { key: 'bankName', label: 'Bank name', placeholder: 'Commonwealth Bank' },
  { key: 'bsb', label: 'BSB', placeholder: '062-000', keyboardType: 'numeric' },
  { key: 'accountNumber', label: 'Account number', placeholder: '12345678', keyboardType: 'numeric' },
  { key: 'accountName', label: 'Account name', placeholder: 'Your Business Pty Ltd' },
] as const;

type FormKeys = (typeof IDENTITY_FIELDS[number] | typeof BANK_FIELDS[number])['key'];
type Form = Record<FormKeys, string>;

// The one place for who you are and how you get paid. This used to be spread
// over Edit profile (a subset of these fields), Bank details (the bank fields
// again) and Invoice settings (the logo) — three screens editing the same
// settings, so which one "won" depended on which you saved last.
export default function BusinessDetailsScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { user } = useAuth() as any;
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Form>({
    businessName: '', abn: '', phone: '', email: '', address: '',
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
        bankName: settings.bankName || '',
        bsb: settings.bsb || '',
        accountNumber: settings.accountNumber || '',
        accountName: settings.accountName || '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    const rawBsb = form.bsb.replace(/\D/g, '');
    if (rawBsb.length > 0 && rawBsb.length !== 6) {
      showAlert('Invalid BSB', 'BSB must be 6 digits (e.g. 062-001)');
      return;
    }
    const trimmed = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim()]),
    ) as Form;
    try {
      await update.mutateAsync(trimmed);
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
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Business profile</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Your name</Text>
          <View style={[s.card, { backgroundColor: c.paperDeep }]}>
            <View style={s.row}>
              <Text style={s.label}>Name</Text>
              <Text style={s.readOnly}>{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—'}</Text>
            </View>
          </View>
          <Text style={s.hint}>Read-only · To change your name, contact support.</Text>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Business</Text>
          <View style={s.card}>{renderFields(IDENTITY_FIELDS)}</View>
          <Text style={s.hint}>Shown on every quote and invoice you send.</Text>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Logo</Text>
          <LogoPicker />
          <Text style={s.hint}>Saves as soon as you change it. Crop to a wide (4:2) shape for best results.</Text>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Bank & payment</Text>
          <View style={s.card}>{renderFields(BANK_FIELDS)}</View>
          <Text style={s.hint}>Bank details appear on invoices so customers can pay via direct transfer.</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
