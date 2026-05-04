import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/api';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE     = '#f26a2a';
const ORANGE_SOFT = '#ffe6d3';
const INK        = '#141310';
const PAPER      = '#f7f4ee';
const PAPER_DEEP = '#efe9dd';
const CARD       = '#ffffff';
const MUTED      = 'rgba(20,19,16,0.55)';
const MUTED_HI   = 'rgba(20,19,16,0.72)';
const LINE_MID   = 'rgba(20,19,16,0.18)';
const RED        = '#d23b3b';
const RED_SOFT   = '#fde5e5';

export default function RegisterScreen() {
  const [firstName, setFirstName]               = useState('');
  const [lastName, setLastName]                 = useState('');
  const [email, setEmail]                       = useState('');
  const [phone, setPhone]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [error, setError]                       = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim()) throw new Error('First name is required');
      if (!email.trim()) throw new Error('Email is required');
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      if (password !== confirmPassword) throw new Error("Passwords don't match");

      const res = await apiRequest('POST', '/api/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        password,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Registration failed');
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/auth/user'], user);
      router.replace('/(tabs)');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.container}>
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Heading */}
          <View style={s.heading}>
            <Text style={s.title}>Create account</Text>
            <Text style={s.sub}>Set up your Vargen account.</Text>
          </View>

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Name row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>First name</Text>
              <TextInput
                style={s.input}
                placeholder="Jane"
                placeholderTextColor={MUTED}
                value={firstName}
                onChangeText={v => { setFirstName(v); setError(null); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Last name</Text>
              <TextInput
                style={s.input}
                placeholder="Smith"
                placeholderTextColor={MUTED}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={v => { setEmail(v); setError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>
              Mobile{' '}
              <Text style={{ fontFamily: 'Manrope_500Medium', color: MUTED }}>(optional)</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="+61 4XX XXX XXX"
              placeholderTextColor={MUTED}
              value={phone}
              onChangeText={v => { setPhone(v); setError(null); }}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="Min 8 characters"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={v => { setPassword(v); setError(null); }}
              secureTextEntry
            />
          </View>

          <View style={[s.fieldGroup, { marginBottom: 28 }]}>
            <Text style={s.fieldLabel}>Confirm password</Text>
            <TextInput
              style={s.input}
              placeholder="Repeat password"
              placeholderTextColor={MUTED}
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); setError(null); }}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.submitBtn, (!firstName || !email || !password || !confirmPassword) && s.submitBtnDisabled]}
            onPress={() => registerMutation.mutate()}
            disabled={registerMutation.isPending || !firstName || !email || !password || !confirmPassword}
            activeOpacity={0.85}
          >
            {registerMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Create account</Text>}
          </TouchableOpacity>

          <Text style={s.terms}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_MID,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  heading: { marginBottom: 28 },
  title: { fontSize: 30, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: -1 },
  sub: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 6 },
  errorBox: {
    backgroundColor: RED_SOFT, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: RED },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED_HI, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: INK, borderWidth: 1, borderColor: LINE_MID,
  },
  submitBtn: {
    backgroundColor: ORANGE, borderRadius: 18, height: 56,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  terms: {
    fontSize: 11, fontFamily: 'Manrope_500Medium',
    color: MUTED, textAlign: 'center', marginTop: 20, lineHeight: 17,
  },
});
