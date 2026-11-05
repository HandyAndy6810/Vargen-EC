import '../global.css';
import { Stack } from 'expo-router';
import { onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  HostGrotesk_300Light,
  HostGrotesk_400Regular,
  HostGrotesk_500Medium,
  HostGrotesk_600SemiBold,
  HostGrotesk_700Bold,
  HostGrotesk_800ExtraBold,
} from '@expo-google-fonts/host-grotesk';
import { View, Text, TouchableOpacity, StyleSheet, Platform, AppState } from 'react-native';
import { useEffect, useRef, useState, Component, type ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { loadCachedUser } from '@/lib/auth-cache';
import { Snackbar } from '@/components/Snackbar';
import { persistOptions } from '@/lib/query-persist';
import { syncOutbox } from '@/lib/quote-outbox';
import * as SplashScreen from 'expo-splash-screen';
import { IntroHost } from '@/components/IntroOverlay';

// The native splash (app.json, expo-splash-screen) stays up until the intro
// overlay has drawn the identical frame over it (components/IntroOverlay.tsx).
// Failsafe: whatever happens (a crash before the overlay mounts, say), it goes
// after 6 s, so the app can never be stuck behind the splash.
SplashScreen.preventAutoHideAsync().catch(() => {});
setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, 6000);

// ── Push notification handler config ────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
    SplashScreen.hideAsync().catch(() => {});
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
  container: { flex: 1, backgroundColor: '#F2F2F0', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:     { fontSize: 20, fontWeight: '800', color: '#1C1D21', marginBottom: 10 },
  sub:       { fontSize: 13, color: 'rgba(28,29,33,0.66)', textAlign: 'center', marginBottom: 28 },
  btn:       { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f26a2a' },
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

  // Quotes saved offline go up whenever there's a chance they can: the app coming
  // back to the foreground and the connection returning. (Also once the offline
  // copy has been restored, below.)
  useEffect(() => {
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncOutbox();
    });
    const onlineUnsub = onlineManager.subscribe((online) => {
      if (online) syncOutbox();
    });
    return () => { appSub.remove(); onlineUnsub(); };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerForPushNotifications();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      // Only navigate to known route prefixes — payload is server-controlled
      // but defense-in-depth against a malformed push
      const ALLOWED = ['/quotes', '/invoices', '/jobs', '/customers', '/(tabs)', '/calendar', '/receipts'];
      if (typeof data?.screen === 'string' && ALLOWED.some((p) => data.screen.startsWith(p))) {
        router.push(data.screen);
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  // Still behind the native splash (preventAutoHideAsync above).
  if (!fontsLoaded || !themeReady || !authReady) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      {/* The tradie's quotes, customers, jobs and invoices are restored from the
          phone first (lib/query-persist.ts), so they open with no signal. */}
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => { syncOutbox(); }}
      >
        <ThemedStatusBar />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="jobs/list" />
          <Stack.Screen name="jobs/[id]" />
          <Stack.Screen name="jobs/complete" />
          <Stack.Screen name="quotes/[id]" />
          <Stack.Screen name="quotes/unsynced/[clientId]" />
          <Stack.Screen name="quotes/create" />
          <Stack.Screen name="invoices/[id]" />
          <Stack.Screen name="invoices/create" />
          <Stack.Screen name="settings/business-details" />
          <Stack.Screen name="settings/invoice-settings" />
          <Stack.Screen name="settings/working-hours" />
          <Stack.Screen name="settings/service-area" />
          <Stack.Screen name="settings/ai-quoting" />
          <Stack.Screen name="settings/reminders" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="settings/sms-templates" />
          <Stack.Screen name="settings/subscription" />
          <Stack.Screen name="settings/widgets" />
          <Stack.Screen name="settings/delete-account" />
          <Stack.Screen name="customers/index" />
          <Stack.Screen name="customers/[id]" />
          <Stack.Screen name="customers/new" />
          <Stack.Screen name="customers/messages" />
          <Stack.Screen name="customers/compose" />
          <Stack.Screen name="receipts/index" />
          <Stack.Screen name="receipts/scan" />
          <Stack.Screen name="receipts/[id]" />
          <Stack.Screen name="jobs/create" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <Snackbar />
        {/* Cold start only: the splash bolt flies into Home's Zap button. */}
        <IntroHost />
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HostGrotesk_300Light,
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
    HostGrotesk_700Bold,
    HostGrotesk_800ExtraBold,
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
    const token = await Notifications.getExpoPushTokenAsync();
    if (token?.data) {
      // Register with the backend so the server can actually target this device
      const { apiRequest } = await import('@/lib/api');
      await apiRequest('PATCH', '/api/settings', { expoPushToken: token.data });
    }
  } catch {
    // Silently fail — push notifications are non-critical
  }
}
