import { Tabs, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth > 0 ? containerWidth / TABS.length : 0;
  const animatedIndex = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [state.index]);

  const translateX = animatedIndex.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * tabWidth),
  });

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
            style={[styles.indicatorSlider, { width: tabWidth, transform: [{ translateX }] }]}
          >
            <LinearGradient
              colors={[ORANGE, isDark ? 'rgba(232,84,26,0.0)' : 'rgba(232,84,26,0.0)']}
              start={{ x: 0.1, y: 0 }}
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
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
