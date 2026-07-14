import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Home,
  FileText,
  Receipt,
  CalendarClock,
  Users,
  Settings,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

const SECTIONS = [
  {
    icon: Home,
    color: '#1f6feb',
    bg: '#eaf2ff',
    label: 'Home',
    route: '/(tabs)',
    description: "Today's jobs, pipeline value, weather, and quick-launch actions.",
  },
  {
    icon: FileText,
    color: '#f26a2a',
    bg: '#fff1eb',
    label: 'Quotes',
    route: '/(tabs)/quotes',
    description: 'Build accurate quotes in seconds using AI — just describe the job.',
  },
  {
    icon: Receipt,
    color: '#16a34a',
    bg: '#e5f6eb',
    label: 'Invoices',
    route: '/(tabs)/invoices',
    description: 'Convert quotes into invoices and collect payment via Stripe or Square.',
  },
  {
    icon: CalendarClock,
    color: '#7c3aed',
    bg: '#f3eeff',
    label: 'Schedule',
    route: '/(tabs)/calendar',
    description: 'See your week at a glance and manage follow-up reminders for leads.',
  },
  {
    icon: Users,
    color: '#0891b2',
    bg: '#e0f7fb',
    label: 'Customers',
    route: '/customers',
    description: 'Your full client list — contact details, job history, and messaging.',
  },
  {
    icon: Settings,
    color: '#64748b',
    bg: '#f1f5f9',
    label: 'Settings',
    route: '/(tabs)/profile',
    description: 'Business profile, logo, invoice branding, working hours, and payments.',
  },
];

export default function OnboardingScreen() {
  const { colors: c } = useTheme();

  const dismiss = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    // Land on home, then open the AI quote screen — the first thing a new
    // tradie should do is see a quote build itself
    router.replace('/(tabs)');
    router.push('/ai-chat' as any);
  };

  const goTo = async (route: string) => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    if (route.startsWith('/(tabs)')) {
      router.replace(route as any);
    } else {
      // Land on the tab root first so non-tab screens keep a back destination
      router.replace('/(tabs)');
      router.push(route as any);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.paper }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={[s.iconBadge, { backgroundColor: '#fff1eb' }]}>
            <Zap size={28} color={c.orange} strokeWidth={2.5} />
          </View>
          <Text style={[s.title, { color: c.ink, fontFamily: 'Manrope_800ExtraBold' }]}>
            Welcome to Vargen
          </Text>
          <Text style={[s.subtitle, { color: c.muted, fontFamily: 'Manrope_400Regular' }]}>
            Here's a quick tour of everything at your fingertips.
          </Text>
        </View>

        {/* Section cards */}
        <View style={s.cards}>
          {SECTIONS.map(({ icon: Icon, color, bg, label, description, route }) => (
            <TouchableOpacity
              key={label}
              style={[s.card, { backgroundColor: c.card, borderColor: c.lineSoft }]}
              activeOpacity={0.7}
              onPress={() => goTo(route)}
            >
              <View style={[s.cardIcon, { backgroundColor: bg }]}>
                <Icon size={22} color={color} strokeWidth={2} />
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardLabel, { color: c.ink, fontFamily: 'Manrope_700Bold' }]}>
                  {label}
                </Text>
                <Text style={[s.cardDesc, { color: c.muted, fontFamily: 'Manrope_400Regular' }]}>
                  {description}
                </Text>
              </View>
              <ChevronRight size={18} color={c.muted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: c.orange }]}
          activeOpacity={0.85}
          onPress={dismiss}
        >
          <Text style={[s.ctaText, { fontFamily: 'Manrope_800ExtraBold' }]}>
            Create your first quote
          </Text>
        </TouchableOpacity>

        <Text style={[s.hint, { color: c.muted, fontFamily: 'Manrope_400Regular' }]}>
          Tap any section above to jump straight in
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 32, paddingTop: 12 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, opacity: 0.8 },

  cards: { gap: 12, marginBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 15, marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18, opacity: 0.85 },

  cta: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: { fontSize: 16, color: '#fff' },
  hint: { textAlign: 'center', fontSize: 13, opacity: 0.7 },
});
