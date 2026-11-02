import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { apiRequest, extractError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { clearLocalAccountData } from '@/hooks/use-auth';
import { outboxCount } from '@/lib/quote-outbox';
import { hapticError, hapticWarn } from '@/lib/haptics';

/**
 * Delete account (App Store guideline 5.1.1(v)). Says plainly what goes, takes the
 * password, asks once more, then the server deletes everything in one go
 * (DELETE /api/account). On success the phone is wiped the same way as signing out.
 */
export default function DeleteAccountScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest('DELETE', '/api/account', { password });
      if (!res.ok) {
        hapticError();
        setError(await extractError(res));
        return;
      }
      await clearLocalAccountData();
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.clear();
      try { router.dismissAll(); } catch {}
      router.replace('/(auth)/login' as any);
      showAlert('Account deleted', 'Your account and everything in it have been deleted.');
    } catch (e: any) {
      hapticError();
      setError(e?.message || 'Could not delete the account. Nothing was removed.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!password || busy) return;
    hapticWarn();
    const unsynced = outboxCount();
    showConfirm({
      title: 'Delete your account?',
      message: (unsynced > 0
        ? `${unsynced} quote${unsynced === 1 ? ' is' : 's are'} saved on this phone but not synced yet, and will be lost too. `
        : '') + 'Everything goes, permanently. This can’t be undone.',
      confirmLabel: 'Delete account',
      cancelLabel: 'Keep my account',
      destructive: true,
      onConfirm: doDelete,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={s.title}>Delete account</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={s.warn}>
            <AlertTriangle size={18} color={c.red} strokeWidth={2.4} />
            <Text style={s.warnText}>
              This permanently deletes your account and everything in it: all your quotes, invoices,
              customers, jobs, receipts, messages and settings, and your Xero connection. It can’t be undone,
              and nothing can be recovered afterwards.
            </Text>
          </View>
          <Text style={s.body}>
            Want to keep a copy? Share any quotes or invoices you need as PDFs before you delete.
          </Text>

          <Text style={s.label}>Your password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your password to confirm"
            placeholderTextColor={c.muted}
            textContentType="password"
            accessibilityLabel="Your password"
          />
          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.deleteBtn, (!password || busy) && { opacity: 0.5 }]}
            onPress={confirm}
            disabled={!password || busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Delete my account"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.deleteText}>Delete my account</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 4 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
  warn: { flexDirection: 'row', gap: 10, backgroundColor: c.redSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.red },
  warnText: { flex: 1, fontSize: 13.5, fontFamily: 'HostGrotesk_600SemiBold', color: c.red, lineHeight: 19 },
  body: { fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi, lineHeight: 19 },
  label: { fontSize: 11, fontFamily: 'HostGrotesk_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  input: {
    backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'HostGrotesk_600SemiBold', color: c.ink,
  },
  error: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: c.red },
  deleteBtn: { backgroundColor: c.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  deleteText: { fontSize: 15, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff' },
});
