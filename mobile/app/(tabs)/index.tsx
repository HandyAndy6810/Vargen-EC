import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { format, isToday } from 'date-fns';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useJobs } from '@/hooks/use-jobs';
import { useQuotes } from '@/hooks/use-quotes';
import { useInvoices } from '@/hooks/use-invoices';
import { useWeather } from '@/hooks/use-weather';
import { useSettings } from '@/hooks/use-settings';
import { queryClient } from '@/lib/queryClient';
import { Play, Navigation, MessageCircle, Sparkles, Mic, Briefcase, Users, AlertTriangle, Zap } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';

const BLUE      = '#1f6feb';
const BLUE_SOFT = '#eaf2ff';
const GREEN_SOFT = '#e5f6eb';
const PILL_STATES = 4;

function fmtAUD(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseQuoteTitle(q: any): string {
  if (q.title) return q.title;
  try {
    const p = JSON.parse(q.content || '{}');
    if (p.jobTitle) return p.jobTitle;
  } catch {}
  return `Quote #${q.id}`;
}

function AnimatedNumber({ value, prefix = '$', style }: { value: number; prefix?: string; style?: any }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    const steps = 28;
    const ms = 800 / steps;
    let step = 0;
    const t = setInterval(() => {
      step++;
      setDisplayed(Math.round((value * step) / steps));
      if (step >= steps) clearInterval(t);
    }, ms);
    return () => clearInterval(t);
  }, [value]);
  const fmt = displayed >= 1000 ? `${(displayed / 1000).toFixed(1)}k` : displayed.toLocaleString();
  return <Text style={style}>{prefix}{fmt}</Text>;
}

