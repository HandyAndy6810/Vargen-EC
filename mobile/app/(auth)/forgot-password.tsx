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
import { apiRequest } from '@/lib/api';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE     = '#f26a2a';
const ORANGE_SOFT = '#ffe6d3';
const INK        = '#141310';
const PAPER      = '#f7f4ee';
const CARD       = '#ffffff';
const GREEN      = '#2a9d4c';
const GREEN_SOFT = '#e5f6eb';
const MUTED      = 'rgba(20,19,16,0.55)';
const MUTED_HI   = 'rgba(20,19,16,0.72)';
const LINE_MID   = 'rgba(20,19,16,0.18)';
const RED        = '#d23b3b';
const RED_SOFT   = '#fde5e5';

export default function ForgotPasswordScreen() {
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
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>

          {sent ? (
            /* ── Success state ── */
            <View style={s.successContainer}>
              <View style={s.successIcon}>
                <Mail size={32} color={GREEN} strokeWidth={1.8} />
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
                  placeholderTextColor={MUTED}
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
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GREEN_SOFT, alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  successSub: {
    fontSize: 14, fontFamily: 'Manrope_500Medium',
    color: MUTED, textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 36, paddingHorizontal: 8,
  },
});
