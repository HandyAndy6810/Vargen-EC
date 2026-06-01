import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, MessageSquare, Mail, MapPin, FileText, Pencil, Trash2 } from 'lucide-react-native';
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';

const ORANGE      = '#f26a2a';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const BLACK       = '#0f0e0b';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
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
  const { mutate: updateCustomer, isPending: isSaving } = useUpdateCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName]       = useState('');
  const [editPhone, setEditPhone]     = useState('');
  const [editEmail, setEditEmail]     = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes]     = useState('');

  const startEditing = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
    setEditNotes(customer.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    updateCustomer(
      { id: Number(id), data: {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
      }},
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = () => {
    if (!customer) return;
    Alert.alert(
      'Delete customer?',
      `Remove ${customer.name} and all their contact history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          deleteCustomer(Number(id), { onSuccess: () => router.back() });
        }},
      ]
    );
  };

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

  const avatarLabel = initials(isEditing ? (editName || customer.name) : customer.name);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={s.header}>
          {isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              style={[s.navBtn, { width: 'auto', paddingHorizontal: 14 }]}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: MUTED }}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={s.navBtn}>
              <ChevronLeft size={18} color={INK} strokeWidth={2.1} />
            </TouchableOpacity>
          )}
          <Text style={s.headerTitle}>{isEditing ? 'Edit customer' : 'Customer'}</Text>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={isSaving || !editName.trim()}
              style={[s.navBtn, { width: 'auto', paddingHorizontal: 14, backgroundColor: ORANGE, borderColor: ORANGE }]}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#fff' }}>Save</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={startEditing} style={s.navBtn}>
                <Pencil size={15} color={INK} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={s.navBtn}>
                <Trash2 size={15} color={ORANGE} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.avatarWrap}>
            <Text style={s.avatarText}>{avatarLabel}</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={s.editNameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Customer name"
              placeholderTextColor={MUTED}
              autoCapitalize="words"
              autoFocus
              textAlign="center"
            />
          ) : (
            <>
              <Text style={s.name}>{customer.name}</Text>
              {customer.address ? (
                <Text style={s.heroSub} numberOfLines={2}>{customer.address}</Text>
              ) : null}
            </>
          )}
        </View>

        {isEditing ? (
          /* ── Edit form ── */
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Text style={s.sectionEyebrow}>Contact details</Text>
            <View style={s.card}>
              <View style={s.editRow}>
                <View style={s.detailIcon}><Phone size={15} color={ORANGE} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                  placeholderTextColor={MUTED}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[s.editRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <View style={s.detailIcon}><Mail size={15} color={BLUE} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email"
                  placeholderTextColor={MUTED}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={[s.editRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                <View style={s.detailIcon}><MapPin size={15} color={MUTED} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address"
                  placeholderTextColor={MUTED}
                />
              </View>
            </View>

            <Text style={[s.sectionEyebrow, { marginTop: 18 }]}>Notes</Text>
            <View style={[s.card, { padding: 14 }]}>
              <TextInput
                style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: INK, minHeight: 80, textAlignVertical: 'top' }}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Gate codes, preferences, parking…"
                placeholderTextColor={MUTED}
                multiline
              />
            </View>
          </View>
        ) : (
          /* ── View mode ── */
          <>
            {/* Quick actions */}
            <View style={s.actionsRow}>
              {customer.phone ? (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: GREEN_SOFT }]} onPress={() => openCall(customer.phone!)}>
                  <Phone size={20} color={GREEN} strokeWidth={2} />
                  <Text style={[s.actionLabel, { color: GREEN }]}>Call</Text>
                </TouchableOpacity>
              ) : null}
              {(customer.phone || customer.email) ? (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: ORANGE_SOFT }]}
                  onPress={() => router.push(`/customers/compose?customerId=${id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone ?? '')}&customerEmail=${encodeURIComponent(customer.email ?? '')}` as any)}
                >
                  <MessageSquare size={20} color={ORANGE} strokeWidth={2} />
                  <Text style={[s.actionLabel, { color: ORANGE }]}>Message</Text>
                </TouchableOpacity>
              ) : null}
              {customer.email ? (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: BLUE_SOFT }]} onPress={() => openEmail(customer.email!)}>
                  <Mail size={20} color={BLUE} strokeWidth={2} />
                  <Text style={[s.actionLabel, { color: BLUE }]}>Email</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: PAPER_DEEP }]}
                onPress={() => router.push(`/quotes/create?customerName=${encodeURIComponent(customer.name)}&customerId=${customer.id}` as any)}
              >
                <FileText size={20} color={INK} strokeWidth={2} />
                <Text style={[s.actionLabel, { color: INK }]}>Quote</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#f3e8ff' }]}
                onPress={() => router.push(`/customers/messages?id=${id}` as any)}
              >
                <MessageSquare size={20} color="#7c3aed" strokeWidth={2} />
                <Text style={[s.actionLabel, { color: '#7c3aed' }]}>Log</Text>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    height: 40,
    minWidth: 40,
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
  editNameInput: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
    paddingBottom: 4,
    paddingHorizontal: 8,
    minWidth: 200,
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  editInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
    paddingVertical: 2,
  },
});
