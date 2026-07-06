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
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import { useCreateCustomer } from '@/hooks/use-customers';


export default function CustomerNewScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
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
      {
        onSuccess: (newCustomer: any) => router.replace(`/customers/${newCustomer.id}` as any),
        onError: (err: any) => setError(err?.message || 'Could not save customer. Check your connection and try again.'),
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.eyebrow} numberOfLines={1}>New customer</Text>
            <Text style={s.title} numberOfLines={1}>Add a customer</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, gap: 14, paddingTop: 8 }}>

            {/* Avatar preview */}
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={s.avatar}>
                {initials
                  ? <Text style={s.avatarText}>{initials}</Text>
                  : <User size={28} color={c.orange} strokeWidth={2} />}
              </View>
            </View>

            {/* Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Full name *</Text>
              <TextInput
                style={[s.input, error ? { borderColor: '#d23b3b', borderWidth: 1 } : null]}
                placeholder="e.g. Sarah Johnson"
                placeholderTextColor={c.muted}
                value={name}
                onChangeText={v => { setName(v); if (error) setError(null); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {error ? <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#d23b3b', marginTop: 4 }}>{error}</Text> : null}
            </View>

            {/* Phone */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Phone</Text>
              <TextInput
                style={s.input}
                placeholder="+61 4XX XXX XXX"
                placeholderTextColor={c.muted}
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
                placeholderTextColor={c.muted}
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
                placeholderTextColor={c.muted}
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
                placeholderTextColor={c.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

          </View>
        </ScrollView>

        {/* Save bar */}
        <View style={s.saveBar}>
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.85} onPress={handleSave} disabled={isPending}>
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText} numberOfLines={1}>Add customer</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 18, fontFamily: 'Manrope_800ExtraBold',
    color: c.ink, letterSpacing: -0.4, marginTop: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: c.ink, borderWidth: 1, borderColor: c.lineMid,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(247,244,238,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 30,
  },
  saveBtn: {
    backgroundColor: c.orange, borderRadius: 18, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
