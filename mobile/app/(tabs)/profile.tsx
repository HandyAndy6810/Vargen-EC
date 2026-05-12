import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, type Colors, type ThemeMode } from '@/hooks/use-theme';
import { useXeroStatus, useXeroDisconnect, useXeroSyncAll } from '@/hooks/use-xero';
import { API_BASE_URL } from '@/lib/api';
import { useCustomers } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useInvoices } from '@/hooks/use-invoices';
import { isThisMonth } from 'date-fns';
import {
  FileText, Receipt, Calendar, MapPin, Sparkles,
  Bell, MessageSquare, Sun, Moon, Smartphone, Settings, LogOut, ChevronRight, Pencil,
  Link, RefreshCw, Unlink, CheckCircle, BookOpen, Users, Building2, LayoutGrid, Check,
} from 'lucide-react-native';

// ── Style factory ─────────────────────────────────────────────────────────────
function makeStyles(c: Colors) {
  return StyleSheet.create({
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
      backgroundColor: `${c.orange}33`,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.ink,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.orange,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
    avatarText: {
      fontSize: 26,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.orange,
    },
    name: {
      fontSize: 22,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.ink,
      letterSpacing: -0.5,
    },
    biz: {
      fontSize: 12,
      fontFamily: 'Manrope_500Medium',
      color: c.muted,
      marginTop: 2,
    },
    proBadge: {
      marginTop: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.orangeSoft,
    },
    proBadgeText: {
      fontSize: 9.5,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.orangeDeep,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lineSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statCard: {
      flex: 1,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lineSoft,
    },
    statVal: {
      fontSize: 20,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.ink,
      letterSpacing: -0.4,
      lineHeight: 22,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.muted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    groupEyebrow: {
      fontSize: 10,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.muted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    groupCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lineSoft,
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
      color: c.ink,
    },
    groupSub: {
      fontSize: 11,
      fontFamily: 'Manrope_500Medium',
      color: c.muted,
      marginTop: 2,
    },
  });
}

function makeXeroStyles(c: Colors) {
  return StyleSheet.create({
    connectBtn: {
      height: 40,
      borderRadius: 12,
      backgroundColor: c.teal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectBtnText: {
      fontSize: 13,
      fontFamily: 'Manrope_800ExtraBold',
      color: '#fff',
      letterSpacing: 0.2,
    },
    actionBtn: {
      height: 36,
      borderRadius: 10,
      backgroundColor: c.paperDeep,
      borderWidth: 1,
      borderColor: c.lineSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
    },
    actionBtnText: {
      fontSize: 12,
      fontFamily: 'Manrope_700Bold',
      color: c.ink,
    },
  });
}

// ── Settings group ────────────────────────────────────────────────────────────
type SettingItem = {
  icon: any;
  label: string;
  sub?: string;
  badge?: string;
  danger?: boolean;
  onPress?: () => void;
};

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Text style={s.groupEyebrow}>{title}</Text>
      <View style={s.groupCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            activeOpacity={0.7}
            style={[s.groupRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}
          >
            <View style={[s.groupIcon, { backgroundColor: item.danger ? c.redSoft : c.paperDeep }]}>
              <item.icon size={16} color={item.danger ? c.red : c.ink} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.groupLabel, item.danger && { color: c.red }]}>{item.label}</Text>
                {item.badge && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: c.orangeSoft }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep, letterSpacing: 0.5 }}>{item.badge}</Text>
                  </View>
                )}
              </View>
              {item.sub ? <Text style={s.groupSub}>{item.sub}</Text> : null}
            </View>
            <ChevronRight size={14} color={c.muted} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Xero section ──────────────────────────────────────────────────────────────
