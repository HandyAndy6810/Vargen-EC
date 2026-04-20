import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
} from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useJobs } from '@/hooks/use-jobs';
import { useQuotes } from '@/hooks/use-quotes';
import { queryClient } from '@/lib/queryClient';
import { Sparkles, ChevronRight, Bot, FileText, Briefcase, Users, ArrowRight } from 'lucide-react-native';

const BRAND       = '#ea580c';
const INK         = '#1c1917';
const MUTED       = '#78716c';
const PAPER       = '#faf9f7';
const PAPER_DEEP  = '#f0ece4';
const CARD        = '#ffffff';
const LINE        = '#e7e5e4';

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useJobs();
  const { data: quotes, refetch: refetchQuotes } = useQuotes();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, []);

  const todayJobs = useMemo(
    () => (jobs as any[])?.filter((j: any) => j.scheduledDate && isToday(new Date(j.scheduledDate))) || [],
    [jobs]
  );

  const pendingQuotes = useMemo(
    () => quotes?.filter((q) => q.status === 'sent') || [],
    [quotes]
  );

  const nextJob = useMemo(
    () =>
      (jobs as any[])
        ?.filter((job: any) => job.scheduledDate && startOfDay(new Date(job.scheduledDate)) >= startOfDay(new Date()))
        .sort((a: any, b: any) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0] || null,
    [jobs]
  );

  const nextJobLabel = useMemo(() => {
    if (!nextJob?.scheduledDate) return '';
    const d = new Date(nextJob.scheduledDate);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'eee d MMM');
  }, [nextJob]);

  const selectedDateJobs = useMemo(
    () => (jobs as any[])?.filter((job: any) => job.scheduledDate && isSameDay(new Date(job.scheduledDate), selectedDate)) || [],
    [jobs, selectedDate]
  );

  const getDayDot = (day: Date) => {
    const count = (jobs as any[])?.filter((j: any) => j.scheduledDate && isSameDay(new Date(j.scheduledDate), day)).length || 0;
    return count > 0;
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "G'day";
    if (h < 17) return 'Afternoon';
    return 'Evening';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
        }
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={s.avatar}
            activeOpacity={0.8}
          >
            <Text style={s.avatarText}>{initial}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={s.greetingLabel}>
              {greeting},{' '}
              <Text style={{ color: BRAND }}>{firstName}</Text>
            </Text>
            <Text style={s.subLabel}>Here's your day at a glance</Text>
          </View>

          <TouchableOpacity
            style={s.aiBtn}
            onPress={() => router.push('/ai-chat')}
            activeOpacity={0.8}
          >
            <Bot size={18} color={BRAND} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Hero card */}
        <View style={s.heroWrap}>
          <View style={s.heroCard}>
            {/* orange glow */}
            <View style={s.heroGlow} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={s.heroLabel}>TODAY'S SCHEDULE</Text>
                <Text style={s.heroVal}>{todayJobs.length} jobs</Text>
                <Text style={s.heroSub}>
                  {todayJobs.filter((j: any) => j.status === 'completed').length} done ·{' '}
                  {todayJobs.filter((j: any) => j.status === 'in_progress').length} in progress
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 12 }}>
                <StatPill label="Pending quotes" value={String(pendingQuotes.length)} />
                <StatPill label="Open jobs" value={String((jobs as any[])?.filter((j: any) => ['pending','confirmed'].includes(j.status)).length || 0)} />
              </View>
            </View>

            {nextJob && (
              <TouchableOpacity
                style={s.nextJobRow}
                onPress={() => router.push('/(tabs)/jobs')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.nextJobLabel}>NEXT · {nextJobLabel.toUpperCase()}</Text>
                  <Text style={s.nextJobTitle} numberOfLines={1}>{nextJob.title}</Text>
                </View>
                <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* AI Rail */}
        <TouchableOpacity
          style={s.aiRail}
          onPress={() => router.push('/ai-chat')}
          activeOpacity={0.88}
        >
          <View style={s.aiIconWrap}>
            <Sparkles size={18} color="#fff" strokeWidth={2} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.aiRailTitle}>AI Quote Assistant</Text>
            <Text style={s.aiRailSub}>Tap to generate a quote instantly</Text>
          </View>
          <ArrowRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Quick actions */}
        <View style={s.section}>
          <SectionEyebrow>QUICK ACTIONS</SectionEyebrow>
          <View style={s.tileGrid}>
            <QuickTile icon={FileText} label="New Quote" color={BRAND} onPress={() => router.push('/(tabs)/quotes')} />
            <QuickTile icon={Briefcase} label="Jobs" color="#2563eb" onPress={() => router.push('/(tabs)/jobs')} />
            <QuickTile icon={Users} label="Customers" color="#16a34a" onPress={() => router.push('/(tabs)/customers')} />
          </View>
        </View>

        {/* This week */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionEyebrow>THIS WEEK</SectionEyebrow>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={{ fontSize: 12, fontFamily: 'Manrope_700Bold', color: BRAND }}>All jobs</Text>
            </TouchableOpacity>
          </View>

          {/* Week strip */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
            {weekDays.map((day, idx) => {
              const sel = isSameDay(day, selectedDate);
              const dot = getDayDot(day);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[s.dayCell, sel && s.dayCellActive]}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.dayLabel, sel && { color: 'rgba(255,255,255,0.8)' }]}>
                    {format(day, 'eeeee')}
                  </Text>
                  <Text style={[s.dayNum, sel && { color: '#fff' }]}>{format(day, 'd')}</Text>
                  {dot && <View style={[s.dot, sel && { backgroundColor: 'rgba(255,255,255,0.8)' }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Day detail */}
          <View style={{ gap: 8 }}>
            {selectedDateJobs.length === 0 ? (
              <View style={s.emptyDay}>
                <Text style={s.emptyDayText}>No jobs on {isToday(selectedDate) ? 'today' : format(selectedDate, 'eeee')}</Text>
              </View>
            ) : (
              selectedDateJobs.slice(0, 3).map((job: any) => (
                <TouchableOpacity
                  key={job.id}
                  style={s.jobRow}
                  onPress={() => router.push('/(tabs)/jobs')}
                  activeOpacity={0.7}
                >
                  <View style={s.jobDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
                    <Text style={s.jobTime}>
                      {job.scheduledDate ? format(new Date(job.scheduledDate), 'h:mm a') : 'TBD'}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={LINE} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: '#fff', lineHeight: 26 }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function QuickTile({ icon: Icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.tile} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.tileIcon, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={s.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: BRAND,
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  greetingLabel: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
  },
  aiBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heroCard: {
    backgroundColor: '#0f0e0b',
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(234,88,12,0.25)',
  },
  heroLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroVal: {
    fontSize: 38,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 42,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  nextJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  nextJobLabel: {
    fontSize: 8,
    fontFamily: 'Manrope_800ExtraBold',
    color: BRAND,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  nextJobTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
  aiRail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: BRAND,
    borderRadius: 18,
    padding: 16,
  },
  aiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiRailTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  aiRailSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tileGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    gap: 8,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    textAlign: 'center',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: PAPER_DEEP,
  },
  dayCellActive: {
    backgroundColor: INK,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND,
    marginTop: 4,
  },
  emptyDay: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: LINE,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  jobDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  jobTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  jobTime: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
  },
});
