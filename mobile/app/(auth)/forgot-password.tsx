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
import { apiRequest } from '@/lib/api';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ForgotPasswordScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent]   = useState(false);

  const forgotMutation = useMutation({
    mutationFn: async (addr: string) => {
      const res = await apiRequest('POST', '/api/auth/forgot-password', { email: addr });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to send reset email');
      }
    },
    onSuccess: () => setSent(true),
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setError(null);
    forgotMutation.mutate(email.trim());
  };

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
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>

          {sent ? (
            /* ── Success state ── */
            <View style={s.successContainer}>
              <View style={s.successIcon}>
                <Mail size={32} color={c.green} strokeWidth={1.8} />
              </View>
              <Text style={s.title}>Check your email</Text>
              <Text style={s.successSub}>
                If that address is registered, we sent a password reset link. It expires in 1 hour.
              </Text>
              <TouchableOpacity
                style={s.submitBtn}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.85}
              >
                <Text style={s.submitBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form state ── */
            <>
              <View style={s.heading}>
                <Text style={s.title}>Forgot password?</Text>
                <Text style={s.sub}>Enter your email and we'll send a reset link.</Text>
              </View>

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <View style={[s.fieldGroup, { marginBottom: 28 }]}>
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

              <TouchableOpacity
                style={[s.submitBtn, !email && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={forgotMutation.isPending || !email}
                activeOpacity={0.85}
              >
                {forgotMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitBtnText}>Send reset link</Text>}
              </TouchableOpacity>
            </>
          )}
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
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  successSub: {
    fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: c.muted, textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 36, paddingHorizontal: 8,
  },
});
