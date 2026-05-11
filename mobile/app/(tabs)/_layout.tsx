import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';
import { Home, FileText, Receipt, Calendar, User } from 'lucide-react-native';

const TABS = [
  { name: 'index',    label: 'Home',     Icon: Home },
  { name: 'quotes',   label: 'Quotes',   Icon: FileText },
  { name: 'invoices', label: 'Invoices', Icon: Receipt },
  { name: 'calendar', label: 'Calendar', Icon: Calendar },
  { name: 'profile',  label: 'Profile',  Icon: User },
];

function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.outer, { bottom: 22 + (insets.bottom > 20 ? insets.bottom - 20 : 0) }]} pointerEvents="box-none">
      <BlurView
        intensity={90}
        tint={colors.blurTint}
        style={[
          styles.blur,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
            shadowColor: colors.ink,
          },
        ]}
      >
        {!isDark && <View style={styles.specular} pointerEvents="none" />}
        <View
          style={[
            styles.inner,
            { backgroundColor: isDark ? 'rgba(20,19,16,0.7)' : 'rgba(255,255,255,0.6)' },
          ]}
        >
          {TABS.map((tab, i) => {
            const isFocused = state.index === i;
            const color = isFocused ? colors.orange : colors.muted;
            return (
              <Pressable
                key={tab.name}
                style={[
                  styles.tabItem,
                  isFocused && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.92)',
                    shadowColor: colors.ink,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 4,
                    borderWidth: 0.5,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)',
                    borderRadius: 24,
                  },
                ]}
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
                <tab.Icon size={22} color={color} strokeWidth={2.1} />
                {isFocused && (
                  <Text style={[styles.tabLabel, { color: colors.orange }]}>{tab.label}</Text>
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
    borderRadius: 28,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
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
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.3,
  },
});
