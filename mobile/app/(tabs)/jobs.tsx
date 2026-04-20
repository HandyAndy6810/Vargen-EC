import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobs, useUpdateJob } from '@/hooks/use-jobs';
import { useState, useCallback, useMemo } from 'react';
import { queryClient } from '@/lib/queryClient';
import { MapPin, Clock, User, ChevronRight, Briefcase } from 'lucide-react-native';
import type { Job } from '@shared/schema';

type JobWithJoins = Job & { customerName?: string; address?: string };

const BRAND      = '#ea580c';
const INK        = '#1c1917';
const MUTED      = '#78716c';
const PAPER      = '#faf9f7';
const PAPER_DEEP = '#f0ece4';
const CARD       = '#ffffff';
const LINE       = '#e7e5e4';

type Filter = 'today' | 'upcoming' | 'past' | 'all';

const STATUS_ACTIONS: Record<string, { label: string; next: string; style?: 'destructive' | 'default' }[]> = {
  pending:     [
    { label: 'Mark as Scheduled', next: 'scheduled' },
    { label: 'Cancel Job', next: 'cancelled', style: 'destructive' },
  ],
  scheduled:   [
    { label: 'Start Job', next: 'in_progress' },
    { label: 'Mark as Completed', next: 'completed' },
    { label: 'Cancel Job', next: 'cancelled', style: 'destructive' },
  ],
  in_progress: [
    { label: 'Mark as Completed', next: 'completed' },
    { label: 'Cancel Job', next: 'cancelled', style: 'destructive' },
  ],
  completed:   [],
  cancelled:   [{ label: 'Reinstate as Scheduled', next: 'scheduled' }],
};

const STATUS_DOT: Record<string, string> = {
  pending:     '#d97706',
  scheduled:   '#2563eb',
  in_progress: BRAND,
  completed:   '#16a34a',
  cancelled:   '#a8a29e',
};

function jobDateLabel(date: string) {
  const d = new Date(date);
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`;
  return format(d, 'eee d MMM · h:mm a');
}

export default function JobsScreen() {
  const { data: jobs, isLoading, isError } = useJobs();
  const { mutate: updateJob } = useUpdateJob();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('today');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const handleStatusPress = (job: JobWithJoins) => {
    const actions = STATUS_ACTIONS[job.status ?? 'scheduled'] ?? [];
    if (actions.length === 0) return;
    const buttons = actions.map((a) => ({
      text: a.label,
      style: a.style ?? 'default',
      onPress: () => updateJob({ id: job.id, status: a.next }),
    }));
    buttons.push({ text: 'Cancel', style: 'cancel', onPress: () => {} } as any);
    Alert.alert('Update Status', job.title, buttons as any);
  };

  const allJobs = (jobs || []) as JobWithJoins[];

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    return allJobs
      .filter((j) => {
        if (filter === 'all') return true;
        if (!j.scheduledDate) return filter === 'upcoming';
        const d = new Date(j.scheduledDate);
        if (filter === 'today') return d >= todayStart && d < todayEnd;
        if (filter === 'upcoming') return d >= todayEnd;
        if (filter === 'past') return d < todayStart;
        return true;
      })
      .sort((a, b) => {
        if (!a.scheduledDate) return 1;
        if (!b.scheduledDate) return -1;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });
  }, [allJobs, filter]);

  const counts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    return {
      today:    allJobs.filter((j) => j.scheduledDate && new Date(j.scheduledDate) >= todayStart && new Date(j.scheduledDate) < todayEnd).length,
      upcoming: allJobs.filter((j) => j.scheduledDate && new Date(j.scheduledDate) >= todayEnd).length,
      past:     allJobs.filter((j) => j.scheduledDate && new Date(j.scheduledDate) < todayStart).length,
      all:      allJobs.length,
    };
  }, [allJobs]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER, paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: INK }}>Couldn't load jobs</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Hero summary card */}
      <View style={s.heroCard}>
        <Text style={s.heroEyebrow}>YOUR ROUNDS</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
          <HeroStat label="Today" value={String(counts.today)} />
          <HeroStat label="Upcoming" value={String(counts.upcoming)} />
          <HeroStat label="Total" value={String(counts.all)} />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={{ maxHeight: 48 }}
      >
        {(['today', 'upcoming', 'past', 'all'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            <Text style={[s.chipCount, filter === f && { color: 'rgba(255,255,255,0.65)' }]}>
              {counts[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: PAPER_DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Briefcase size={24} color={MUTED} />
            </View>
            <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>No jobs here</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 4 }}>
              {filter === 'today' ? "Nothing scheduled today" : `No ${filter} jobs`}
            </Text>
          </View>
        ) : (
          filtered.map((job) => {
            const dot = STATUS_DOT[job.status ?? 'scheduled'];
            const canAct = (STATUS_ACTIONS[job.status ?? 'scheduled'] ?? []).length > 0;
            return (
              <View key={job.id} style={s.jobCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[s.statusDot, { backgroundColor: dot }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text>
                    {job.customerName && (
                      <View style={s.metaRow}>
                        <User size={11} color={MUTED} />
                        <Text style={s.metaText}>{job.customerName}</Text>
                      </View>
                    )}
                    {job.scheduledDate && (
                      <View style={s.metaRow}>
                        <Clock size={11} color={MUTED} />
                        <Text style={s.metaText}>{jobDateLabel(job.scheduledDate)}</Text>
                      </View>
                    )}
                    {job.address && (
                      <View style={s.metaRow}>
                        <MapPin size={11} color={MUTED} />
                        <Text style={s.metaText} numberOfLines={1}>{job.address}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: dot + '18' }]}>
                    <Text style={[s.statusBadgeText, { color: dot }]}>
                      {(job.status ?? 'scheduled').replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                {canAct && (
                  <TouchableOpacity
                    style={s.actBtn}
                    onPress={() => handleStatusPress(job)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.actBtnText}>Update status</Text>
                    <ChevronRight size={13} color={BRAND} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.8 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: '#0f0e0b',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroEyebrow: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PAPER_DEEP,
  },
  chipActive: {
    backgroundColor: INK,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipCount: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
  },
  jobCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  jobTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'capitalize',
  },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  actBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: BRAND,
  },
});
