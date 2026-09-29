import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, type Colors, type ThemeMode } from '@/hooks/use-theme';
import { BottomSheetModal } from '@/components/BottomSheetModal';
import { useXeroStatus, useXeroDisconnect, useXeroSyncAll } from '@/hooks/use-xero';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { useCustomers } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useInvoices } from '@/hooks/use-invoices';
import { isThisMonth } from 'date-fns';
import {
  Receipt, Sparkles, Palette, Bell, Sun, Moon, Smartphone, LogOut,
  ChevronRight, Pencil, Link, RefreshCw, Unlink, CheckCircle, BookOpen, Users, Building2,
  LayoutGrid, Check, ScanLine, CreditCard,
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
    soonPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.paperDeep,
      borderWidth: 1,
      borderColor: c.lineSoft,
    },
    soonText: {
      fontSize: 10,
      fontFamily: 'Manrope_800ExtraBold',
      color: c.muted,
      letterSpacing: 0.3,
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
  const s = useMemo(() => makeStyles(c), [c]);
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

// ── Integrations ─────────────────────────────────────────────────────────────
// Xero and Stripe stay listed so they aren't forgotten, but neither can be
// switched on yet. Xero's connection is untested, and on connect it raises a
// Xero invoice for the FULL quote the moment one is accepted — which would
// double-bill alongside the app's deposit and balance invoices. It needs
// rebuilding around invoices before anyone connects it. An account that is
// somehow already connected keeps its sync and disconnect controls.
function IntegrationsSection() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const xs = makeXeroStyles(c);
  const { data: xero } = useXeroStatus();
  const disconnect = useXeroDisconnect();
  const syncAll = useXeroSyncAll();

  const handleDisconnect = () => {
    showConfirm({
      title: 'Disconnect Xero',
      message: 'Remove the Xero connection? Customer and invoice sync will stop.',
      confirmLabel: 'Disconnect',
      destructive: true,
      onConfirm: () => disconnect.mutate(),
    });
  };

  const handleSyncAll = () => {
    syncAll.mutate(undefined, {
      onSuccess: (r) => showAlert('Sync complete', `${r.synced} customers synced${r.failed > 0 ? `, ${r.failed} failed` : ''}.`),
      onError: () => showAlert('Sync failed', 'Could not reach Xero. Try again.'),
    });
  };

  const rows = [
    { key: 'xero',   Icon: Link,       label: 'Xero',   sub: xero?.connected ? `Connected · ${xero.tenantName || 'your org'}` : 'Send customers and invoices to your accounts' },
    { key: 'stripe', Icon: CreditCard, label: 'Stripe', sub: 'Let customers pay an invoice by card' },
  ];

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Text style={s.groupEyebrow}>Integrations</Text>
      <View style={s.groupCard}>
        {rows.map((r, i) => (
          <View key={r.key} style={[{ padding: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.groupIcon, { backgroundColor: c.paperDeep }]}>
                <r.Icon size={16} color={c.ink} strokeWidth={2.1} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.groupLabel}>{r.label}</Text>
                <Text style={s.groupSub}>{r.sub}</Text>
              </View>
              {r.key === 'xero' && xero?.connected ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.greenSoft }}>
                  <CheckCircle size={12} color={c.green} strokeWidth={2.5} />
                </View>
              ) : (
                <View style={xs.soonPill}>
                  <Text style={xs.soonText}>Coming soon</Text>
                </View>
              )}
            </View>

            {r.key === 'xero' && xero?.connected ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
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
            ) : null}
          </View>
        ))}
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
    <BottomSheetModal visible={visible} onClose={onClose} avoidKeyboard={false}>
      <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.lineSoft, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginBottom: 4 }}>Appearance</Text>
        <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginBottom: 8 }}>Choose how Vargen EZ looks on your device</Text>
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
    </BottomSheetModal>
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
    // Money that arrived this month: by the date it was paid, not the date the
    // invoice was written, and part-payments count for what was received. A
    // partial payment has no paid date yet, so it falls back to the invoice date.
    const total = ((invoices as any[]) || []).reduce((sum: number, inv: any) => {
      if (inv.status !== 'paid' && inv.status !== 'partial') return sum;
      const when = inv.paidDate || inv.createdAt;
      if (!when || !isThisMonth(new Date(when))) return sum;
      const received = inv.status === 'partial'
        ? parseFloat(inv.paidAmount || '0')
        : parseFloat(inv.totalAmount || '0');
      return sum + (Number.isFinite(received) ? received : 0);
    }, 0);
    return total >= 1000 ? `$${(total / 1000).toFixed(1)}k` : `$${Math.round(total)}`;
  })();
  const [showAppearance, setShowAppearance] = useState(false);

  const firstName = user?.firstName || '';
  const lastName  = user?.lastName  || '';
  const fullName  = `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'Your profile';
  const initials  = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase()
    || (user?.email?.[0] || '?').toUpperCase();

  const appearanceSub = mode === 'system' ? 'System default' : mode === 'light' ? 'Light' : 'Dark';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of Vargen EZ?')) logout?.();
    } else {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => logout?.() },
      ]);
    }
  };

  const s = useMemo(() => makeStyles(c), [c]);

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
            </View>
            <TouchableOpacity style={s.editBtn} activeOpacity={0.7} onPress={() => router.push('/settings/business-details' as any)}>
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

        {/* Every row here opens a screen that does what it says. Working hours,
            service area, notifications, SMS templates and subscription are not
            listed: their screens saved settings nothing ever read, or showed a
            mock-up. They come back when they're built. */}
        <SettingsGroup title="Business" items={[
          { icon: Building2, label: 'Business profile',    sub: 'Name, ABN, logo, bank details',     onPress: () => router.push('/settings/business-details' as any) },
          { icon: Receipt,   label: 'Quotes & invoices',   sub: 'Payment terms and GST',             onPress: () => router.push('/settings/invoice-settings' as any) },
          { icon: Palette,   label: 'Quote style',         sub: 'Layout, colour and font customers see', onPress: () => router.push('/settings/quote-styling' as any) },
          { icon: ScanLine,  label: 'Receipts & expenses', sub: 'What each job really cost you',     onPress: () => router.push('/receipts' as any) },
        ]} />

        <SettingsGroup title="Pricing" items={[
          { icon: Sparkles, label: 'AI quoting', sub: 'Trade, labour rate, markup, call-out fee', onPress: () => router.push('/settings/ai-quoting' as any) },
          { icon: BookOpen, label: 'Price book', sub: 'Your material prices for AI quotes',      onPress: () => router.push('/price-book' as any) },
        ]} />

        <SettingsGroup title="Follow-ups" items={[
          { icon: Bell, label: 'Follow-up reminders', sub: 'When to chase a quote that has gone quiet', onPress: () => router.push('/settings/reminders' as any) },
        ]} />

        <IntegrationsSection />

        <SettingsGroup title="Preferences" items={[
          { icon: Sun,        label: 'Appearance',   sub: appearanceSub,            onPress: () => setShowAppearance(true) },
          { icon: LayoutGrid, label: 'Home widgets', sub: 'Reorder your dashboard', onPress: () => router.push('/settings/widgets' as any) },
        ]} />

        <SettingsGroup title="Account" items={[
          { icon: LogOut, label: 'Sign out', danger: true, onPress: handleLogout },
        ]} />

        <View style={{ paddingTop: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_600SemiBold' }}>
            Admin for people who'd rather be on the tools.
          </Text>
          <Text style={{ fontSize: 10, color: c.muted, fontFamily: 'Manrope_800ExtraBold', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            VARGEN · v1.0
          </Text>
        </View>
      </ScrollView>

      <AppearanceModal visible={showAppearance} onClose={() => setShowAppearance(false)} />
    </SafeAreaView>
  );
}