function XeroSection() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const xs = makeXeroStyles(c);
  const { data: xero, isLoading } = useXeroStatus();
  const disconnect = useXeroDisconnect();
  const syncAll = useXeroSyncAll();

  const handleConnect = () => Linking.openURL(`${API_BASE_URL}/api/xero/connect`);

  const handleDisconnect = () => {
    Alert.alert('Disconnect Xero', 'Remove the Xero connection? Customer and invoice sync will stop.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => disconnect.mutate() },
    ]);
  };

  const handleSyncAll = () => {
    syncAll.mutate(undefined, {
      onSuccess: (r) => Alert.alert('Sync complete', `${r.synced} customers synced${r.failed > 0 ? `, ${r.failed} failed` : ''}.`),
      onError: () => Alert.alert('Sync failed', 'Could not reach Xero. Try again.'),
    });
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Text style={s.groupEyebrow}>Integrations</Text>
      <View style={s.groupCard}>
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <View style={[s.groupIcon, { backgroundColor: isLoading ? c.paperDeep : xero?.connected ? c.tealSoft : c.paperDeep }]}>
              {isLoading
                ? <ActivityIndicator size="small" color={c.teal} />
                : <Link size={16} color={xero?.connected ? c.teal : c.ink} strokeWidth={2.1} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.groupLabel}>Xero</Text>
              <Text style={s.groupSub}>
                {isLoading ? 'Checking…' : xero?.connected ? `Connected · ${xero.tenantName || 'your org'}` : 'Connect your accounting'}
              </Text>
            </View>
            {xero?.connected && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.greenSoft }}>
                <CheckCircle size={12} color={c.green} strokeWidth={2.5} />
              </View>
            )}
          </View>

          {xero?.connected ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleSyncAll}
                activeOpacity={0.7}
                disabled={syncAll.isPending}
                style={[xs.actionBtn, { flex: 1 }]}
              >
                {syncAll.isPending
                  ? <ActivityIndicator size="small" color={c.ink} />
                  : <RefreshCw size={13} color={c.ink} strokeWidth={2.2} />}
                <Text style={xs.actionBtnText}>Sync all customers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDisconnect}
                activeOpacity={0.7}
                style={[xs.actionBtn, { backgroundColor: c.redSoft, borderColor: 'transparent' }]}
              >
                <Unlink size={13} color={c.red} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleConnect} activeOpacity={0.8} style={xs.connectBtn}>
              <Text style={xs.connectBtnText}>Connect to Xero</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Appearance modal ──────────────────────────────────────────────────────────
const APPEARANCE_OPTIONS: { value: ThemeMode; label: string; desc: string; Icon: any }[] = [
  { value: 'system', label: 'System default', desc: 'Follows your device setting', Icon: Smartphone },
  { value: 'light',  label: 'Light',          desc: 'Always use light mode',       Icon: Sun },
  { value: 'dark',   label: 'Dark',           desc: 'Always use dark mode',        Icon: Moon },
];

function AppearanceModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.lineSoft, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginBottom: 4 }}>Appearance</Text>
        <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginBottom: 8 }}>Choose how Vargen looks on your device</Text>
        {APPEARANCE_OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => { setMode(opt.value); onClose(); }}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.lineSoft }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: mode === opt.value ? c.orangeSoft : c.paperDeep, alignItems: 'center', justifyContent: 'center' }}>
              <opt.Icon size={18} color={mode === opt.value ? c.orange : c.muted} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink }}>{opt.label}</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted }}>{opt.desc}</Text>
            </View>
            {mode === opt.value && <Check size={18} color={c.orange} strokeWidth={2.5} />}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

