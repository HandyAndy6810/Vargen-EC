import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, MessageSquare, Mail, MapPin, FileText } from 'lucide-react-native';
import { useCustomer } from '@/hooks/use-customers';

const ORANGE      = '#f26a2a';
const ORANGE_SOFT = '#ffe6d3';
const ORANGE_DEEP = '#d94d0e';
const INK         = '#141310';
const BLACK       = '#0f0e0b';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const BLUE        = '#1f6feb';
const BLUE_SOFT   = '#eaf2ff';
const MUTED       = 'rgba(20,19,16,0.55)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function openSMS(phone: string) {
  Linking.openURL(`sms:${phone}`).catch(() =>
    Alert.alert('Cannot open Messages', 'Make sure a SIM is installed.')
  );
}

function openCall(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() =>
    Alert.alert('Cannot make call', 'Make sure a SIM is installed.')
  );
}

function openEmail(email: string) {
  Linking.openURL(`mailto:${email}`).catch(() =>
    Alert.alert('Cannot open Mail', 'No mail app found.')
  );
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  Linking.openURL(`maps://?q=${encoded}`).catch(() =>
    Linking.openURL(`https://maps.google.com/?q=${encoded}`)
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(Number(id));

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: MUTED, fontFamily: 'Manrope_500Medium' }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: ORANGE, fontFamily: 'Manrope_700Bold' }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: MUTED, fontFamily: 'Manrope_500Medium' }}>Customer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.navBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Customer</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.avatarWrap}>
            <Text style={s.avatarText}>{initials(customer.name)}</Text>
          </View>
          <Text style={s.name}>{customer.name}</Text>
          {customer.address ? (
            <Text style={s.heroSub} numberOfLines={2}>{customer.address}</Text>
          ) : null}
        </View>

        {/* Quick actions */}
        <View style={s.actionsRow}>
          {customer.phone ? (
            <>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: GREEN_SOFT }]} onPress={() => openCall(customer.phone!)}>
                <Phone size={20} color={GREEN} strokeWidth={2} />
                <Text style={[s.actionLabel, { color: GREEN }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: ORANGE_SOFT }]} onPress={() => openSMS(customer.phone!)}>
                <MessageSquare size={20} color={ORANGE} strokeWidth={2} />
                <Text style={[s.actionLabel, { color: ORANGE }]}>Message</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {customer.email ? (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: BLUE_SOFT }]} onPress={() => openEmail(customer.email!)}>
              <Mail size={20} color={BLUE} strokeWidth={2} />
              <Text style={[s.actionLabel, { color: BLUE }]}>Email</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: PAPER_DEEP }]}
            onPress={() => router.push('/quotes/create' as any)}
          >
            <FileText size={20} color={INK} strokeWidth={2} />
            <Text style={[s.actionLabel, { color: INK }]}>Quote</Text>
          </TouchableOpacity>
        </View>

        {/* Contact details */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={s.sectionEyebrow}>Contact details</Text>
          <View style={s.card}>
            {customer.phone ? (
              <TouchableOpacity style={s.detailRow} onPress={() => openCall(customer.phone!)}>
                <View style={s.detailIcon}><Phone size={15} color={ORANGE} strokeWidth={2} /></View>
                <Text style={s.detailText}>{customer.phone}</Text>
                <Text style={s.detailAction}>Call</Text>
              </TouchableOpacity>
            ) : null}
            {customer.email ? (
              <TouchableOpacity style={[s.detailRow, { borderTopWidth: customer.phone ? 1 : 0, borderTopColor: LINE_SOFT }]} onPress={() => openEmail(customer.email!)}>
                <View style={s.detailIcon}><Mail size={15} color={BLUE} strokeWidth={2} /></View>
                <Text style={s.detailText}>{customer.email}</Text>
                <Text style={[s.detailAction, { color: BLUE }]}>Email</Text>
              </TouchableOpacity>
            ) : null}
            {customer.address ? (
              <TouchableOpacity style={[s.detailRow, { borderTopWidth: (customer.phone || customer.email) ? 1 : 0, borderTopColor: LINE_SOFT }]} onPress={() => openMaps(customer.address!)}>
                <View style={s.detailIcon}><MapPin size={15} color={MUTED} strokeWidth={2} /></View>
                <Text style={[s.detailText, { flex: 1 }]}>{customer.address}</Text>
                <Text style={[s.detailAction, { color: MUTED }]}>Maps</Text>
              </TouchableOpacity>
            ) : null}
            {!customer.phone && !customer.email && !customer.address ? (
              <View style={s.detailRow}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED }}>No contact details on file</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Notes */}
        {customer.notes ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={s.sectionEyebrow}>Notes</Text>
            <View style={[s.card, { padding: 14 }]}>
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED_HI, lineHeight: 20 }}>{customer.notes}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const MUTED_HI = 'rgba(20,19,16,0.72)';

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.2,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: `${ORANGE}20`,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
  },
  name: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.6,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 4,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.3,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  detailAction: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: ORANGE,
  },
});
