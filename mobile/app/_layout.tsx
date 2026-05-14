import '../global.css';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useRef, useState, Component, type ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { loadCachedUser } from '@/lib/auth-cache';

// ── Push notification handler config ────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Error boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={eb.container}>
        <Text style={eb.title}>Something went wrong</Text>
        <Text style={eb.sub}>{this.state.message}</Text>
        <TouchableOpacity style={eb.btn} onPress={() => this.setState({ hasError: false, message: '' })}>
          <Text style={eb.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF8', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:     { fontSize: 20, fontWeight: '800', color: '#1A0E06', marginBottom: 10 },
  sub:       { fontSize: 13, color: 'rgba(26,14,6,0.55)', textAlign: 'center', marginBottom: 28 },
  btn:       { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FF5C00' },
  btnText:   { fontSize: 14, fontWeight: '800', color: '#fff' },
});

// ── Themed status bar (reads from ThemeContext) ───────────────────────────────
function ThemedStatusBar() {
  const { colors } = useTheme();
  return <StatusBar style={colors.statusBar} />;
}

// ── Inner app (gates on fonts + theme ready + auth cache) ────────────────────
function AppContent({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready: themeReady, colors } = useTheme();
  const [authReady, setAuthReady] = useState(false);
  const notifListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Pre-populate auth cache before any screen renders so previously-logged-in
  // users bypass the login screen instantly, even when the server is unreachable.
  useEffect(() => {
    loadCachedUser()
      .then((user) => {
        if (user) queryClient.setQueryData(['/api/auth/user'], user);
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    registerForPushNotifications();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.screen) router.push(data.screen);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded || !themeReady || !authReady) return <View style={{ flex: 1, backgroundColor: '#0F0905' }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <QueryClientProvider client={queryClient}>
        <ThemedStatusBar />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="ai-chat"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="jobs/list" />
          <Stack.Screen name="jobs/[id]" />
          <Stack.Screen name="jobs/timer" />
          <Stack.Screen name="jobs/complete" />
          <Stack.Screen name="quotes/[id]" />
          <Stack.Screen name="quotes/create" />
          <Stack.Screen name="invoices/[id]" />
          <Stack.Screen name="invoices/create" />
          <Stack.Screen name="settings/edit-profile" />
          <Stack.Screen name="settings/business-details" />
          <Stack.Screen name="settings/invoice-settings" />
          <Stack.Screen name="settings/working-hours" />
          <Stack.Screen name="settings/service-area" />
          <Stack.Screen name="settings/ai-quoting" />
          <Stack.Screen name="settings/reminders" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="settings/sms-templates" />
          <Stack.Screen name="settings/subscription" />
          <Stack.Screen name="settings/bank" />
          <Stack.Screen name="settings/payment-terms" />
          <Stack.Screen name="settings/widgets" />
          <Stack.Screen name="customers/index" />
          <Stack.Screen name="customers/[id]" />
          <Stack.Screen name="customers/new" />
          <Stack.Screen name="customers/messages" />
          <Stack.Screen name="customers/compose" />
          <Stack.Screen name="receipts/index" />
          <Stack.Screen name="receipts/scan" />
          <Stack.Screen name="jobs/create" />
          <Stack.Screen name="price-book" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent fontsLoaded={fontsLoaded ?? false} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    await Notifications.getExpoPushTokenAsync();
  } catch {
    // Silently fail — push notifications are non-critical
  }
}
