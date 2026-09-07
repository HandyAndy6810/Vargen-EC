import { Tabs, router } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { TabBarBackground } from '@/components/TabBarBackground';
import { TabIcon, type TabIconSpec } from '@/components/TabIcon';
import { hapticSelect } from '@/lib/haptics';
import { Home, FileText, Receipt, CalendarClock, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TABS: { name: string; label: string; icon: TabIconSpec }[] = [
  { name: 'index',    label: 'Home',     icon: { symbol: 'house',              symbolActive: 'house.fill',              Fallback: Home } },
  { name: 'quotes',   label: 'Quotes',   icon: { symbol: 'doc.text',           symbolActive: 'doc.text.fill',           Fallback: FileText } },
  { name: 'invoices', label: 'Invoices', icon: { symbol: 'dollarsign.square',  symbolActive: 'dollarsign.square.fill',  Fallback: Receipt } },
  { name: 'calendar', label: 'Schedule', icon: { symbol: 'calendar',           symbolActive: 'calendar',                Fallback: CalendarClock } },
  { name: 'profile',  label: 'Profile',  icon: { symbol: 'person.crop.circle', symbolActive: 'person.crop.circle.fill', Fallback: User } },
];


// Leading edge springs fast, trailing edge drags → squash-and-stretch feel
const FAST = { damping: 18, stiffness: 300, mass: 0.5,  useNativeDriver: false } as const;
const SLOW = { damping: 30, stiffness: 140, mass: 1.2,  useNativeDriver: false } as const;

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const iconInactive = isDark ? '#82868C' : '#6B6460';
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth > 0 ? containerWidth / TABS.length : 0;

  const leftEdge     = useRef(new Animated.Value(0)).current;
  const rightEdge    = useRef(new Animated.Value(0)).current;
  const prevIndex    = useRef(state.index);
  const prevTabWidth = useRef(0);

  // Snap to correct position before first paint so indicator is visible immediately
  useLayoutEffect(() => {
    if (tabWidth === 0) return;
    if (prevTabWidth.current !== tabWidth) {
      leftEdge.setValue(state.index * tabWidth);
      rightEdge.setValue(state.index * tabWidth + tabWidth);
      prevTabWidth.current = tabWidth;
    }
  }, [tabWidth]);

  // Direction-aware spring on tab change
  useEffect(() => {
    if (tabWidth === 0) return;
    const prev = prevIndex.current;
    const curr = state.index;
    if (prev === curr) return;
    prevIndex.current = curr;

    const newLeft     = curr * tabWidth;
    const newRight    = curr * tabWidth + tabWidth;
    const movingRight = curr > prev;

    Animated.parallel([
      Animated.spring(movingRight ? rightEdge : leftEdge,  { toValue: movingRight ? newRight : newLeft,  ...FAST }),
      Animated.spring(movingRight ? leftEdge  : rightEdge, { toValue: movingRight ? newLeft  : newRight, ...SLOW }),
    ]).start();
  }, [state.index, tabWidth]);

  // Memoize so the same Animated node is reused across renders
  const indicatorWidth = useMemo(() => Animated.subtract(rightEdge, leftEdge), []);

  return (
    <View
      style={[
        styles.container,
        {
          // Absolute so the screens run full height and their content passes UNDER
          // the bar. Glass over an opaque page is just a grey rectangle — the
          // material only means anything when there's something moving behind it.
          // Every tab screen already reserves 120-130px at the bottom for this.
          borderTopColor: c.lineSoft,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <TabBarBackground />

      {/* Sliding gradient accent line */}
      <View style={styles.indicatorTrack}>
        {tabWidth > 0 && (
          <Animated.View
            style={[styles.indicatorSlider, { left: leftEdge, width: indicatorWidth }]}
          >
            <LinearGradient
              colors={['rgba(242,106,42,0)', c.orange, c.orange, 'rgba(242,106,42,0)']}
              locations={[0, 0.25, 0.75, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />
          </Animated.View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab, i) => {
          const isFocused = state.index === i;
          const color = isFocused ? c.orange : iconInactive;
          return (
            <Pressable
              key={tab.name}
              style={styles.tabItem}
              onPress={() => {
                hapticSelect();
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
              <TabIcon spec={tab.icon} focused={isFocused} color={color} size={26} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontFamily: isFocused ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                  },
                ]}
              >
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
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    AsyncStorage.getItem('onboarding_seen').then((seen) => {
      if (!seen) router.replace('/onboarding');
    });
  }, [isAuthenticated, isLoading]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.paper } }}
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Clips the material to the bar so the blur can't bleed past its own edge.
    overflow: 'hidden',
  },
  indicatorTrack: {
    height: 3,
    overflow: 'hidden',
  },
  indicatorSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
  },
  accentLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
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
