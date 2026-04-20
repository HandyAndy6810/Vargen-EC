import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/hooks/use-auth';
import * as Haptics from 'expo-haptics';
import { Home, Briefcase, FileText, Users, Receipt } from 'lucide-react-native';

const BRAND = '#ea580c';
const INK   = '#1c1917';
const MUTED = '#a8a29e';

function FloatingTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarOuter} pointerEvents="box-none">
      <BlurView intensity={60} tint="light" style={styles.blur}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate({ name: route.name, merge: true });
              }
            };

            const Icon = options.tabBarIcon?.({ focused, color: focused ? BRAND : MUTED, size: 22 });

            return (
              <View key={route.key} style={[styles.tab, focused && styles.tabActive]}>
                <View onTouchEnd={onPress} style={styles.tabPressable}>
                  {Icon}
                </View>
              </View>
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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <Home size={size} color={focused ? BRAND : MUTED} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, size }) => (
            <Briefcase size={size} color={focused ? BRAND : MUTED} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: 'Quotes',
          tabBarIcon: ({ focused, size }) => (
            <FileText size={size} color={focused ? BRAND : MUTED} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ focused, size }) => (
            <Users size={size} color={focused ? BRAND : MUTED} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused, size }) => (
            <Receipt size={size} color={focused ? BRAND : MUTED} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 20,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  blur: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  tab: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(234,88,12,0.10)',
  },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
  },
});
