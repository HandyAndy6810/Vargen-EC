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
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react-native";

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const BLACK       = '#0f0e0b';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.18)';
const RED_SOFT    = '#fde5e5';
const RED         = '#d23b3b';

export default function LoginScreen() {
  const { isAuthenticated, isLoading } = useAuth();
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
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      router.replace("/(tabs)");
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: BLACK }}>
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
            <Text style={{ color: ORANGE }}>Tradies</Text>
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
              placeholderTextColor={MUTED}
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
              placeholderTextColor={MUTED}
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
            <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: ORANGE }}>
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

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => {
                const devEmail = process.env.EXPO_PUBLIC_DEV_EMAIL;
                const devPass = process.env.EXPO_PUBLIC_DEV_PASSWORD;
                if (devEmail && devPass) {
                  loginMutation.mutate({ username: devEmail, password: devPass });
                }
              }}
              style={s.devBtn}
              activeOpacity={0.7}
            >
              <Text style={s.devBtnText}>⚡ DEV BYPASS — skip login</Text>
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

const s = StyleSheet.create({
  hero: {
    backgroundColor: BLACK,
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
    backgroundColor: `${ORANGE}40`,
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
    backgroundColor: ORANGE,
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
    backgroundColor: PAPER,
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
    color: INK,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: RED_SOFT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: RED,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: INK,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
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
    backgroundColor: LINE_MID,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    letterSpacing: -0.2,
  },
  legal: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
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

const MUTED_HI = 'rgba(20,19,16,0.72)';
