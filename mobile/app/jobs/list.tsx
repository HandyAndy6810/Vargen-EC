import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobs } from '@/hooks/use-jobs';
import { ChevronLeft, Plus } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CREAM       = '#fff8ef';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const BLUE        = '#1f6feb';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const GREEN_BORDER = '#bde2c9';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';

type FilterKey = 'today' | 'upcoming' | 'past' | 'all';

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  scheduled:   { bg: PAPER_DEEP,  fg: MUTED_HI, label: 'Scheduled' },
  pending:     { bg: ORANGE_SOFT, fg: ORANGE_DEEP, label: 'Pending' },
  in_progress: { bg: ORANGE_SOFT, fg: ORANGE_DEEP, label: 'In progress' },
  completed:   { bg: GREEN_SOFT,  fg: GREEN,    label: 'Completed' },
  cancelled:   { bg: PAPER_DEEP,  fg: MUTED,    label: 'Cancelled' },
};

export default function JobsListScreen() {
  const [filter, setFilter] = useState<FilterKey>('today');
  const { data: jobs, isLoading } = useJobs();

  const allJobs = (jobs as any[]) || [];

  const todayJobs = useMemo(() =>
    allJobs.filter((j: any) => j.scheduledDate && isToday(new Date(j.scheduledDate))),
    [allJobs]
  );
  const upcomingJobs = useMemo(() =>
    allJobs.filter((j: any) => j.scheduledDate && isFuture(new Date(j.scheduledDate)) && !isToday(new Date(j.scheduledDate)) && j.status !== 'completed' && j.status !== 'cancelled'),
    [allJobs]
  );
  const pastJobs = useMemo(() =>
    allJobs.filter((j: any) => !j.scheduledDate || isPast(new Date(j.scheduledDate))).filter((j: any) => j.status === 'completed' || j.status === 'cancelled'),
    [allJobs]
  );

  const filtered = useMemo(() => {
    if (filter === 'today') return todayJobs;
    if (filter === 'upcoming') return upcomingJobs;
    if (filter === 'past') return pastJobs;
    return [...allJobs].sort((a: any, b: any) => new Date(b.scheduledDate || 0).getTime() - new Date(a.scheduledDate || 0).getTime());
  }, [filter, allJobs, todayJobs, upcomingJobs, pastJobs]);

  const totalHours = todayJobs.length * 1.75;
  const hh = Math.floor(totalHours);
  const mm = Math.round((totalHours - hh) * 60);

  const timeDots = todayJobs.slice(0, 3).map((j: any, i: number) => ({
    t: j.scheduledDate ? format(new Date(j.scheduledDate), 'h:mm') : '--',
    c: i === 0 ? ORANGE : i === 1 ? INK : BLUE,
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Jobs</Text>
          <Text style={s.title}>Your rounds</Text>
        </View>
        <TouchableOpacity style={s.addBtn} activeOpacity={0.8}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Big count hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={s.heroCard}>
          <Text style={s.heroEyebrow}>Today</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <Text style={s.heroCount}>{todayJobs.length}</Text>
            <Text style={s.heroMeta}>
              {todayJobs.length === 1 ? 'job' : 'jobs'} · {hh}h {mm > 0 ? `${mm}m` : ''}
            </Text>
          </View>

          {timeDots.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
              {timeDots.map((dot, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: i < timeDots.length - 1 ? 1 : 0 }}>
                  <View style={[s.timePill, { backgroundColor: dot.c }]}>
                    <Text style={s.timePillText}>{dot.t}</Text>
                  </View>
                  {i < timeDots.length - 1 && (
                    <View style={{ flex: 1, height: 2, backgroundColor: PAPER_DEEP, borderRadius: 999 }} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow} style={{ maxHeight: 48 }}>
        {([
          { id: 'today', l: 'Today' },
          { id: 'upcoming', l: 'Upcoming' },
          { id: 'past', l: 'Past' },
          { id: 'all', l: 'All' },
        ] as { id: FilterKey; l: string }[]).map((t) => {
          const active = filter === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setFilter(t.id)} activeOpacity={0.7}
              style={[s.tab, active && s.tabActive]}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.l}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 10 }}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: MUTED }}>No jobs here</Text>
          </View>
        ) : (
          filtered.map((job: any, i: number) => {
            const isNext = filter === 'today' && i === 0 && job.status !== 'completed';
            const pill = STATUS_PILL[job.status] ?? STATUS_PILL.scheduled;
            const timeStr = job.scheduledDate ? format(new Date(job.scheduledDate), 'h:mm a') : null;
            const dayStr = job.scheduledDate ? format(new Date(job.scheduledDate), 'EEE') : null;

            return (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push(`/jobs/${job.id}`)}
                activeOpacity={0.7}
              >
                <View style={[s.jobCard, isNext && s.jobCardNext]}>
                  {isNext && <View style={s.jobCardGlow} />}

                  <View style={[s.timeCol, { borderRightColor: isNext ? 'rgba(255,255,255,0.12)' : LINE_SOFT }]}>
                    {timeStr ? (
                      <>
                        <Text style={[s.timeColMain, isNext && { color: '#fff' }]}>
                          {timeStr.split(' ')[0]}
                        </Text>
                        <Text style={[s.timeColSub, isNext && { color: 'rgba(255,255,255,0.55)' }]}>
                          {timeStr.split(' ')[1] || dayStr}
                        </Text>
                      </>
                    ) : (
                      <Text style={[s.timeColSub, isNext && { color: 'rgba(255,255,255,0.55)' }]}>
                        {dayStr || '—'}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                    {isNext && (
                      <Text style={s.nextEyebrow}>Up next</Text>
                    )}
                    <Text style={[s.jobTitle, isNext && { color: '#fff', marginTop: 2 }]} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text style={[s.jobMeta, isNext && { color: 'rgba(255,255,255,0.55)' }]} numberOfLines={1}>
                      {(job as any).customerName || 'Customer'}{(job as any).address ? ` · ${(job as any).address}` : ''}
                    </Text>
                    {!isNext && (
                      <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                        <View style={[s.statusPill, { backgroundColor: pill.bg }]}>
                          <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.33,
    shadowRadius: 14,
    elevation: 6,
  },
  heroCard: {
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 22,
    padding: 18,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroCount: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -1.4,
    lineHeight: 46,
  },
  heroMeta: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timePillText: {
    fontSize: 10.5,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  tabActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED_HI,
  },
  tabTextActive: {
    color: '#fff',
  },
  jobCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  jobCardNext: {
    backgroundColor: BLACK,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
  },
  jobCardGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${ORANGE}88`,
    opacity: 0.4,
  },
  timeCol: {
    width: 56,
    flexShrink: 0,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
  },
  timeColMain: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
  timeColSub: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nextEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
  jobMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
