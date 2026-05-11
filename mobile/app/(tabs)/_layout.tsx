import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const ORANGE = '#E8541A';

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: c.paper,
        borderTopColor: c.lineSoft,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
      },
    ]}>
      <LinearGradient
        colors={[ORANGE, isDark ? 'rgba(232,84,26,0.08)' : 'rgba(232,84,26,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
      <View style={styles.tabsRow}>
        {TABS.map((tab, i) => {
          const isFocused = state.index === i;
          const color = isFocused ? ORANGE : c.muted;
          return (
            <Pressable
              key={tab.name}
              style={styles.tabItem}
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
              <tab.Icon size={24} color={color} strokeWidth={2} />
              <Text style={[
                styles.tabLabel,
                {
                  color,
                  fontFamily: isFocused ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                },
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors: c } = useTheme();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: c.paper }}
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
  container: {
    borderTopWidth: 1,
  },
  accentLine: {
    height: 3,
    borderRadius: 2,
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
  },
});