function CyclingPill({ nextJob, pipelineAmt, colors: c, weather }: { nextJob: any; pipelineAmt: number; colors: Colors; weather: any }) {
  const [idx, setIdx] = useState(0);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (locked) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % PILL_STATES), 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [locked]);

  const now = new Date();
  const weatherLabel = weather?.current ? `${weather.current.icon} ${Math.round(weather.current.temp)}°` : '—';
  const states = [
    { icon: weather?.current?.icon || '🌤', label: weatherLabel },
    { icon: '🕐', label: format(now, "EEE d · h:mm a") },
    { icon: '📍', label: nextJob ? nextJob.title.slice(0, 22) : 'No jobs' },
    { icon: '💰', label: pipelineAmt >= 1000 ? `$${(pipelineAmt / 1000).toFixed(1)}k out` : `$${pipelineAmt} out` },
  ];

  const advance = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIdx(i => (i + 1) % PILL_STATES);
    if (!locked) {
      timerRef.current = setInterval(() => setIdx(i => (i + 1) % PILL_STATES), 4000);
    }
  };

  const { icon, label } = states[idx];

  return (
    <TouchableOpacity
      style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft }}
      onPress={advance}
      onLongPress={() => setLocked(l => !l)}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 12, fontFamily: 'Manrope_700Bold', color: c.ink }}>{icon}  {label}{locked ? '  🔒' : ''}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(c: Colors, isDark: boolean) {
  const heroBg = isDark ? c.card : '#0f0e0b';
  return StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 0 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: c.orange, fontSize: 14, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.2 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 2, color: c.muted, textTransform: 'uppercase', marginBottom: 2 },
    heroGreeting: { fontSize: 42, fontFamily: 'Manrope_800ExtraBold', color: c.ink, lineHeight: 42, letterSpacing: -1.5, marginTop: 6 },
    heroSub: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.mutedHi, marginTop: 10, lineHeight: 20, maxWidth: 280 },
    heroCard: { backgroundColor: heroBg, borderRadius: 28, padding: 20, marginTop: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 40, elevation: 20 },
    heroEyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase' },
    durationBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
    durationText: { fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: 0.8 },
    heroJobTitle: { fontSize: 26, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.6, lineHeight: 30, marginBottom: 6 },
    heroJobAddr: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.55)' },
    startBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', shadowColor: c.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 8 },
    startBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.2 },
    heroIconBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    aiRail: { backgroundColor: c.orange, borderRadius: 24, padding: 18, overflow: 'hidden', shadowColor: c.orange, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 10 },
    aiIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    aiEyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: 'rgba(255,255,255,0.75)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
    aiRailText: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.2, lineHeight: 20 },
    micBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 2, letterSpacing: -0.3 },
    seeAll: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
    pipelineChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, minWidth: 108, gap: 4 },
    pipelineNum: { fontSize: 28, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.8, lineHeight: 32 },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, borderRadius: 22, overflow: 'hidden' },
    qaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    qaBtn: { flex: 1, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 8 },
    qaIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    qaLabel: { fontSize: 11, fontFamily: 'Manrope_700Bold', textAlign: 'center' },
    scheduleCard: { width: 148, backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.lineSoft, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    scheduleTime: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
    scheduleTitle: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2, lineHeight: 17, marginBottom: 4 },
    scheduleSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted },
    emptyCard: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft, paddingVertical: 18, alignItems: 'center' },
    emptyText: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted },
    rvCard: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    rvCol: { flex: 1, paddingVertical: 18, alignItems: 'center', gap: 6 },
    rvAmt: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.6 },
    rvDot: { width: 8, height: 8, borderRadius: 4 },
    rvLabel: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1, textTransform: 'uppercase' },
    rqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    rqTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, letterSpacing: -0.2 },
    rqSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted },
    rqAmt: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
    rqBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    rqBadgeText: { fontSize: 10, fontFamily: 'Manrope_700Bold', textTransform: 'capitalize' },
    invRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    invIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    nudgeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.orangeSoft, borderRadius: 18, borderWidth: 1, borderColor: `${c.orange}33`, paddingHorizontal: 16, paddingVertical: 14 },
    nudgeIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    nudgeText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.orangeDeep, lineHeight: 18 },
    pipelineHalfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    pipelineHalfCell: { width: '47%', backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft, padding: 10, gap: 2 },
    pipelineHalfNum: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5 },
    pipelineHalfLabel: { fontSize: 9, fontFamily: 'Manrope_700Bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
    rvHalfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    rvHalfLabel: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: c.muted },
    rvHalfAmt: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.3 },
    weatherCardShadow: { borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 18, elevation: 6 },
    weatherCard: { backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.lineSoft, padding: 16, overflow: 'hidden' },
    weatherTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
    weatherTemp: { fontSize: 52, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -2, lineHeight: 56 },
    weatherDesc: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.mutedHi, marginTop: 2 },
    weatherHiLo: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.muted },
    weatherBigIcon: { fontSize: 56, lineHeight: 64 },
    rainWarning: { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe', padding: 10, marginVertical: 8 },
    rainWarningText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: isDark ? '#93c5fd' : '#1d4ed8', lineHeight: 17 },
    weatherDayCell: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft, backgroundColor: c.paperDeep, minWidth: 58 },
    weatherDayCellActive: { backgroundColor: c.orange, borderColor: c.orange },
    weatherDayCellRainy: { borderColor: isDark ? 'rgba(59,130,246,0.4)' : '#93c5fd' },
    weatherDayLabel: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    weatherDayIcon: { fontSize: 20, lineHeight: 24 },
    weatherDayTemp: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3 },
    weatherDayRain: { fontSize: 9, fontFamily: 'Manrope_700Bold', color: isDark ? '#93c5fd' : '#3b82f6' },
  });
}