// ── Profile screen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors: c, mode } = useTheme();
  const { user, logout } = useAuth() as any;
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const { data: invoices } = useInvoices();

  const jobsThisMonth = ((jobs as any[]) || [])
    .filter((j: any) => j.scheduledDate && isThisMonth(new Date(j.scheduledDate))).length;
  const revenueLabel = (() => {
    const total = ((invoices as any[]) || [])
      .filter((inv: any) => inv.status === 'paid' && inv.createdAt && isThisMonth(new Date(inv.createdAt)))
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || '0'), 0);
    return total >= 1000 ? `$${(total / 1000).toFixed(1)}k` : `$${total}`;
  })();
  const [showAppearance, setShowAppearance] = useState(false);

  const firstName = user?.firstName || 'Andy';
  const lastName  = user?.lastName  || 'Hollister';
  const initials  = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'AH';
  const fullName  = `${firstName} ${lastName}`.trim() || 'Andy Hollister';

  const appearanceSub = mode === 'system' ? 'System default' : mode === 'light' ? 'Light' : 'Dark';

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout?.() },
    ]);
  };

  const s = makeStyles(c);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
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
              <Text style={s.biz}>{user?.email || ''}</Text>
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>✦ Pro plan</Text>
              </View>
            </View>
            <TouchableOpacity style={s.editBtn} activeOpacity={0.7} onPress={() => router.push('/settings/edit-profile' as any)}>
              <Pencil size={18} color={c.ink} strokeWidth={2.1} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 8 }}>
          {[
            { l: 'Jobs this month', v: String(jobsThisMonth) },
            { l: 'Revenue this mo', v: revenueLabel },
            { l: 'Customers',       v: String((customers as any[])?.length ?? 0) },
          ].map(stat => (
            <View key={stat.l} style={s.statCard}>
              <Text style={s.statVal}>{stat.v}</Text>
              <Text style={s.statLabel}>{stat.l}</Text>
            </View>
          ))}
        </View>

        <SettingsGroup title="Customers" items={[
          {
            icon: Users,
            label: 'Manage customers',
            sub: `${(customers as any[])?.length ?? 0} on file`,
            onPress: () => router.push('/customers' as any),
          },
        ]} />

        <SettingsGroup title="Business" items={[
          { icon: FileText,  label: 'Business details',         sub: 'ABN, logo, invoice footer',       onPress: () => router.push('/settings/business-details' as any) },
          { icon: Receipt,   label: 'Invoice & quote settings', sub: 'Numbering, GST, payment terms',   onPress: () => router.push('/settings/invoice-settings' as any) },
          { icon: Calendar,  label: 'Working hours',            sub: 'Mon–Fri · 7:30 am – 4:00 pm',    onPress: () => router.push('/settings/working-hours' as any) },
          { icon: MapPin,    label: 'Service area',             sub: 'Inner West Sydney · 15 km',       onPress: () => router.push('/settings/service-area' as any) },
        ]} />

        <SettingsGroup title="AI & automations" items={[
          { icon: Sparkles,      label: 'AI quoting',    sub: 'Tone, default margins, templates', badge: 'Pro', onPress: () => router.push('/settings/ai-quoting' as any) },
          { icon: BookOpen,      label: 'Price book',    sub: 'Your material prices for AI quotes',             onPress: () => router.push('/price-book' as any) },
          { icon: Bell,          label: 'Reminders',     sub: 'Overdue nudges, review requests',                onPress: () => router.push('/settings/reminders' as any) },
          { icon: MessageSquare, label: 'SMS templates', sub: '3 default templates',                            onPress: () => router.push('/settings/sms-templates' as any) },
        ]} />

        <XeroSection />

        <SettingsGroup title="Preferences" items={[
          { icon: Sun,         label: 'Appearance',    sub: appearanceSub,              onPress: () => setShowAppearance(true) },
          { icon: LayoutGrid,  label: 'Home widgets',  sub: 'Reorder your dashboard',   onPress: () => router.push('/settings/widgets' as any) },
          { icon: Bell,        label: 'Notifications', sub: 'Quotes, invoices, reviews', onPress: () => router.push('/settings/notifications' as any) },
        ]} />

        <SettingsGroup title="Account" items={[
          { icon: Settings, label: 'Subscription', sub: 'Pro · $39/mo · next renewal 14 May', onPress: () => router.push('/settings/subscription' as any) },
          { icon: LogOut,   label: 'Sign out',     danger: true,                               onPress: handleLogout },
        ]} />

        <View style={{ paddingTop: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_600SemiBold' }}>
            Admin for people who'd rather be on the tools.
          </Text>
          <Text style={{ fontSize: 10, color: c.muted, fontFamily: 'Manrope_800ExtraBold', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            VARGENEZEY · v1.0
          </Text>
        </View>
      </ScrollView>

      <AppearanceModal visible={showAppearance} onClose={() => setShowAppearance(false)} />
    </SafeAreaView>
  );
}
