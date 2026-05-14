import { Tabs, router } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
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

// Leading edge springs fast, trailing edge drags → squash-and-stretch feel
const FAST = { damping: 18, stiffness: 300, mass: 0.5,  useNativeDriver: false } as const;
const SLOW = { damping: 30, stiffness: 140, mass: 1.2,  useNativeDriver: false } as const;

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
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
          backgroundColor: c.paper,
          borderTopColor: c.lineSoft,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Sliding gradient accent line */}
      <View style={styles.indicatorTrack}>
        {tabWidth > 0 && (
          <Animated.View
            style={[styles.indicatorSlider, { left: leftEdge, width: indicatorWidth }]}
          >
            <LinearGradient
              colors={['rgba(232,84,26,0)', ORANGE, ORANGE, 'rgba(232,84,26,0)']}
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
