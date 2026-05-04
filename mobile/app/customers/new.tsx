import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import { useCreateCustomer } from '@/hooks/use-customers';

const ORANGE      = '#f26a2a';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const CARD        = '#ffffff';
const MUTED       = 'rgba(20,19,16,0.55)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

export default function CustomerNewScreen() {
  const { mutate: createCustomer, isPending } = useCreateCustomer();

  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes]     = useState('');
  const [error, setError]     = useState<string | null>(null);

  const initials = name.trim().split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

  const handleSave = () => {
    if (!name.trim()) { setError('Customer name is required'); return; }
    setError(null);
    createCustomer(
      {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>New customer</Text>
            <Text style={s.title}>Add a customer</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, gap: 14, paddingTop: 8 }}>

            {/* Avatar preview */}
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={s.avatar}>
                {initials
                  ? <Text style={s.avatarText}>{initials}</Text>
                  : <User size={28} color={ORANGE} strokeWidth={2} />}
              </View>
            </View>

            {/* Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Full name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Sarah Johnson"
                placeholderTextColor={MUTED}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Phone */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Phone</Text>
              <TextInput
                style={s.input}
                placeholder="+61 4XX XXX XXX"
                placeholderTextColor={MUTED}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="email@example.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* Address */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Address</Text>
              <TextInput
                style={s.input}
                placeholder="Street address"
                placeholderTextColor={MUTED}
                value={address}
                onChangeText={setAddress}
                returnKeyType="next"
              />
            </View>

            {/* Notes */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Notes</Text>
              <TextInput
                style={[s.input, { height: 88, textAlignVertical: 'top', paddingTop: 14 }]}
                placeholder="Gate codes, preferences, parking…"
                placeholderTextColor={MUTED}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {error && (
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#d23b3b', textAlign: 'center' }}>{error}</Text>
            )}
          </View>
        </ScrollView>

        {/* Save bar */}
        <View style={s.saveBar}>
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.85} onPress={handleSave} disabled={isPending}>
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Add customer</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED, letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 18, fontFamily: 'Manrope_800ExtraBold',
    color: INK, letterSpacing: -0.4, marginTop: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: INK, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontFamily: 'Manrope_800ExtraBold', color: ORANGE },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: INK, borderWidth: 1, borderColor: LINE_MID,
  },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: PAPER, borderTopWidth: 1, borderTopColor: LINE_MID,
    paddingTop: 14, paddingHorizontal: 20, paddingBottom: 34,
  },
  saveBtn: {
    backgroundColor: ORANGE, borderRadius: 18, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
