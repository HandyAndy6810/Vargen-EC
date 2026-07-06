import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { format, startOfWeek, addDays, addWeeks, isToday } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobs } from '@/hooks/use-jobs';
import { api } from '@shared/mobile-routes';
import { useWeather } from '@/hooks/use-weather';
import { Plus, Search, X, ChevronLeft, ChevronRight, Send, SkipForward } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

const HOUR_H = 54;
const START_H = 6;
const END_H = 20;

function formatTime(v: number) {
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = ((h + 11) % 12) + 1;
  return m === 0 ? `${hh}${ampm}` : `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}

function getJobHour(dateStr: string | Date): number {
  const d = new Date(dateStr as any);
  return d.getHours() + d.getMinutes() / 60;
}

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
    title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.5, marginTop: 2 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
    iconBtnActive: { backgroundColor: c.orange, borderColor: c.orange },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', shadowColor: c.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.33, shadowRadius: 14, elevation: 6 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.ink, paddingVertical: 0 },
    dayCell: { flex: 1, minWidth: 0, paddingVertical: 10, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', gap: 2 },
    dayCellActive: { backgroundColor: c.orange, borderColor: c.orange },
    dayLabel: { fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: 1, opacity: 0.55, textTransform: 'uppercase' },
    dayNum: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3 },
    dayHeadline: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
    daySubhead: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    hourLine: { position: 'absolute', left: 0, right: 12, height: 1, borderTopWidth: 1, borderTopColor: c.lineSoft, borderStyle: 'dashed', overflow: 'visible' as any },
    hourLabel: { position: 'absolute', left: -44, top: -8, fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, width: 38, textAlign: 'right' },
    nowLabel: { width: 40, textAlign: 'right', paddingRight: 4, fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
    nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.orange, marginRight: -4, zIndex: 2 },
    nowBar: { flex: 1, height: 2, backgroundColor: c.orange, borderRadius: 999 },
    eventTime: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.8, textTransform: 'uppercase' },
    eventTitle: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.2, marginTop: 1 },
    eventSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 1, opacity: 0.6 },
  });
}

export default function CalendarScreen() {
  const { colors: c, isDark } = useTheme();
  const s = makeStyles(c, isDark);
  const qc = useQueryClient();

  // Tick every minute so the now-line and today detection stay live
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const [segment, setSegment] = useState<'calendar' | 'outreach'>('calendar');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayIdx, setDayIdx] = useState(() => {
    const todayIdx = Array.from({ length: 7 }, (_, i) =>
      addDays(startOfWeek(now, { weekStartsOn: 1 }), i)
    ).findIndex(d => isToday(d));
    return todayIdx >= 0 ? todayIdx : 0;
  });
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: [api.jobs.list.path] });
    setRefreshing(false);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 }),
    [weekOffset, now]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { data: jobs } = useJobs();
  const { data: weather } = useWeather();
  const allJobs = (jobs as any[]) || [];

  const weatherByDate = useMemo(() => {
    const map: Record<string, any> = {};
    for (const day of (weather as any)?.forecast ?? []) {
      map[day.date] = day;
    }
    return map;
  }, [weather]);

  const selectedDay = days[dayIdx];

  const dayJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allJobs
      .filter((j: any) => {
        if (!j.scheduledDate) return false;
        const d = new Date(j.scheduledDate);
        return (
          d.getFullYear() === selectedDay.getFullYear() &&
          d.getMonth() === selectedDay.getMonth() &&
          d.getDate() === selectedDay.getDate()
        );
      })
      .filter((j: any) => {
        if (!q) return true;
        return (
          (j.title ?? '').toLowerCase().includes(q) ||
          (j.customerName ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [allJobs, selectedDay, searchQuery]);

  const jobCountPerDay = useMemo(() => {
    return days.map(day =>
      allJobs.filter((j: any) => {
        if (!j.scheduledDate) return false;
        const d = new Date(j.scheduledDate);
        return (
          d.getFullYear() === day.getFullYear() &&
          d.getMonth() === day.getMonth() &&
          d.getDate() === day.getDate()
        );
      }).length
    );
  }, [allJobs, days]);

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowTop = (nowHour - START_H) * HOUR_H;
  const showNow = weekOffset === 0 && isToday(selectedDay) && nowHour >= START_H && nowHour <= END_H;

  const outOfRangeBefore = dayJobs.filter(j => new Date(j.scheduledDate).getHours() < START_H).length;
  const outOfRangeAfter  = dayJobs.filter(j => new Date(j.scheduledDate).getHours() >= END_H).length;

  // Outreach / follow-ups
  const { data: followUps = [], isLoading: followUpsLoading } = useQuery<any[]>({
    queryKey: ['/api/follow-ups/due'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/follow-ups/due');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: segment === 'outreach',
  });

  const skipFollowUp = useMutation({
    mutationFn: async ({ quoteId, dayIndex }: { quoteId: number; dayIndex: number }) => {
      await apiRequest('POST', `/api/follow-ups/${quoteId}/skip`, { dayIndex });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/follow-ups/due'] }),
  });

  const goToToday = () => {
    setWeekOffset(0);
    const todayIdx = Array.from({ length: 7 }, (_, i) =>
      addDays(startOfWeek(now, { weekStartsOn: 1 }), i)
    ).findIndex(d => isToday(d));
    setDayIdx(todayIdx >= 0 ? todayIdx : 0);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow} numberOfLines={1}>Week {format(weekStart, 'w')} · {format(weekStart, 'MMMM yyyy')}</Text>
          <Text style={s.title} numberOfLines={1}>Your week</Text>
        </View>
        <TouchableOpacity
          style={[s.iconBtn, showSearch && s.iconBtnActive]}
          activeOpacity={0.7}
          onPress={() => {
            setShowSearch(v => !v);
            setSearchQuery('');
          }}
        >
          <Search size={18} color={showSearch ? '#fff' : c.ink} strokeWidth={2.1} />
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} activeOpacity={0.8} onPress={() => router.push('/jobs/create' as any)}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Segment toggle */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: c.paperDeep, borderRadius: 14, padding: 3 }}>
          {(['calendar', 'outreach'] as const).map((seg) => {
            const active = segment === seg;
            return (
              <TouchableOpacity
                key={seg}
                onPress={() => setSegment(seg)}
                activeOpacity={0.7}
                style={{
                  flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? c.card : 'transparent',
                  shadowColor: active ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: active ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: active ? c.ink : c.muted }}>
                  {seg === 'calendar' ? 'Calendar' : 'Outreach'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showSearch && (
        <View style={s.searchBar}>
          <Search size={15} color={c.muted} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search jobs or customers…"
            placeholderTextColor={c.muted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <X size={14} color={c.muted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {segment === 'outreach' ? (
        /* ── Outreach view ── */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
          {followUpsLoading ? (
            <ActivityIndicator color={c.orange} style={{ marginTop: 40 }} />
          ) : followUps.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60, gap: 10 }}>
              <Text style={{ fontSize: 28 }}>🎉</Text>
              <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink }}>All caught up</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, textAlign: 'center' }}>
                No follow-ups due today
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12, paddingTop: 4 }}>
              {followUps.map((item: any, i: number) => {
                let content: any = {};
                try { content = JSON.parse(item.quote?.content || '{}'); } catch {}
                const custName = content.customerName || `Quote #${item.quote?.id}`;
                const jobTitle = content.jobTitle || 'Quote';
                const total = item.quote?.totalAmount ? `$${parseFloat(item.quote.totalAmount).toLocaleString()}` : '';
                const initials = custName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <View key={i} style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.lineSoft }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.orange }}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink }} numberOfLines={1}>{custName}</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted }} numberOfLines={1}>
                          {jobTitle}{total ? ` · ${total}` : ''}
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: c.orangeSoft, borderWidth: 1, borderColor: `${c.orange}44` }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.orange }}>Day {item.dayNumber}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: c.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        activeOpacity={0.8}
                        onPress={() => router.push(
                          `/customers/compose?customerId=${item.quote?.customerId || ''}&customerName=${encodeURIComponent(custName)}&context=quote_followup&quoteId=${item.quote?.id || ''}&dayIndex=${item.dueIndex ?? ''}` as any
                        )}
                      >
                        <Send size={14} color="#fff" strokeWidth={2} />
                        <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>Send</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ height: 42, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        activeOpacity={0.7}
                        onPress={() => skipFollowUp.mutate({ quoteId: item.quote?.id, dayIndex: item.dueIndex })}
                      >
                        <SkipForward size={14} color={c.muted} strokeWidth={2} />
                        <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.muted }}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
      /* ── Calendar view ── */
      <View style={{ flex: 1 }}>

      {/* Week navigation + strip */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <TouchableOpacity
            style={[s.iconBtn, { width: 44, height: 44, borderRadius: 12 }]}
            onPress={() => { setWeekOffset(o => o - 1); setDayIdx(0); }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          {weekOffset !== 0 && (
            <TouchableOpacity
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft }}
              onPress={goToToday}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.orange }}>Today</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[s.iconBtn, { width: 44, height: 44, borderRadius: 12 }]}
            onPress={() => { setWeekOffset(o => o + 1); setDayIdx(0); }}
            activeOpacity={0.7}
          >
            <ChevronRight size={16} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {days.map((d, i) => {
            const active = dayIdx === i;
            const count = jobCountPerDay[i];
            const dateKey = format(d, 'yyyy-MM-dd');
            const dayWeather = weatherByDate[dateKey];
            return (
              <TouchableOpacity key={i} onPress={() => setDayIdx(i)} activeOpacity={0.7}
                style={[s.dayCell, active && s.dayCellActive]}>
                <Text style={[s.dayLabel, active && { color: 'rgba(255,255,255,0.7)', opacity: 1 }]}>
                  {format(d, 'EEE').toUpperCase()}
                </Text>
                <Text style={[s.dayNum, active && { color: '#fff' }]}>{format(d, 'd')}</Text>
                {dayWeather ? (
                  <Text style={{ fontSize: 11, lineHeight: 14, marginTop: 1 }}>{dayWeather.weather_icon}</Text>
                ) : (
                  <View style={{ height: 14 }} />
                )}
                {count > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                      <View key={k} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: active ? 'rgba(255,255,255,0.7)' : c.orange }} />
                    ))}
                  </View>
                ) : (
                  <View style={{ height: 6 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Day headline */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
        <Text style={s.dayHeadline}>
          {format(selectedDay, 'EEEE d MMM')} ·{' '}
          <Text style={{ color: c.orange }}>{dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}</Text>
        </Text>
        {dayJobs.length > 0 && (
          <Text style={s.daySubhead}>
            {format(new Date(dayJobs[0].scheduledDate), 'h:mm a')} → {format(new Date(dayJobs[dayJobs.length - 1].scheduledDate), 'h:mm a')} · {
              (() => {
                const total = dayJobs.reduce((acc: number, j: any) => acc + (j.estimatedDuration || 60), 0);
                const h = Math.floor(total / 60);
                const m = total % 60;
                return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
              })()
            } booked
          </Text>
        )}
      </View>

      {/* Out-of-range indicators */}
      {outOfRangeBefore > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft }}>
            <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.muted }}>
              ↑ {outOfRangeBefore} job{outOfRangeBefore > 1 ? 's' : ''} before 6am
            </Text>
          </View>
        </View>
      )}

      {/* Hour grid */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} />}
      >
        <View style={{ paddingLeft: 52, paddingRight: 8, position: 'relative', overflow: 'visible' }}>
          <View style={{ paddingLeft: 44, position: 'relative', overflow: 'visible' }}>
            {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
              <View key={i} style={[s.hourLine, { top: i * HOUR_H }]}>
                <Text style={s.hourLabel}>{START_H + i}:00</Text>
              </View>
            ))}

            {showNow && (
              <View style={{ position: 'absolute', left: -44, right: 12, top: nowTop, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
                <Text style={s.nowLabel}>{format(now, 'HH:mm')}</Text>
                <View style={s.nowDot} />
                <View style={s.nowBar} />
              </View>
            )}

            {dayJobs.map((job: any, i: number) => {
              const startH = getJobHour(job.scheduledDate);
              const durationHrs = (job.estimatedDuration || 60) / 60;
              const endH_ = startH + durationHrs;
              const top = (startH - START_H) * HOUR_H;
              const height = Math.max(durationHrs * HOUR_H, 36);
              // Same-time jobs render side-by-side instead of stacking invisibly
              const overlapIdxs = dayJobs
                .map((other: any, j: number) => {
                  const oStart = getJobHour(other.scheduledDate);
                  const oEnd = oStart + (other.estimatedDuration || 60) / 60;
                  return oStart < endH_ && oEnd > startH ? j : -1;
                })
                .filter((j: number) => j >= 0);
              const cols = overlapIdxs.length;
              const col = overlapIdxs.indexOf(i);
              const isCompleted = job.status === 'completed';
              const isNext = i === 0 && !isCompleted;
              const bg = isNext ? (isDark ? c.card : '#0f0e0b') : c.card;
              const fg = isNext ? (isDark ? c.ink : '#fff') : c.ink;
              const subFg = isNext ? (isDark ? c.muted : 'rgba(255,255,255,0.6)') : c.muted;
              const timeFg = isNext ? (isDark ? c.muted : 'rgba(255,255,255,0.6)') : c.muted;
              const border = isNext ? 'transparent' : c.lineSoft;

              return (
                <TouchableOpacity key={job.id}
                  onPress={() => router.push(`/jobs/${job.id}`)}
                  activeOpacity={0.8}
                  style={[{
                    position: 'absolute', borderRadius: 12,
                    left: cols > 1 ? (`${(100 / cols) * col}%` as any) : 0,
                    width: cols > 1 ? (`${100 / cols}%` as any) : undefined,
                    right: cols > 1 ? undefined : 12,
                    paddingHorizontal: cols > 1 ? 8 : 12, paddingVertical: 8, borderWidth: 1, overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
                    top, height, backgroundColor: bg, borderColor: border,
                    opacity: isCompleted ? 0.4 : 1,
                  }]}>
                  {isNext && (
                    <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: `${c.orange}40` }} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isNext && (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.orange, shadowColor: c.orange, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 3 }} />
                    )}
                    {isCompleted && (
                      <Text style={{ fontSize: 10, color: c.muted }}>✓</Text>
                    )}
                    <Text style={[s.eventTime, { color: timeFg }]}>
                      {formatTime(startH)} – {formatTime(endH_)}
                    </Text>
                  </View>
                  <Text style={[s.eventTitle, { color: fg }]} numberOfLines={1}>{job.title}</Text>
                  {job.customerName ? (
                    <Text style={[s.eventSub, { color: subFg }]} numberOfLines={1}>{job.customerName}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}

            <View style={{ height: (END_H - START_H + 1) * HOUR_H }} />
          </View>
        </View>
        {outOfRangeAfter > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft }}>
              <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.muted }}>
                ↓ {outOfRangeAfter} job{outOfRangeAfter > 1 ? 's' : ''} after 8pm
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      </View>
      )}
    </SafeAreaView>
  );
}
