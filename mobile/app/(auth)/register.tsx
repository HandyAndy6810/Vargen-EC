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
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/api';
import { saveCachedUser } from '@/lib/auth-cache';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function RegisterScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
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
    onSuccess: async (user) => {
      await saveCachedUser(user);
      queryClient.setQueryData(['/api/auth/user'], user);
      router.replace('/(tabs)');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
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
                placeholderTextColor={c.muted}
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
                placeholderTextColor={c.muted}
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
              placeholderTextColor={c.muted}
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
              <Text style={{ fontFamily: 'Manrope_500Medium', color: c.muted }}>(optional)</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="+61 4XX XXX XXX"
              placeholderTextColor={c.muted}
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
              placeholderTextColor={c.muted}
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
              placeholderTextColor={c.muted}
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

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  heading: { marginBottom: 28 },
  title: { fontSize: 30, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -1 },
  sub: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 6 },
  errorBox: {
    backgroundColor: c.redSoft, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.red },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: c.mutedHi, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: c.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: c.ink, borderWidth: 1, borderColor: c.lineMid,
  },
  submitBtn: {
    backgroundColor: c.orange, borderRadius: 18, height: 56,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  terms: {
    fontSize: 11, fontFamily: 'Manrope_500Medium',
    color: c.muted, textAlign: 'center', marginTop: 20, lineHeight: 17,
  },
});
