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
import { useEffect, useRef, Component, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

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
  container: { flex: 1, backgroundColor: '#f7f4ee', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:     { fontSize: 20, fontWeight: '800', color: '#141310', marginBottom: 10 },
  sub:       { fontSize: 13, color: 'rgba(20,19,16,0.55)', textAlign: 'center', marginBottom: 28 },
  btn:       { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f26a2a' },
  btnText:   { fontSize: 14, fontWeight: '800', color: '#fff' },
});

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  const notifListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Navigate on notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.screen) router.push(data.screen);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#141310' }} />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
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
            <Stack.Screen name="jobs/create" />
            <Stack.Screen name="jobs/[id]" />
            <Stack.Screen name="jobs/timer" />
            <Stack.Screen name="jobs/complete" />
            <Stack.Screen name="quotes/[id]" />
            <Stack.Screen name="quotes/create" />
            <Stack.Screen name="invoices/[id]" />
            <Stack.Screen name="invoices/create" />
            <Stack.Screen name="customers/index" />
            <Stack.Screen name="customers/new" />
            <Stack.Screen name="customers/[id]" />
            <Stack.Screen name="price-book" />
          </Stack>
        </QueryClientProvider>
      </GestureHandlerRootView>
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
