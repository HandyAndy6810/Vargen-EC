import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { useQuery } from '@tanstack/react-query';
import { useJob } from '@/hooks/use-jobs';
import { useCustomer } from '@/hooks/use-customers';
import { apiRequest } from '@/lib/api';
import { api, buildUrl } from '@shared/mobile-routes';
import { ChevronLeft, MoreHorizontal, Phone, MessageSquare, Navigation, CheckCircle2 } from 'lucide-react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import { format } from 'date-fns';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const RED         = '#d23b3b';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id ? Number(id) : 0) as any;
  const { data: customer } = useCustomer(job?.customerId || 0) as any;

  const jobId = id ? Number(id) : 0;
  const { data: reconciliation } = useQuery({
    queryKey: [api.jobs.reconciliation.path, jobId],
    queryFn: async () => {
      const url = buildUrl(api.jobs.reconciliation.path, { id: jobId });
      const res = await apiRequest('GET', url);
      if (!res.ok) throw new Error('Failed to fetch reconciliation');
      return res.json();
    },
    enabled: !!jobId && job?.status === 'completed',
  }) as any;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  const title = job?.title || 'Untitled job';
  const customerName = customer?.name || job?.customerName || null;
  const address = job?.address || customer?.address || null;
  const notes = job?.description || null;

  const initials = customerName ? customerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  const scheduledDate = job?.scheduledDate ? new Date(job.scheduledDate) : null;
  const estimatedMins = job?.estimatedDuration || 0;
  const estimatedHrs  = estimatedMins / 60;
  const durationLabel = estimatedMins
    ? estimatedMins < 60
      ? `${estimatedMins}m estimated`
      : `${estimatedHrs % 1 === 0 ? estimatedHrs : estimatedHrs.toFixed(1)}h estimated`
    : null;

  const handlePhone = () => {
    const phone = customer?.phone;
    if (!phone) { showAlert('No phone number', 'This customer has no phone number on file.'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = () => {
    const phone = customer?.phone;
    if (!phone) { showAlert('No phone number', 'This customer has no phone number on file.'); return; }
    Linking.openURL(`sms:${phone}`);
  };

  const handleNavigate = () => {
    const dest = address;
    if (!dest) { showAlert('No address', 'This job has no address on file.'); return; }
    const encoded = encodeURIComponent(dest);
    Linking.openURL(`maps://?q=${encoded}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encoded}`)
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/calendar')} activeOpacity={0.7} style={s.backBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Job · J-{String(id).slice(-2)}</Text>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {job?.status && (
            <View style={[s.statusBadge, job.status === 'completed' && s.statusBadgeDone, job.status === 'cancelled' && s.statusBadgeCancelled]}>
              <Text style={[s.statusBadgeText, job.status === 'completed' && { color: GREEN }, job.status === 'cancelled' && { color: RED }]}>
                {job.status === 'completed' ? 'Completed' : job.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
              </Text>
            </View>
          )}
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
              <Path d="M0 80 Q 100 60, 200 90 T 400 100" stroke="#b4c4c8" strokeWidth="28" fill="none" />
              <Path d="M0 80 Q 100 60, 200 90 T 400 100" stroke="white" strokeWidth="3" fill="none" strokeDasharray="8,6" />
              <Circle cx="60" cy="95" r="10" fill={ORANGE} />
              <Circle cx="60" cy="95" r="10" fill="none" stroke="white" strokeWidth="2" />
              <Polygon points="330,60 340,90 350,60" fill={INK} />
            </Svg>
            {address && (
              <View style={s.mapDistPill}>
                <Text style={s.mapDistText} numberOfLines={1}>{address}</Text>
              </View>
            )}
          </View>

          {/* Schedule card */}
          {scheduledDate ? (
            <View style={[s.card, { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={s.calIcon}>
                <Text style={s.calDay}>{format(scheduledDate, 'EEE').toUpperCase()}</Text>
                <Text style={s.calNum}>{format(scheduledDate, 'd')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.schedTime}>{format(scheduledDate, 'h:mm a')}</Text>
                {durationLabel && <Text style={s.schedSub}>{durationLabel}</Text>}
              </View>
            </View>
          ) : (
            <View style={[s.card, { marginTop: 14 }]}>
              <Text style={s.schedSub}>No date scheduled</Text>
            </View>
          )}

          {/* Customer card */}
          {customerName ? (
            <View style={[s.card, { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={s.custAvatar}>
                <Text style={s.custAvatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.custName}>{customerName}</Text>
                {address && <Text style={s.custAddr} numberOfLines={1}>{address}</Text>}
              </View>
              <TouchableOpacity style={s.iconAction} activeOpacity={0.7} onPress={handlePhone}>
                <Phone size={16} color={INK} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconAction} activeOpacity={0.7} onPress={handleMessage}>
                <MessageSquare size={16} color={INK} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : address ? (
            <View style={[s.card, { marginTop: 10 }]}>
              <Text style={s.custAddr}>{address}</Text>
            </View>
          ) : null}

          {/* Profit check */}
          {reconciliation?.available ? (() => {
            const r = reconciliation;
            const actualCost = (r.actualLabourCost || 0) + (r.actualMaterialCost || 0);
            const profitColor = (r.realProfit ?? 0) > 0 ? GREEN : RED;

            const varianceParts: string[] = [];
            if (r.hoursVariance != null) {
              const abs = Math.abs(r.hoursVariance);
              if (abs > 0.05) {
                varianceParts.push(
                  `Took ${abs.toFixed(1)} hrs ${r.hoursVariance > 0 ? 'longer' : 'less'} than quoted`
                );
              } else {
                varianceParts.push('Right on the estimated hours');
              }
            }
            if (r.realMarginPercent != null) {
              varianceParts.push(`real margin came in at ${r.realMarginPercent.toFixed(0)}%`);
            }
            const varianceLine = varianceParts.length
              ? varianceParts.join(' — ').replace(/^./, c => c.toUpperCase())
              : null;

            return (
              <>
                <Text style={s.sectionEyebrow}>Profit check</Text>
                <View style={s.card}>
                  <View style={s.profitStatsRow}>
                    <View style={s.profitStat}>
                      <Text style={s.profitStatLabel}>Quoted</Text>
                      <Text style={s.profitStatValue}>
                        {r.quotedAmount != null ? fmt(r.quotedAmount) : '—'}
                      </Text>
                    </View>
                    <View style={s.profitStat}>
                      <Text style={s.profitStatLabel}>Actual cost</Text>
                      <Text style={s.profitStatValue}>{fmt(actualCost)}</Text>
                    </View>
                    <View style={s.profitStat}>
                      <Text style={s.profitStatLabel}>Real profit</Text>
                      <Text style={[s.profitStatValue, { color: profitColor }]}>
                        {r.realProfit != null ? fmt(r.realProfit) : '—'}
                        {r.realMarginPercent != null && (
                          <Text style={s.profitStatPct}> ({r.realMarginPercent.toFixed(0)}%)</Text>
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={s.profitBreakdownRow}>
                    <Text style={s.profitBreakdownText}>
                      Labour {fmt(r.actualLabourCost || 0)}
                      {r.actualHours != null ? ` (${r.actualHours}h)` : ''}
                      {'  ·  '}
                      Materials {fmt(r.actualMaterialCost || 0)}
                    </Text>
                  </View>

                  {varianceLine && (
                    <Text style={s.profitVarianceText}>{varianceLine}.</Text>
                  )}
                </View>
              </>
            );
          })() : null}

          {/* Notes */}
          {notes ? (
            <>
              <Text style={s.sectionEyebrow}>Job notes</Text>
              <View style={s.card}>
                <Text style={s.notesText}>{notes}</Text>
              </View>
            </>
          ) : null}

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
        <TouchableOpacity style={s.navBtn} activeOpacity={0.7} onPress={handleNavigate}>
          <Navigation size={15} color={INK} strokeWidth={2.2} />
          <Text style={s.navBtnText}>Navigate</Text>
        </TouchableOpacity>
        {job?.status === 'completed' ? (
          <TouchableOpacity
            style={[s.startBtn, { backgroundColor: GREEN }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/invoices/create?jobId=${id}` as any)}
          >
            <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
            <Text style={s.startBtnText}>Make invoice</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.startBtn}
            activeOpacity={0.8}
            onPress={() => router.push(`/jobs/complete?id=${id}`)}
          >
            <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
            <Text style={s.startBtnText}>Finish job</Text>
          </TouchableOpacity>
        )}
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
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: ORANGE_SOFT,
  },
  statusBadgeDone: { backgroundColor: GREEN_SOFT },
  statusBadgeCancelled: { backgroundColor: '#fde5e5' },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE_DEEP,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  profitStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profitStat: {
    flex: 1,
  },
  profitStatLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
    marginBottom: 2,
  },
  profitStatValue: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.2,
  },
  profitStatPct: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  profitBreakdownRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LINE_SOFT,
  },
  profitBreakdownText: {
    fontSize: 11.5,
    fontFamily: 'Manrope_500Medium',
    color: MUTED_HI,
  },
  profitVarianceText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
    marginTop: 8,
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
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(247,244,238,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
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
