import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Pause, Camera, Plus, Check } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const GREEN       = '#2a9d4c';
const MUTED       = 'rgba(20,19,16,0.55)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

const CHECKLIST = [
  { task: 'Isolate water + power',        done: true },
  { task: 'Drain old unit',               done: true },
  { task: 'Mount new HWU',                done: true },
  { task: 'Install expansion valve',      done: false },
  { task: 'Pressure test + commission',   done: false },
];
const DONE_COUNT = CHECKLIST.filter(c => c.done).length;
const ESTIMATED_SECS = 6300; // 1h 45m

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function JobTimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sec, setSec] = useState(2732); // 45:32 into the job

  useEffect(() => {
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const progress = Math.min((sec / ESTIMATED_SECS) * 100, 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BLACK }} edges={['top']}>
      {/* Dark ambient hero */}
      <View style={s_.hero}>
        {/* Pulsing orange glow */}
        <View style={s_.halo} />

        <View style={{ paddingHorizontal: 20, position: 'relative' }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={s_.backBtn}
            >
              <ChevronLeft size={18} color="#fff" strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s_.heroEyebrow}>On the job</Text>
              <Text style={s_.heroSubtitle}>Hot water swap · Dalton</Text>
            </View>
            <View style={s_.livePill}>
              <View style={s_.liveDot} />
              <Text style={s_.liveText}>Live</Text>
            </View>
          </View>

          {/* Elapsed clock */}
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={s_.elapsedEyebrow}>Elapsed</Text>
            <Text style={s_.clock}>
              {pad(h)}:{pad(m)}
              <Text style={s_.clockSecs}>:{pad(s)}</Text>
            </Text>
            <Text style={s_.paceText}>Estimated 1h 45m · on pace</Text>
          </View>

          {/* Progress bar */}
          <View style={s_.progressTrack}>
            <View style={[s_.progressFill, { width: `${progress}%` as any }]} />
          </View>

          {/* Controls */}
          <View style={s_.controls}>
            <TouchableOpacity style={s_.controlBtn} activeOpacity={0.7}>
              <Pause size={22} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s_.controlBtn} activeOpacity={0.7}>
              <Camera size={22} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s_.controlBtn} activeOpacity={0.7}>
              <Plus size={22} color="#fff" strokeWidth={2} />
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
        <Text style={s_.checkEyebrow}>Checklist · {DONE_COUNT} of {CHECKLIST.length}</Text>
        <View style={{ marginTop: 10, gap: 6 }}>
          {CHECKLIST.map((item, i) => (
            <View key={i} style={s_.checkRow}>
              <View style={[s_.checkbox, item.done && s_.checkboxDone]}>
                {item.done && <Check size={12} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={[s_.checkLabel, item.done && s_.checkLabelDone]}>
                {item.task}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Mark complete CTA */}
      <View style={s_.bottomBar}>
        <TouchableOpacity
          style={s_.completeBtn}
          activeOpacity={0.8}
          onPress={() => router.push(`/jobs/complete?id=${id}`)}
        >
          <Check size={18} color="#fff" strokeWidth={2.5} />
          <Text style={s_.completeBtnText}>Mark complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s_ = StyleSheet.create({
  hero: {
    backgroundColor: BLACK,
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${ORANGE}88`,
    opacity: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  elapsedEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  clock: {
    fontSize: 72,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -3,
    lineHeight: 72,
  },
  clockSecs: {
    color: 'rgba(255,255,255,0.3)',
  },
  paceText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginHorizontal: 40,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 28,
  },
  controlBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    borderRadius: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: LINE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  checkLabelDone: {
    color: MUTED,
    textDecorationLine: 'line-through',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  completeBtn: {
    width: '100%',
    height: 58,
    borderRadius: 22,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  completeBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