export default function HomeScreen() {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c, isDark);

  const QUOTE_STATUS: Record<string, { bg: string; text: string }> = {
    draft:    { bg: c.paperDeep,  text: c.muted    },
    sent:     { bg: BLUE_SOFT,    text: BLUE        },
    viewed:   { bg: BLUE_SOFT,    text: BLUE        },
    accepted: { bg: c.greenSoft,  text: c.green     },
    declined: { bg: c.redSoft,    text: c.red       },
    expired:  { bg: c.paperDeep,  text: c.muted     },
  };

  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: quotes } = useQuotes();
  const { data: invoices } = useInvoices();
  const { data: weather, locError: weatherLocError, requestLocation: retryWeatherLocation } = useWeather();
  const { data: settings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') {
      window.scrollTo(0, 0);
    } else {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'Andy';
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'AH';
  const now = new Date();
  const dayName = format(now, 'EEE d MMM');
  const timeStr = format(now, 'HH:mm');

  const allJobs    = (jobs as any[])     || [];
  const allQuotes  = (quotes as any[])   || [];
  const allInvoices = (invoices as any[]) || [];

  const todayJobs = useMemo(() => allJobs.filter((j: any) => j.scheduledDate && isToday(new Date(j.scheduledDate))), [allJobs]);

  const nextJob = useMemo(() => {
    const upcoming = allJobs
      .filter((j: any) => j.scheduledDate && new Date(j.scheduledDate) >= now && j.status !== 'completed' && j.status !== 'cancelled')
      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    return upcoming[0] || todayJobs[0] || null;
  }, [allJobs, todayJobs]);

  const pipeline = useMemo(() => ({
    draft:    allQuotes.filter((q: any) => q.status === 'draft').length,
    sent:     allQuotes.filter((q: any) => q.status === 'sent' || q.status === 'viewed').length,
    accepted: allQuotes.filter((q: any) => q.status === 'accepted').length,
    overdue:  allQuotes.filter((q: any) => q.status === 'overdue').length,
  }), [allQuotes]);

  const pipelineTotal = allQuotes.filter((q: any) => ['draft', 'sent', 'viewed', 'accepted'].includes(q.status)).length;
  const pipelineAmt   = allQuotes
    .filter((q: any) => ['sent', 'viewed', 'accepted'].includes(q.status))
    .reduce((sum: number, q: any) => sum + (Number(q.totalAmount) || 0), 0);

  const totalPaid    = allInvoices.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0);
  const totalPending = allInvoices.filter((i: any) => ['sent', 'pending', 'unpaid'].includes(i.status)).reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0);
  const totalOverdue = allInvoices.filter((i: any) => i.status === 'overdue').reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0);

  const recentQuotes     = useMemo(() => allQuotes.slice(0, 5), [allQuotes]);
  const overdueInvoices  = useMemo(() => allInvoices.filter((i: any) => i.status === 'overdue'), [allInvoices]);
  const pendingInvoices  = useMemo(() => allInvoices.filter((i: any) => ['sent', 'pending', 'unpaid'].includes(i.status)), [allInvoices]);

  const aiNudge = useMemo(() => {
    if (overdueInvoices.length > 0) {
      const total = overdueInvoices.reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0);
      return `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} totalling $${fmtAUD(total)} — worth a follow-up today.`;
    }
    if (pipeline.draft > 2) return `${pipeline.draft} quotes sitting in draft — send them before they go cold.`;
    if (pipeline.accepted > 0) return `${pipeline.accepted} quote${pipeline.accepted > 1 ? 's' : ''} accepted — time to raise an invoice.`;
    if (todayJobs.length > 0) return `${todayJobs.length} job${todayJobs.length > 1 ? 's' : ''} on today — have a good one out there.`;
    return 'Tap the AI rail above to quote a new job in seconds.';
  }, [overdueInvoices, pipeline, todayJobs]);

  const bladeOrderIds = useMemo<string[] | null>(() => {
    try {
      const raw = settings?.bladeOrder;
      if (!raw) return null;
      const arr = JSON.parse(raw) as string[];
      return Array.isArray(arr) && arr.length > 0 ? arr : null;
    } catch { return null; }
  }, [settings?.bladeOrder]);

  type WDef = { id: string; score: number; fullWidth: boolean };
  const baseWidgets: WDef[] = [
    { id: 'outstanding',  score: (overdueInvoices.length + pendingInvoices.length) > 0 ? 90 + overdueInvoices.length * 5 : 0, fullWidth: false },
    { id: 'schedule',     score: todayJobs.length > 0 ? 80 : 20,   fullWidth: true  },
    { id: 'quickactions', score: 70,                                 fullWidth: true  },
    { id: 'weather',      score: weather ? 55 : 0,                  fullWidth: true  },
    { id: 'recentquotes', score: 45 + pipeline.accepted * 15 + pipeline.sent * 8, fullWidth: true },
    { id: 'pipeline',     score: 40 + (pipeline.sent + pipeline.accepted) * 5, fullWidth: false },
    { id: 'revenue',      score: 35,                                 fullWidth: false },
    { id: 'nudge',        score: 30,                                 fullWidth: false },
  ];

  let widgetDefs: WDef[];
  if (bladeOrderIds) {
    const byId = Object.fromEntries(baseWidgets.map(w => [w.id, w]));
    widgetDefs = bladeOrderIds
      .filter(entry => !entry.startsWith('-'))
      .map(id => byId[id])
      .filter((w): w is WDef => !!w);
  } else {
    widgetDefs = baseWidgets.filter(w => w.score > 0).sort((a, b) => b.score - a.score);
  }

  const rows: WDef[][] = [];
  let wi = 0;
  while (wi < widgetDefs.length) {
    const w = widgetDefs[wi];
    const isFull = w.fullWidth || w.score >= 80;
    if (isFull) { rows.push([w]); wi++; }
    else if (wi === widgetDefs.length - 1) { rows.push([w]); wi++; }
    else {
      const nxt = widgetDefs[wi + 1];
      if (!nxt.fullWidth && nxt.score < 80) { rows.push([w, nxt]); wi += 2; }
      else { rows.push([w]); wi++; }
    }
  }

  const renderWidget = (id: string, half: boolean) => {
    switch (id) {
      case 'quickactions':
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={s.eyebrow}>Quick Actions</Text>
            <View style={s.qaRow}>
              {([
                { Icon: Sparkles,  label: 'New Quote',    color: c.orange, bg: c.orangeSoft, route: '/ai-chat' },
                { Icon: Briefcase, label: 'New Job',      color: BLUE,     bg: isDark ? 'rgba(31,111,235,0.15)' : BLUE_SOFT,    route: '/jobs/create' },
                { Icon: Users,     label: 'Customers',    color: c.green,  bg: c.greenSoft,  route: '/customers' },
              ] as const).map(({ Icon, label, color, bg, route }) => (
                <TouchableOpacity key={label} style={[s.qaBtn, { backgroundColor: bg }]} onPress={() => router.push(route as any)} activeOpacity={0.75}>
                  <View style={[s.qaIcon, { backgroundColor: color }]}><Icon size={18} color="#fff" strokeWidth={2} /></View>
                  <Text style={[s.qaLabel, { color }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'schedule':
        return (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 12 }}>
              <View>
                <Text style={s.eyebrow}>Today's Schedule</Text>
                <Text style={s.sectionTitle}>{todayJobs.length} {todayJobs.length === 1 ? 'stop' : 'stops'} today</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/jobs/list')}><Text style={s.seeAll}>See all →</Text></TouchableOpacity>
            </View>
            {jobsLoading ? (
              <View style={{ paddingHorizontal: 20 }}><View style={[s.emptyCard, { paddingVertical: 24 }]}><ActivityIndicator color={c.orange} /></View></View>
            ) : todayJobs.length === 0 ? (
              <View style={{ paddingHorizontal: 20 }}><View style={s.emptyCard}><Text style={s.emptyText}>Nothing on the books today</Text></View></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}>
                {todayJobs.map((job: any, i: number) => (
                  <TouchableOpacity key={job.id} style={s.scheduleCard} onPress={() => router.push(`/jobs/${job.id}`)} activeOpacity={0.75}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === 0 ? c.orange : BLUE }} />
                      <Text style={s.scheduleTime}>{job.scheduledDate ? format(new Date(job.scheduledDate), 'h:mm a') : 'TBC'}</Text>
                    </View>
                    <Text style={s.scheduleTitle} numberOfLines={2}>{job.title}</Text>
                    <Text style={s.scheduleSub} numberOfLines={1}>{(job as any).customerName || 'Customer'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 'pipeline':
        return half ? (
          <View>
            <Text style={s.eyebrow}>Pipeline</Text>
            <View style={s.pipelineHalfGrid}>
              {[
                { n: pipeline.draft,    l: 'Draft',    col: c.muted,   f: 'draft'    },
                { n: pipeline.sent,     l: 'Sent',     col: BLUE,      f: 'sent'     },
                { n: pipeline.accepted, l: 'Accepted', col: c.green,   f: 'accepted' },
                { n: pipeline.overdue,  l: 'Overdue',  col: c.orange,  f: 'overdue'  },
              ].map(item => (
                <TouchableOpacity key={item.l} style={s.pipelineHalfCell} onPress={() => router.push(`/(tabs)/quotes?filter=${item.f}`)} activeOpacity={0.7}>
                  <Text style={[s.pipelineHalfNum, { color: item.col }]}>{item.n}</Text>
                  <Text style={s.pipelineHalfLabel} numberOfLines={1}>{item.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 12 }}>
              <View>
                <Text style={s.eyebrow}>Quote Pipeline</Text>
                <Text style={s.sectionTitle}>{pipelineTotal} on the go · <Text style={{ color: c.orange }}>${fmtAUD(pipelineAmt)}</Text></Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quotes')}><Text style={s.seeAll}>See all →</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {[
                { n: pipeline.draft,    l: 'Draft',    col: c.muted,   bg: c.card,       ring: c.lineSoft,     f: 'draft'    },
                { n: pipeline.sent,     l: 'Sent',     col: BLUE,      bg: BLUE_SOFT,    ring: '#c8dcff',      f: 'sent'     },
                { n: pipeline.accepted, l: 'Accepted', col: c.green,   bg: c.greenSoft,  ring: `${c.green}44`, f: 'accepted' },
                { n: pipeline.overdue,  l: 'Overdue',  col: c.orange,  bg: c.orangeSoft, ring: `${c.orange}44`, f: 'overdue' },
              ].map(st => (
                <TouchableOpacity key={st.l} onPress={() => router.push(`/(tabs)/quotes?filter=${st.f}`)} activeOpacity={0.7}>
                  <View style={[s.pipelineChip, { backgroundColor: st.bg, borderColor: st.ring }]}>
                    <Text style={[s.pipelineNum, { color: st.col }]}>{st.n}</Text>
                    <Text style={[s.eyebrow, { color: st.col, marginBottom: 0 }]}>{st.l}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'revenue':
        return half ? (
          <View>
            <Text style={s.eyebrow}>Revenue</Text>
            <View style={[s.card, { marginTop: 10 }]}>
              {([
                { label: 'Paid',    amount: totalPaid,    color: c.green  },
                { label: 'Pending', amount: totalPending, color: BLUE     },
                { label: 'Overdue', amount: totalOverdue, color: c.orange },
              ] as const).map((row, i) => (
                <View key={row.label} style={[s.rvHalfRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                  <Text style={s.rvHalfLabel}>{row.label}</Text>
                  <AnimatedNumber value={row.amount} style={[s.rvHalfAmt, { color: row.color }]} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[s.eyebrow, { marginBottom: 10 }]}>Revenue Snapshot</Text>
            <View style={s.rvCard}>
              {([
                { label: 'Paid',    amount: totalPaid,    color: c.green,  bg: c.greenSoft  },
                { label: 'Pending', amount: totalPending, color: BLUE,     bg: BLUE_SOFT    },
                { label: 'Overdue', amount: totalOverdue, color: c.orange, bg: c.orangeSoft },
              ] as const).map((col, i) => (
                <View key={col.label} style={[s.rvCol, i > 0 && { borderLeftWidth: 1, borderLeftColor: c.lineSoft }]}>
                  <AnimatedNumber value={col.amount} style={[s.rvAmt, { color: col.color }]} />
                  <View style={[s.rvDot, { backgroundColor: col.bg }]} />
                  <Text style={s.rvLabel}>{col.label}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'recentquotes':
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <View>
                <Text style={s.eyebrow}>Recent Quotes</Text>
                {recentQuotes.length > 0 && <Text style={s.sectionTitle}>Last {recentQuotes.length}</Text>}
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quotes')}><Text style={s.seeAll}>See all →</Text></TouchableOpacity>
            </View>
            {recentQuotes.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.emptyText}>No quotes yet — start one above</Text></View>
            ) : (
              <View style={s.card}>
                {recentQuotes.map((q: any, i: number) => {
                  const sc = QUOTE_STATUS[q.status] ?? QUOTE_STATUS.draft;
                  return (
                    <TouchableOpacity key={q.id} activeOpacity={0.7} onPress={() => router.push(`/quotes/${q.id}`)}>
                      <View style={[s.rqRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={s.rqTitle} numberOfLines={1}>{parseQuoteTitle(q)}</Text>
                          <Text style={s.rqSub} numberOfLines={1}>{q.customerName || '—'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 5 }}>
                          <Text style={s.rqAmt}>${fmtAUD(Number(q.totalAmount || 0))}</Text>
                          <View style={[s.rqBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[s.rqBadgeText, { color: sc.text }]}>{q.status}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );

      case 'outstanding':
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <View>
                <Text style={s.eyebrow}>Outstanding Invoices</Text>
                <Text style={s.sectionTitle}>
                  {overdueInvoices.length > 0 ? <Text style={{ color: c.orange }}>{overdueInvoices.length} overdue</Text> : null}
                  {overdueInvoices.length > 0 && pendingInvoices.length > 0 ? <Text style={{ color: c.muted }}> · </Text> : null}
                  {pendingInvoices.length > 0 ? <Text>{pendingInvoices.length} pending</Text> : null}
                </Text>
              </View>
            </View>
            <View style={s.card}>
              {[...overdueInvoices.slice(0, 2), ...pendingInvoices.slice(0, 1)].map((inv: any, i: number) => {
                const isOverdue = inv.status === 'overdue';
                return (
                  <TouchableOpacity
                    key={inv.id ?? i}
                    style={[s.invRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}
                    onPress={() => router.push(`/invoices/${inv.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.invIcon, { backgroundColor: isOverdue ? c.orangeSoft : BLUE_SOFT }]}>
                      <AlertTriangle size={14} color={isOverdue ? c.orange : BLUE} strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.rqTitle} numberOfLines={1}>{inv.customerName || 'Customer'}</Text>
                      <Text style={[s.rqSub, isOverdue && { color: c.orange }]}>{isOverdue ? 'Overdue' : 'Pending'}</Text>
                    </View>
                    <Text style={[s.rqAmt, { color: isOverdue ? c.orange : c.ink }]}>${fmtAUD(Number(inv.totalAmount || 0))}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'weather': {
        if (!weather) {
          return (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={[s.card, { padding: 18, alignItems: 'center', gap: 10 }]}>
                {weatherLocError === 'Location permission denied' ? (
                  <>
                    <Text style={{ fontSize: 13, color: c.muted, fontFamily: 'Manrope_500Medium', textAlign: 'center' }}>
                      Location access is needed for weather
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await Location.requestForegroundPermissionsAsync();
                        retryWeatherLocation();
                      }}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: c.orange }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'Manrope_700Bold', color: '#fff' }}>Grant access</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: c.muted, fontFamily: 'Manrope_500Medium' }}>
                    Fetching weather…
                  </Text>
                )}
              </View>
            </View>
          );
        }
        const rainyDays = weather.forecast.filter((d: any) => d.precipitation > 1);
        const hasRainWarning = rainyDays.length > 0;
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={s.eyebrow}>Weather</Text>
            <View style={s.weatherCardShadow}>
            <View style={s.weatherCard}>
              {/* Current conditions */}
              <View style={s.weatherTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.weatherTemp}>{Math.round(weather.current.temp)}°</Text>
                  <Text style={s.weatherDesc}>{weather.current.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Text style={s.weatherHiLo}>↑ {Math.round(weather.forecast[0]?.temp_max)}°</Text>
                    <Text style={s.weatherHiLo}>↓ {Math.round(weather.forecast[0]?.temp_min)}°</Text>
                    {weather.forecast[0]?.precipitation > 0 && (
                      <Text style={[s.weatherHiLo, { color: BLUE }]}>💧 {weather.forecast[0].precipitation.toFixed(1)}mm</Text>
                    )}
                  </View>
                </View>
                <Text style={s.weatherBigIcon}>{weather.current.icon}</Text>
              </View>

              {/* Rain warning */}
              {hasRainWarning && (
                <View style={s.rainWarning}>
                  <Text style={s.rainWarningText}>
                    🌧️ Rain expected {rainyDays.map((d: any) => format(new Date(d.date + 'T00:00:00'), 'EEE')).join(', ')} — plan your outdoor jobs around it.
                  </Text>
                </View>
              )}

              {/* 7-day forecast strip */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 6 }}>
                {weather.forecast.map((day: any, i: number) => {
                  const isRainy = day.precipitation > 1;
                  const isToday_ = i === 0;
                  return (
                    <View key={day.date} style={[s.weatherDayCell, isToday_ && s.weatherDayCellActive, isRainy && s.weatherDayCellRainy]}>
                      <Text style={[s.weatherDayLabel, isToday_ && { color: '#fff' }]}>
                        {isToday_ ? 'Today' : format(new Date(day.date + 'T00:00:00'), 'EEE')}
                      </Text>
                      <Text style={s.weatherDayIcon}>{day.weather_icon}</Text>
                      <Text style={[s.weatherDayTemp, isToday_ && { color: '#fff' }]}>
                        {Math.round(day.temp_max)}°
                      </Text>
                      {isRainy && (
                        <Text style={s.weatherDayRain}>{day.precipitation.toFixed(0)}mm</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
            </View>
          </View>
        );
      }

      case 'nudge':
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={s.nudgeCard}>
              <View style={s.nudgeIcon}><Zap size={16} color={c.orange} strokeWidth={2.5} /></View>
              <Text style={s.nudgeText}>{aiNudge}</Text>
            </View>
          </View>
        );

      default: return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} />}
      >
        <View style={{ position: 'absolute', top: 0, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: `${c.orange}18`, pointerEvents: 'none' }} />

        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
          <CyclingPill nextJob={nextJob} pipelineAmt={pipelineAmt} colors={c} weather={weather} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={s.eyebrow}>{dayName} · {timeStr}</Text>
          <Text style={s.heroGreeting}>
            {"G'day,\n"}
            <Text style={{ color: c.orange }}>{firstName}.</Text>
          </Text>
          <Text style={s.heroSub}>
            {todayJobs.length} {todayJobs.length === 1 ? 'job' : 'jobs'} booked today.{' '}
            <Text style={{ color: c.muted }}>Let's not touch a single form.</Text>
          </Text>

          <View style={s.heroCard}>
            <View style={{ position: 'absolute', top: 0, right: 0, width: 140, height: 140, borderRadius: 70, backgroundColor: `${c.orange}73`, opacity: 0.45 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.orange, shadowColor: c.orange, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 }} />
                <Text style={s.heroEyebrow}>
                  {nextJob ? `Up next · ${nextJob.scheduledDate ? format(new Date(nextJob.scheduledDate), 'h:mm a') : 'Soon'}` : 'No upcoming jobs'}
                </Text>
              </View>
              {nextJob?.estimatedDuration ? (
                <View style={s.durationBadge}>
                  <Text style={s.durationText}>
                    {nextJob.estimatedDuration >= 60
                      ? `${Math.floor(nextJob.estimatedDuration / 60)}H${nextJob.estimatedDuration % 60 ? ` ${nextJob.estimatedDuration % 60}M` : ''}`
                      : `${nextJob.estimatedDuration}M`}
                  </Text>
                </View>
              ) : null}
            </View>

            {nextJob ? (
              <>
                <Text style={s.heroJobTitle}>{nextJob.title}</Text>
                <Text style={s.heroJobAddr}>{(nextJob as any).address || '—'}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                  <TouchableOpacity style={s.startBtn} onPress={() => router.push(`/jobs/${nextJob.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Play size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={s.startBtnText}>Start job</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.heroIconBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      const addr = (nextJob as any).address;
                      if (addr) Linking.openURL(`maps://?q=${encodeURIComponent(addr)}`);
                    }}
                  >
                    <Navigation size={18} color="#fff" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.heroIconBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      const phone = (nextJob as any).customerPhone;
                      if (phone) Linking.openURL(`sms:${phone}`);
                    }}
                  >
                    <MessageCircle size={18} color="#fff" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Manrope_500Medium' }}>
                Nothing scheduled — enjoy the arvo.
              </Text>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <TouchableOpacity style={s.aiRail} onPress={() => router.push('/ai-chat')} activeOpacity={0.88}>
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: '50%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 24 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' }}>
              <View style={s.aiIcon}>
                <Sparkles size={22} color="#fff" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.aiEyebrow}>Quote with a sentence</Text>
                <Text style={s.aiRailText}>"Swap hot water at Dalton's, $1,840..."</Text>
              </View>
              <View style={s.micBtn}><Mic size={18} color={c.orange} strokeWidth={2} /></View>
            </View>
          </TouchableOpacity>
        </View>

        {rows.map((row, rowIdx) => (
          <View
            key={row.map(w => w.id).join('-')}
            style={row.length === 2
              ? { flexDirection: 'row', paddingHorizontal: 20, gap: 10, paddingTop: 18 }
              : { paddingTop: 18 }}
          >
            {row.map(w => (
              <View key={w.id} style={row.length === 2 ? { flex: 1 } : {}}>
                {renderWidget(w.id, row.length === 2)}
              </View>
            ))}
          </View>
        ))}

        <View style={{ paddingTop: 26, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_600SemiBold', letterSpacing: 0.2 }}>
            Admin for people who'd rather be on the tools.
          </Text>
          <Text style={{ fontSize: 10, color: c.muted, fontFamily: 'Manrope_800ExtraBold', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            VARGEN · v1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
