import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft, Check, Building2 } from 'lucide-react-native';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import * as Haptics from 'expo-haptics';


function formatBsb(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length > 3) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits;
}

export default function BankDetailsScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName]       = useState('');
  const [bsb, setBsb]                 = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setAccountName(settings.accountName || '');
      setBankName(settings.bankName || '');
      setBsb(settings.bsb || '');
      setAccountNumber(settings.accountNumber || '');
    }
  }, [settings]);

  const handleSave = () => {
    const rawBsb = bsb.replace(/\D/g, '');
    if (rawBsb.length > 0 && rawBsb.length !== 6) {
      showAlert('Invalid BSB', 'BSB must be 6 digits (e.g. 062-001)');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings.mutate(
      { accountName: accountName.trim(), bankName: bankName.trim(), bsb: bsb.trim(), accountNumber: accountNumber.trim() },
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Settings</Text>
            <Text style={s.title}>Bank details</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <View style={s.infoCard}>
            <Building2 size={18} color={c.orange} strokeWidth={2} />
            <Text style={s.infoText}>
              These details appear on your invoices so customers can pay by bank transfer — the most common payment method in Australia.
            </Text>
          </View>

          <View style={s.section}>
            <Text style={s.label}>Account name</Text>
            <TextInput
              style={s.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g. Smith's Plumbing Pty Ltd"
              placeholderTextColor={c.muted}
              autoCorrect={false}
            />
          </View>

          <View style={s.section}>
            <Text style={s.label}>Bank name</Text>
            <TextInput
              style={s.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. ANZ, CommBank, NAB, Westpac"
              placeholderTextColor={c.muted}
              autoCorrect={false}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[s.section, { flex: 1 }]}>
              <Text style={s.label}>BSB</Text>
              <TextInput
                style={s.input}
                value={bsb}
                onChangeText={v => setBsb(formatBsb(v))}
                placeholder="062-001"
                placeholderTextColor={c.muted}
                keyboardType="numeric"
                maxLength={7}
              />
            </View>
            <View style={[s.section, { flex: 1.5 }]}>
              <Text style={s.label}>Account number</Text>
              <TextInput
                style={s.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="12345678"
                placeholderTextColor={c.muted}
                keyboardType="numeric"
                maxLength={12}
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
              <Text style={s.saveBtnText}>{updateSettings.isPending ? 'Saving…' : 'Save bank details'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: c.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff3ed',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
    lineHeight: 19,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: c.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
    borderWidth: 1,
    borderColor: c.lineMid,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: c.paper,
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
  },
  saveBtn: {
    backgroundColor: c.orange,
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
