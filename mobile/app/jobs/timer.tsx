import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  type DimensionValue,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Pause, Play, Check } from 'lucide-react-native';
import { useJob } from '@/hooks/use-jobs';

const ORANGE = '#f26a2a';
const INK    = '#141310';
const PAPER  = '#f7f4ee';
const CARD   = '#ffffff';
const BLACK  = '#0f0e0b';
const GREEN  = '#2a9d4c';
const MUTED  = 'rgba(20,19,16,0.55)';
const LINE_SOFT = 'rgba(20,19,16,0.08)';
const LINE_MID  = 'rgba(20,19,16,0.14)';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  return `${m}m`;
}

export default function JobTimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id ? Number(id) : 0) as any;

  const [sec, setSec]       = useState(0);
  const [paused, setPaused] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([]);

  // Build checklist from job description or generic steps
  const checklistItems: string[] = job?.description
    ? job.description.split('\n').map((l: string) => l.trim()).filter(Boolean)
    : ['Arrive on site', 'Complete work', 'Test & inspect', 'Clean up'];

  useEffect(() => {
    setChecks(new Array(checklistItems.length).fill(false));
  }, [checklistItems.length]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  const toggle = useCallback((i: number) => {
    setChecks(prev => prev.map((v, idx) => idx === i ? !v : v));
  }, []);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  const estimatedSecs = job?.estimatedDuration ? job.estimatedDuration * 60 : 0;
  const progress = estimatedSecs > 0 ? Math.min((sec / estimatedSecs) * 100, 100) : 0;

  const doneCount = checks.filter(Boolean).length;
  const title = job?.title || 'Job in progress';

  let paceText = '';
  if (estimatedSecs > 0) {
    const est = estimatedSecs;
    if (sec < est * 0.9)  paceText = `Est. ${formatDuration(est)} · ahead of schedule`;
    else if (sec <= est)  paceText = `Est. ${formatDuration(est)} · on pace`;
    else                  paceText = `${formatDuration(sec - est)} over estimate`;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BLACK, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BLACK }} edges={['top']}>
      {/* Dark hero */}
      <View style={s.hero}>
        <View style={s.halo} />
        <View style={{ paddingHorizontal: 20, position: 'relative' }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>On the job</Text>
              <Text style={s.heroSubtitle} numberOfLines={1}>{title}</Text>
            </View>
            <View style={[s.livePill, paused && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <View style={[s.liveDot, paused && { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
              <Text style={s.liveText}>{paused ? 'Paused' : 'Live'}</Text>
            </View>
          </View>

          {/* Elapsed clock */}
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={s.elapsedEyebrow}>Elapsed</Text>
            <Text style={s.clock}>
              {pad(h)}:{pad(m)}
              <Text style={s.clockSecs}>:{pad(secs)}</Text>
            </Text>
            {paceText ? <Text style={s.paceText}>{paceText}</Text> : null}
          </View>

          {/* Progress bar */}
          {estimatedSecs > 0 && (
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress}%` as DimensionValue }]} />
            </View>
          )}

          {/* Controls */}
          <View style={s.controls}>
            <TouchableOpacity
              style={s.controlBtn}
              activeOpacity={0.7}
              onPress={() => setPaused(p => !p)}
            >
              {paused
                ? <Play size={22} color="#fff" strokeWidth={2} fill="#fff" />
                : <Pause size={22} color="#fff" strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Checklist */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        style={{ backgroundColor: PAPER }}
      >
        <Text style={s.checkEyebrow}>
          Checklist · {doneCount} of {checklistItems.length}
        </Text>
        <View style={{ marginTop: 10, gap: 6 }}>
          {checklistItems.map((task, i) => (
            <TouchableOpacity
              key={i}
              style={s.checkRow}
              activeOpacity={0.7}
              onPress={() => toggle(i)}
            >
              <View style={[s.checkbox, checks[i] && s.checkboxDone]}>
                {checks[i] && <Check size={12} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={[s.checkLabel, checks[i] && s.checkLabelDone]}>{task}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Mark complete CTA */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.completeBtn}
          activeOpacity={0.8}
          onPress={() => router.push(`/jobs/complete?id=${id}&elapsed=${sec}` as any)}
        >
          <Check size={18} color="#fff" strokeWidth={2.5} />
          <Text style={s.completeBtnText}>Mark complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: BLACK, paddingBottom: 30, position: 'relative', overflow: 'hidden' },
  halo: {
    position: 'absolute', top: -60, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: `${ORANGE}88`, opacity: 0.5,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase',
  },
  heroSubtitle: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: '#fff', marginTop: 2 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: ORANGE,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: '#fff', letterSpacing: 1, textTransform: 'uppercase',
  },
  elapsedEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  clock: { fontSize: 72, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -3, lineHeight: 72 },
  clockSecs: { color: 'rgba(255,255,255,0.3)' },
  paceText: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.55)', marginTop: 10 },
  progressTrack: {
    height: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginHorizontal: 40,
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: ORANGE },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 28 },
  controlBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: MUTED, letterSpacing: 2, textTransform: 'uppercase',
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, backgroundColor: CARD,
    borderWidth: 1, borderColor: LINE_SOFT, borderRadius: 12,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 2, borderColor: LINE_MID,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: GREEN, borderColor: GREEN },
  checkLabel: { flex: 1, fontSize: 13, fontFamily: 'Manrope_700Bold', color: INK },
  checkLabelDone: { color: MUTED, textDecorationLine: 'line-through' },
  bottomBar: { position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30 },
  completeBtn: {
    width: '100%', height: 58, borderRadius: 22,
    backgroundColor: ORANGE, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4, shadowRadius: 30, elevation: 10,
  },
  completeBtnText: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
