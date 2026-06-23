import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Zap, CheckCircle, ExternalLink } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { addMonths, format } from 'date-fns';

const PRO_FEATURES = [
  'Unlimited quotes & invoices',
  'AI-powered quote generation',
  'Xero integration & sync',
  'Automatic follow-up messages',
  'Customer portal',
  'Priority support',
];

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
    titleWrap: { flex: 1 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    planCard: { backgroundColor: '#141310', borderRadius: 16, padding: 20, marginHorizontal: 20, marginTop: 22, borderWidth: 1, borderColor: 'rgba(242,106,42,0.35)' },
    planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    planBadgeText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.orange, letterSpacing: 1.5, textTransform: 'uppercase' },
    planPrice: { fontSize: 36, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -1 },
    planPeriod: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.55)' },
    planRenewal: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.45)', marginTop: 6 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    featureDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    featureText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.ink, flex: 1 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    actionLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 },
    actionSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function SubscriptionScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const nextRenewal = format(addMonths(new Date(), 1), 'd MMM yyyy');

  const handleManageBilling = () => {
    const msg = 'To update your payment method, cancel, or upgrade your plan, visit the web portal at vargen.app.';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Manage billing', msg, [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Account</Text>
          <Text style={s.title}>Subscription</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Plan card */}
        <View style={s.planCard}>
          <View style={s.planBadge}>
            <Zap size={14} color={c.orange} strokeWidth={2.5} fill={c.orange} />
            <Text style={s.planBadgeText}>Pro plan</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <Text style={s.planPrice}>$39</Text>
            <Text style={[s.planPeriod, { marginBottom: 5 }]}>/month</Text>
          </View>
          <Text style={s.planRenewal}>Next renewal · {nextRenewal}</Text>
        </View>

        {/* Features */}
        <View style={s.group}>
          <Text style={s.groupLabel}>What's included</Text>
          <View style={s.card}>
            {PRO_FEATURES.map((f, i) => (
              <View key={f} style={[s.featureRow, i > 0 && s.featureDivider]}>
                <CheckCircle size={16} color={c.green} strokeWidth={2.2} />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Billing</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.actionRow} onPress={handleManageBilling} activeOpacity={0.7}>
              <ExternalLink size={18} color={c.ink} strokeWidth={2.1} />
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>Manage billing</Text>
                <Text style={s.actionSub}>Update payment method or cancel plan</Text>
              </View>
              <ChevronRight size={14} color={c.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={s.hint}>Billing is managed via the web portal at vargen.app.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
