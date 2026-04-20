import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJob } from '@/hooks/use-jobs';
import { ChevronLeft, MoreHorizontal, Phone, MessageSquare, Navigation, Play } from 'lucide-react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const GREEN       = '#2a9d4c';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id ? Number(id) : 0) as any;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  const title = job?.title || 'Hot water swap';
  const customerName = job?.customerName || 'Jack Dalton';
  const address = job?.address || '42 Harbour St, Rozelle';
  const notes = job?.notes || 'Back gate code is 4821#. Old HWU in the garage — Jack can help shift it to kerb. Bring expansion valve + teflon tape.';

  const initials = customerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Job · J-{String(id).slice(-2)}</Text>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        </View>
        <TouchableOpacity style={s.moreBtn} activeOpacity={0.7}>
          <MoreHorizontal size={18} color={INK} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>

          {/* Map placeholder */}
          <View style={s.mapCard}>
            <Svg width="100%" height="150" viewBox="0 0 400 150" style={StyleSheet.absoluteFillObject}>
              <Path
                d="M0 80 Q 100 60, 200 90 T 400 100"
                stroke="#b4c4c8"
                strokeWidth="28"
                fill="none"
              />
              <Path
                d="M0 80 Q 100 60, 200 90 T 400 100"
                stroke="white"
                strokeWidth="3"
                fill="none"
                strokeDasharray="8,6"
              />
              <Circle cx="60" cy="95" r="10" fill={ORANGE} />
              <Circle cx="60" cy="95" r="10" fill="none" stroke="white" strokeWidth="2" />
              <Polygon points="330,60 340,90 350,60" fill={INK} />
            </Svg>
            <View style={s.mapPlaceholderPill}>
              <Text style={s.mapPlaceholderText}>[map placeholder]</Text>
            </View>
            <View style={s.mapDistPill}>
              <Text style={s.mapDistText}>12 min · 6.2 km</Text>
            </View>
          </View>

          {/* Schedule card */}
          <View style={[s.card, { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={s.calIcon}>
              <Text style={s.calDay}>TUE</Text>
              <Text style={s.calNum}>21</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.schedTime}>9:30 – 11:15 am</Text>
              <Text style={s.schedSub}>1h 45m estimated</Text>
            </View>
            <TouchableOpacity style={s.reschedBtn} activeOpacity={0.7}>
              <Text style={s.reschedText}>Reschedule</Text>
            </TouchableOpacity>
          </View>

          {/* Customer card */}
          <View style={[s.card, { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={s.custAvatar}>
              <Text style={s.custAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.custName}>{customerName}</Text>
              <Text style={s.custAddr}>{address}</Text>
            </View>
            <TouchableOpacity style={s.iconAction} activeOpacity={0.7}>
              <Phone size={16} color={INK} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconAction} activeOpacity={0.7}>
              <MessageSquare size={16} color={INK} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <Text style={s.sectionEyebrow}>Job notes</Text>
          <View style={s.card}>
            <Text style={s.notesText}>{notes}</Text>
          </View>

          {/* Parts & photos */}
          <Text style={s.sectionEyebrow}>Parts & photos</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={s.photoSlot} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.navBtn} activeOpacity={0.7}>
          <Navigation size={15} color={INK} strokeWidth={2.2} />
          <Text style={s.navBtnText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.startBtn}
          activeOpacity={0.8}
          onPress={() => router.push(`/jobs/timer?id=${id}`)}
        >
          <Play size={14} color="#fff" strokeWidth={2.5} fill="#fff" />
          <Text style={s.startBtnText}>Start job</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
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
  moreBtn: {
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
  },
  title: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  mapCard: {
    height: 150,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#dce6e9',
    borderWidth: 1,
    borderColor: LINE_SOFT,
    position: 'relative',
  },
  mapPlaceholderPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapPlaceholderText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mapDistPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapDistText: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  calIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: 1,
  },
  calNum: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  schedTime: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  schedSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  reschedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
  },
  reschedText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
  },
  custName: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  custAddr: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED_HI,
    lineHeight: 20,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: PAPER_DEEP,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderStyle: 'dashed',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  navBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  startBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
