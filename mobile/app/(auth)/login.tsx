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
} from "react-native";
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useEffect, useMemo } from 'react';
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient as globalQueryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react-native";
import { saveCachedUser } from "@/lib/auth-cache";

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS === 'true';


export default function LoginScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", { username, password });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Invalid email or password");
      }
      return res.json();
    },
    onSuccess: async (user) => {
      // Persist so the offline bootstrap in _layout can restore the session
      await saveCachedUser(user);
      queryClient.setQueryData(["/api/auth/user"], user);
      router.replace("/(tabs)");
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: c.ink }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.logoRow}>
            <View style={s.logoIcon}>
              <Text style={{ fontSize: 20 }}>🔧</Text>
            </View>
            <Text style={s.logoText}>Vargen</Text>
          </View>

          <Text style={s.heroHeading}>
            {"Admin for\n"}
            <Text style={{ color: c.orange }}>Tradies</Text>
            {"\nWho Hate Admin."}
          </Text>

          <Text style={s.heroSub}>
            Quotes, jobs, and customer messages — done in seconds.
          </Text>

          <View style={{ marginTop: 28, gap: 12 }}>
            <Feature emoji="✨" text="AI Quote Generation" />
            <Feature emoji="📅" text="Simple Job Scheduling" />
            <Feature emoji="💬" text="Instant Customer Messaging" />
          </View>
        </View>

        {/* Form card */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Welcome back</Text>
          <Text style={s.formSub}>Sign in to manage your business.</Text>

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <View style={s.fieldWrap}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={c.muted}
              value={username}
              onChangeText={(v) => { setUsername(v); setError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={[s.fieldWrap, { marginBottom: 24 }]}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your password"
              placeholderTextColor={c.muted}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, (!username || !password || loginMutation.isPending) && { opacity: 0.6 }]}
            onPress={() => loginMutation.mutate({ username, password })}
            disabled={loginMutation.isPending || !username || !password}
            activeOpacity={0.85}
          >
            {loginMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            style={{ alignItems: 'center', paddingVertical: 14 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.orange }}>
              Forgot your password?
            </Text>
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            style={s.secondaryBtn}
            activeOpacity={0.85}
          >
            <Text style={s.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          <Text style={s.legal}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

          {(__DEV__ || DEV_BYPASS) && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  const res = await apiRequest('POST', '/api/dev-login', {});
                  if (res.ok) {
                    const user = await res.json();
                    await saveCachedUser(user);
                    queryClient.setQueryData(['/api/auth/user'], user);
                    router.replace('/(tabs)');
                    return;
                  }
                } catch {}
                // Fallback if server unreachable
                const mockUser = {
                  id: 'dev-user-001', email: 'dev@vargen.app',
                  firstName: 'Dev', lastName: 'User',
                  profileImageUrl: null, phone: null, password: null,
                  resetToken: null, resetTokenExpiry: null,
                };
                await saveCachedUser(mockUser as any);
                queryClient.setQueryData(['/api/auth/user'], mockUser);
                router.replace('/(tabs)');
              }}
              style={s.devBtn}
              activeOpacity={0.7}
            >
              <Text style={s.devBtnText}>⚡ DEV — skip login</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Feature({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: 'rgba(255,255,255,0.8)' }}>{text}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  hero: {
    backgroundColor: c.ink,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: `${c.orange}40`,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroHeading: {
    fontSize: 40,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: c.paper,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    marginTop: -24,
  },
  formTitle: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: c.redSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: c.red,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.mutedHi,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineMid,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.lineMid,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: c.muted,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
    letterSpacing: -0.2,
  },
  legal: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  devBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d97706',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
  },
  devBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#92400e',
  },
});
