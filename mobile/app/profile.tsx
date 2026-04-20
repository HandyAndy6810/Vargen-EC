import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { ChevronLeft, ChevronRight, LogOut, Briefcase, FileText, Clock, MapPin, Sparkles, Bell, MessageSquare, Sun, Settings } from 'lucide-react-native';

const BRAND      = '#ea580c';
const INK        = '#1c1917';
const MUTED      = '#78716c';
const PAPER      = '#faf9f7';
const PAPER_DEEP = '#f0ece4';
const CARD       = '#ffffff';
const LINE       = '#e7e5e4';
const RED        = '#dc2626';
const RED_SOFT   = '#fee2e2';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();
  const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={INK} />
          <Text style={s.backText}>Home</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.sub}>Vargenezey Electrical · ABN 52 889 221 143</Text>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>✦ Pro plan</Text>
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={s.statsRow}>
          <StatCard label="Jobs this month" value="42" />
          <StatCard label="Revenue" value="$14.2k" />
          <StatCard label="On-time" value="96%" />
        </View>

        <SettingsGroup title="Business" items={[
          { icon: FileText,  label: 'Business details',        sub: 'ABN, logo, invoice footer' },
          { icon: Settings,  label: 'Invoice & quote settings', sub: 'Numbering, GST, payment terms' },
          { icon: Clock,     label: 'Working hours',           sub: 'Mon–Fri · 7:30 am – 4:00 pm' },
          { icon: MapPin,    label: 'Service area',            sub: 'Inner West Sydney · 15 km' },
        ]} />

        <SettingsGroup title="AI & automations" items={[
          { icon: Sparkles,      label: 'AI quoting',   sub: 'Tone, default margins, templates', badge: 'Pro' },
          { icon: Bell,          label: 'Reminders',    sub: 'Overdue nudges, review requests' },
          { icon: MessageSquare, label: 'SMS templates', sub: '4 templates · 1 draft' },
        ]} />

        <SettingsGroup title="Preferences" items={[
          { icon: Sun,  label: 'Appearance',   sub: 'Light · system default' },
          { icon: Bell, label: 'Notifications', sub: 'Quotes, invoices, reviews' },
        ]} />

        <SettingsGroup title="Account" items={[
          { icon: Settings, label: 'Subscription', sub: 'Pro · $39/mo' },
          { icon: LogOut,   label: 'Sign out',     sub: '', danger: true, onPress: handleLogout },
        ]} />

        <View style={{ alignItems: 'center', paddingTop: 28 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: MUTED }}>
            Admin for people who'd rather be on the tools.
          </Text>
          <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: MUTED, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            VARGENEZEY · v1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: LINE }}>
      <Text style={{ fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: -0.4, lineHeight: 24 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope_700Bold', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 6 }}>{label}</Text>
    </View>
  );
}

function SettingsGroup({ title, items }: { title: string; items: any[] }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: LINE, overflow: 'hidden' }}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: LINE }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.danger ? RED_SOFT : PAPER_DEEP, alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={16} color={item.danger ? RED : INK} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: item.danger ? RED : INK }}>{item.label}</Text>
                {item.badge && (
                  <View style={{ backgroundColor: PAPER_DEEP, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_700Bold', color: BRAND }}>{item.badge}</Text>
                  </View>
                )}
              </View>
              {item.sub ? <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 1 }}>{item.sub}</Text> : null}
            </View>
            {!item.danger && <ChevronRight size={14} color={MUTED} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: BRAND,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  proBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: PAPER_DEEP,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Manrope_800ExtraBold',
    color: BRAND,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
});
