import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import {
  FileText, Receipt, Calendar, MapPin, Sparkles,
  Bell, MessageSquare, Sun, Settings, LogOut, ChevronRight, Pencil,
} from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const RED         = '#d23b3b';
const RED_SOFT    = '#fde5e5';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';

type SettingItem = {
  icon: any;
  label: string;
  sub?: string;
  badge?: string;
  danger?: boolean;
  onPress?: () => void;
};

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Text style={s.groupEyebrow}>{title}</Text>
      <View style={s.groupCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            activeOpacity={0.7}
            style={[s.groupRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
          >
            <View style={[s.groupIcon, { backgroundColor: item.danger ? RED_SOFT : PAPER_DEEP }]}>
              <item.icon size={16} color={item.danger ? RED : INK} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.groupLabel, item.danger && { color: RED }]}>{item.label}</Text>
                {item.badge && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: ORANGE_SOFT }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: ORANGE_DEEP, letterSpacing: 0.5 }}>{item.badge}</Text>
                  </View>
                )}
              </View>
              {item.sub ? <Text style={s.groupSub}>{item.sub}</Text> : null}
            </View>
            <ChevronRight size={14} color={MUTED} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth() as any;
  const firstName = user?.firstName || 'Andy';
  const lastName = user?.lastName || 'Hollister';
  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'AH';
  const fullName = `${firstName} ${lastName}`.trim() || 'Andy Hollister';

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout?.() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Hero */}
        <View style={s.heroSection}>
          <View style={s.heroGlow} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, position: 'relative' }}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name}>{fullName}</Text>
              <Text style={s.biz}>Vargenezey Electrical · ABN 52 889 221 143</Text>
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>✦ Pro plan</Text>
              </View>
            </View>
            <TouchableOpacity style={s.editBtn} activeOpacity={0.7}>
              <Pencil size={18} color={INK} strokeWidth={2.1} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 8 }}>
          {[
            { l: 'Jobs this month', v: '42' },
            { l: 'Revenue',         v: '$14.2k' },
            { l: 'On-time',         v: '96%' },
          ].map(stat => (
            <View key={stat.l} style={s.statCard}>
              <Text style={s.statVal}>{stat.v}</Text>
              <Text style={s.statLabel}>{stat.l}</Text>
            </View>
          ))}
        </View>

        <SettingsGroup title="Business" items={[
          { icon: FileText,  label: 'Business details',       sub: 'ABN, logo, invoice footer' },
          { icon: Receipt,   label: 'Invoice & quote settings', sub: 'Numbering, GST, payment terms' },
          { icon: Calendar,  label: 'Working hours',          sub: 'Mon–Fri · 7:30 am – 4:00 pm' },
          { icon: MapPin,    label: 'Service area',           sub: 'Inner West Sydney · 15 km' },
        ]} />

        <SettingsGroup title="AI & automations" items={[
          { icon: Sparkles,       label: 'AI quoting',    sub: 'Tone, default margins, templates', badge: 'Pro' },
          { icon: Bell,           label: 'Reminders',     sub: 'Overdue nudges, review requests' },
          { icon: MessageSquare,  label: 'SMS templates', sub: '4 templates · 1 draft' },
        ]} />

        <SettingsGroup title="Preferences" items={[
          { icon: Sun,  label: 'Appearance',    sub: 'Light · system default' },
          { icon: Bell, label: 'Notifications', sub: 'Quotes, invoices, reviews' },
        ]} />

        <SettingsGroup title="Account" items={[
          { icon: Settings, label: 'Subscription', sub: 'Pro · $39/mo · next renewal 14 May' },
          { icon: LogOut,   label: 'Sign out',     danger: true, onPress: handleLogout },
        ]} />

        <View style={{ paddingTop: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: MUTED, fontFamily: 'Manrope_600SemiBold' }}>
            Admin for people who'd rather be on the tools.
          </Text>
          <Text style={{ fontSize: 10, color: MUTED, fontFamily: 'Manrope_800ExtraBold', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            VARGENEZEY · v1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${ORANGE}33`,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  avatarText: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
  },
  biz: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  proBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: ORANGE_SOFT,
  },
  proBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  statVal: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  groupEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  groupSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
});
