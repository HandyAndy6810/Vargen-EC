import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Save } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { showAlert } from '@/lib/dialogs';
import { optionalEmailProblem } from '@shared/signup-fields';
import { LogoPicker } from '@/components/LogoPicker';

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    saveBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginBottom: 8, marginLeft: 2 },
    card: { ...rimTile(c, isDark), overflow: 'hidden' },
    row: { paddingHorizontal: 14, paddingVertical: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
    label: { fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: c.mutedHi, marginBottom: 4 },
    input: { fontSize: 14, fontFamily: 'HostGrotesk_500Medium', color: c.ink, padding: 0 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'HostGrotesk_500Medium', marginTop: 6, paddingHorizontal: 2 },
    readOnly: { fontSize: 14, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi },
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
  const { colors: c, isDark } = useTheme();
  const { scrollY, scrollProps } = useGradientScroll();
  const s = makeStyles(c, isDark);
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

  const [emailTouched, setEmailTouched] = useState(false);
  const emailErr = emailTouched ? optionalEmailProblem(form.email) : null;

  const handleSave = async () => {
    // su2: the email printed on every quote and invoice gets the sign-up check.
    setEmailTouched(true);
    if (optionalEmailProblem(form.email)) return;
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
      <View key={field.key} style={[s.row, i > 0 && s.rowDivider, field.key === 'email' && emailErr ? { backgroundColor: c.redSoft } : null]}>
        <Text style={[s.label, field.key === 'email' && emailErr ? { color: c.red } : null]}>{field.label}</Text>
        <TextInput
          style={s.input}
          value={form[field.key]}
          onChangeText={(v) => setForm(f => ({ ...f, [field.key]: v }))}
          placeholder={field.placeholder}
          placeholderTextColor={c.muted}
          keyboardType={(field as any).keyboardType || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          onBlur={field.key === 'email' ? () => setEmailTouched(true) : undefined}
          accessibilityLabel={field.label}
        />
        {field.key === 'email' && emailErr ? <Text style={{ fontSize: 12.5, fontFamily: 'HostGrotesk_600SemiBold', color: c.red, marginTop: 6 }}>{emailErr}</Text> : null}
      </View>
    ));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Business" title="Business profile" right={<>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </>} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Your name</Text>
          <View style={s.card}>
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
      </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
