import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  type DimensionValue,
} from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { format, isToday } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useJobs } from '@/hooks/use-jobs';
import { useQuotes } from '@/hooks/use-quotes';
import { useInvoices } from '@/hooks/use-invoices';
import { queryClient } from '@/lib/queryClient';
import { Play, Navigation, MessageCircle, Sparkles, Mic } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const CREAM       = '#fff8ef';
const BLACK       = '#0f0e0b';
const BLUE        = '#1f6feb';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: quotes } = useQuotes();
  const { data: invoices } = useInvoices();
  const [refreshing, setRefreshing] = useState(false);

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

  const allJobs = (jobs as any[]) || [];
  const allQuotes = (quotes as any[]) || [];
  const allInvoices = (invoices as any[]) || [];

  const weeklyGoal = 5000;
  const weeklyRevenue = allInvoices
    .filter((i: any) => i.status === 'paid')
    .reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0);
  const revenuePct = Math.min(100, Math.round((weeklyRevenue / weeklyGoal) * 100));

  const todayJobs = useMemo(() => {
    return allJobs.filter((j: any) => j.scheduledDate && isToday(new Date(j.scheduledDate)));
  }, [allJobs]);

  const nextJob = useMemo(() => {
    const upcoming = allJobs
      .filter((j: any) => j.scheduledDate && new Date(j.scheduledDate) >= now && j.status !== 'completed' && j.status !== 'cancelled')
      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    return upcoming[0] || todayJobs[0] || null;
  }, [allJobs, todayJobs]);

  const pipeline = useMemo(() => ({
    draft: allQuotes.filter((q: any) => q.status === 'draft').length,
    sent: allQuotes.filter((q: any) => q.status === 'sent' || q.status === 'viewed').length,
    accepted: allQuotes.filter((q: any) => q.status === 'accepted').length,
    overdue: allQuotes.filter((q: any) => q.status === 'overdue').length,
  }), [allQuotes]);

  const pipelineTotal = allQuotes.filter((q: any) => ['draft', 'sent', 'viewed', 'accepted'].includes(q.status)).length;
  const pipelineAmt = allQuotes
    .filter((q: any) => ['sent', 'viewed', 'accepted'].includes(q.status))
    .reduce((s: number, q: any) => s + (Number(q.totalAmount) || 0), 0);

  const activityItems = useMemo(() => {
    const items: any[] = [];
    allInvoices.slice(0, 2).forEach((inv: any) => {
      if (inv.status === 'paid') items.push({ type: 'paid', title: `${inv.customerName || 'Customer'} paid`, amt: `+$${Number(inv.totalAmount || 0).toLocaleString()}`, t: '2h', c: GREEN, bg: GREEN_SOFT, ic: '✓' });
    });
    allInvoices.filter((i: any) => i.status === 'overdue').slice(0, 1).forEach((inv: any) => {
      items.push({ type: 'overdue', title: `INV now overdue`, amt: `$${Number(inv.totalAmount || 0).toLocaleString()}`, t: '2d', c: ORANGE, bg: ORANGE_SOFT, ic: '!' });
    });
    return items.slice(0, 3);
  }, [allInvoices]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      >
        {/* Ambient blobs */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -100, width: 340, height: 340, borderRadius: 170, backgroundColor: `${ORANGE}15` }} />

        {/* TopBar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
          <View style={s.weatherPill}>
            <Text style={s.weatherTemp}>{dayName}</Text>
          </View>
        </View>

        {/* Hero greeting */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={s.eyebrow}>{dayName} · {timeStr}</Text>
          <Text style={s.heroGreeting}>
            {"G'day,\n"}
            <Text style={{ color: ORANGE }}>{firstName}.</Text>
          </Text>
          <Text style={s.heroSub}>
            {todayJobs.length} {todayJobs.length === 1 ? 'job' : 'jobs'} booked today.{' '}
            <Text style={{ color: MUTED }}>Let's not touch a single form.</Text>
          </Text>

          {/* Hero job card */}
          <View style={s.heroCard}>
            <View style={s.heroGlow} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.pulseDot} />
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
                <Text style={s.heroJobAddr}>
                  {(nextJob as any).address || '—'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                  <TouchableOpacity style={s.startBtn} onPress={() => router.push(`/jobs/${nextJob.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Play size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={s.startBtnText}>Start job</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.heroIconBtn} activeOpacity={0.7}>
                    <Navigation size={18} color="#fff" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.heroIconBtn} activeOpacity={0.7}>
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

        {/* AI Rail */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <TouchableOpacity style={s.aiRail} onPress={() => router.push('/ai-chat')} activeOpacity={0.88}>
            <View style={s.aiRailGlow} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' }}>
              <View style={s.aiIcon}>
                <Sparkles size={22} color="#fff" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.aiEyebrow}>Quote with a sentence</Text>
                <Text style={s.aiRailText}>"Swap hot water at Dalton's, $1,840..."</Text>
              </View>
              <View style={s.micBtn}><Mic size={18} color={ORANGE} strokeWidth={2} /></View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Goal Block */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={s.goalCard}>
            <Text style={s.eyebrow}>Week revenue</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 8, marginBottom: 14 }}>
              <Text style={s.goalAmount}>
                ${weeklyRevenue >= 1000 ? (weeklyRevenue / 1000).toFixed(1) + 'k' : weeklyRevenue.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 14, color: MUTED, fontFamily: 'Manrope_600SemiBold', marginBottom: 6 }}>/ $5,000 goal</Text>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${revenuePct}%` as any }]} />
              {[25, 50, 75].map(m => (
                <View key={m} style={[s.progressTick, { left: `${m}%` as DimensionValue }]} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontSize: 11, color: MUTED_HI, fontFamily: 'Manrope_600SemiBold' }}>
                <Text style={{ color: ORANGE, fontFamily: 'Manrope_700Bold' }}>{revenuePct}%</Text> there
              </Text>
              <Text style={{ fontSize: 11, color: MUTED, fontFamily: 'Manrope_600SemiBold' }}>
                {todayJobs.length} jobs today
              </Text>
            </View>
          </View>
        </View>

        {/* Pipeline */}
        <View style={{ paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 12 }}>
            <View>
              <Text style={s.eyebrow}>Quote pipeline</Text>
              <Text style={s.sectionTitle}>
                {pipelineTotal} on the go ·{' '}
                <Text style={{ color: ORANGE }}>${pipelineAmt.toLocaleString()} out</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/quotes')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {[
              { n: pipeline.draft, l: 'Draft', c: MUTED, bg: CARD, ring: LINE_MID },
              { n: pipeline.sent, l: 'Sent', c: BLUE, bg: '#eaf2ff', ring: '#c8dcff' },
              { n: pipeline.accepted, l: 'Accepted', c: GREEN, bg: GREEN_SOFT, ring: '#bde2c9' },
              { n: pipeline.overdue, l: 'Overdue', c: ORANGE, bg: ORANGE_SOFT, ring: '#f8c59f' },
            ].map(stage => (
              <TouchableOpacity key={stage.l} onPress={() => router.push('/(tabs)/quotes')} activeOpacity={0.7}>
                <View style={[s.pipelineChip, { backgroundColor: stage.bg, borderColor: stage.ring }]}>
                  <Text style={[s.pipelineNum, { color: stage.c }]}>{stage.n}</Text>
                  <Text style={[s.eyebrow, { color: stage.c, marginBottom: 0 }]}>{stage.l}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Today's Schedule */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <View>
              <Text style={s.eyebrow}>Today · {todayJobs.length} stops</Text>
              <Text style={s.sectionTitle}>Out the door by 9.</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/jobs/list')}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {todayJobs.length === 0 ? (
            <View style={s.emptyTimeline}>
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED }}>Nothing scheduled today</Text>
            </View>
          ) : (
            todayJobs.map((job: any, i: number) => {
              const isLast = i === todayJobs.length - 1;
              const dotC = i === 0 ? ORANGE : BLUE;
              return (
                <TouchableOpacity key={job.id} onPress={() => router.push(`/jobs/${job.id}`)} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
                    <View style={[s.timeGutter, { width: 54 }]}>
                      <Text style={s.timeMain}>{job.scheduledDate ? format(new Date(job.scheduledDate), 'h:mm') : '--'}</Text>
                      <Text style={s.timeAmPm}>{job.scheduledDate ? format(new Date(job.scheduledDate), 'a') : ''}</Text>
                      <View style={[s.timeRail, { backgroundColor: dotC, bottom: isLast ? 'auto' : -14, height: isLast ? 20 : undefined }]} />
                      <View style={[s.timeDot, { backgroundColor: dotC, borderColor: PAPER }]} />
                    </View>
                    <View style={[s.timelineCard, { marginBottom: isLast ? 0 : 14 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <Text style={s.timelineTitle}>{job.title}</Text>
                        <Text style={s.timelineDur}>90m</Text>
                      </View>
                      <Text style={s.timelineSub}>
                        {(job as any).customerName || 'Customer'}{(job as any).address ? ` · ${(job as any).address}` : ''}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Activity */}
        {activityItems.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
            <Text style={[s.eyebrow, { marginBottom: 12 }]}>Activity · Last 24h</Text>
            <View style={[s.card, { padding: 0 }]}>
              {activityItems.map((a: any, i: number) => (
                <View key={i} style={[s.activityRow, i > 0 && s.activityRowBorder]}>
                  <View style={[s.activityIcon, { backgroundColor: a.bg }]}>
                    <Text style={{ color: a.c, fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }}>{a.ic}</Text>
                  </View>
                  <Text style={s.activityText}>{a.title}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.activityAmt, { color: a.c }]}>{a.amt}</Text>
                    <Text style={s.activityTime}>{a.t} ago</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sig */}
        <View style={{ paddingTop: 26, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: MUTED, fontFamily: 'Manrope_600SemiBold', letterSpacing: 0.2 }}>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: ORANGE,
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.2,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  weatherIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#d9ecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherTemp: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  weatherCity: {
    fontSize: 11,
    color: MUTED,
    fontFamily: 'Manrope_500Medium',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 2,
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroGreeting: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    lineHeight: 42,
    letterSpacing: -1.5,
    marginTop: 6,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 0,
  },
  heroCard: {
    backgroundColor: BLACK,
    borderRadius: 28,
    padding: 20,
    marginTop: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 20,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${ORANGE}73`,
    opacity: 0.45,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  durationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  durationText: {
    fontSize: 10.5,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: 0.8,
  },
  heroJobTitle: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 6,
  },
  heroJobAddr: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.55)',
  },
  startBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  heroIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiRail: {
    backgroundColor: ORANGE,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 10,
  },
  aiRailGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiRailText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCard: {
    backgroundColor: CREAM,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  goalAmount: {
    fontSize: 44,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  progressBg: {
    height: 10,
    borderRadius: 999,
    backgroundColor: PAPER_DEEP,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: ORANGE,
    borderRadius: 999,
  },
  progressTick: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
  },
  pipelineChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 108,
    gap: 4,
  },
  pipelineNum: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  emptyTimeline: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
  },
  timeGutter: {
    flexShrink: 0,
    position: 'relative',
    alignItems: 'flex-end',
    paddingTop: 6,
    paddingRight: 14,
  },
  timeMain: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  timeAmPm: {
    fontSize: 9.5,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  timeRail: {
    position: 'absolute',
    right: 5,
    top: 22,
    width: 2,
    opacity: 0.3,
  },
  timeDot: {
    position: 'absolute',
    right: -1,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.2,
    flex: 1,
  },
  timelineDur: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  timelineSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 22,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  activityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: LINE_SOFT,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  activityAmt: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
  },
  activityTime: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
});
