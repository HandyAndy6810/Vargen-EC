import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import * as Haptics from 'expo-haptics';
import { Home, FileText, Receipt, Calendar, User } from 'lucide-react-native';
const ORANGE = '#f26a2a';
const INK = '#141310';
const MUTED = 'rgba(20,19,16,0.50)';

const TABS = [
  { name: 'index',    label: 'Home',     Icon: Home },
  { name: 'quotes',   label: 'Quotes',   Icon: FileText },
  { name: 'invoices', label: 'Invoices', Icon: Receipt },
  { name: 'calendar', label: 'Calendar', Icon: Calendar },
  { name: 'profile',  label: 'Profile',  Icon: User },
];

function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.outer} pointerEvents="box-none">
      <BlurView intensity={100} tint="light" style={styles.blur}>
        <View style={styles.specular} pointerEvents="none" />
        <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {TABS.map((tab, i) => {
            const isFocused = state.index === i;
            const color = isFocused ? ORANGE : MUTED;
            return (
              <Pressable
                key={tab.name}
                style={[styles.tabItem, isFocused && styles.tabItemActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: state.routes[i].key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(tab.name as never);
                  }
                }}
              >
                <tab.Icon size={20} color={color} strokeWidth={2.1} />
                {isFocused && (
                  <Text style={styles.tabLabel}>{tab.label}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: '#f7f4ee' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="quotes" />
      <Tabs.Screen name="invoices" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blur: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    shadowColor: INK,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  specular: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 1,
  },
  inner: {
    flexDirection: 'row',
    padding: 5,
    paddingTop: 8,
    backgroundColor: 'rgba(247,244,238,0.72)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 7,
    paddingHorizontal: 4,
    borderRadius: 24,
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    letterSpacing: 0.3,
  },
});
