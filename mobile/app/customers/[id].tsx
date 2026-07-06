import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { ChevronLeft, Phone, MessageSquare, Mail, MapPin, FileText, Pencil, Trash2 } from 'lucide-react-native';
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';


function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function openSMS(phone: string) {
  Linking.openURL(`sms:${phone}`).catch(() =>
    showAlert('Cannot open Messages', 'Could not open your messages app.')
  );
}

function openCall(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() =>
    showAlert('Cannot make call', 'Could not open the dialler.')
  );
}

function openEmail(email: string) {
  Linking.openURL(`mailto:${email}`).catch(() =>
    showAlert('Cannot open Mail', 'No mail app found.')
  );
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  Linking.openURL(`maps://?q=${encoded}`).catch(() =>
    Linking.openURL(`https://maps.google.com/?q=${encoded}`)
  );
}

export default function CustomerDetailScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: customer, isLoading, isError, refetch } = useCustomer(Number(id));
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
      {
        onSuccess: () => setIsEditing(false),
        onError: (err: any) => showAlert('Could not save changes', err?.message || 'Check your connection and try again.'),
      }
    );
  };

  const handleDelete = () => {
    if (!customer) return;
    showConfirm({
      title: 'Delete customer?',
      message: `Remove ${customer.name} and all their contact history? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteCustomer(Number(id), {
        onSuccess: () => router.back(),
        onError: (err: any) => showAlert('Could not delete', err?.message || 'Try again.'),
      }),
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.muted, fontFamily: 'Manrope_500Medium' }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: c.orange, fontFamily: 'Manrope_700Bold' }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ color: c.muted, fontFamily: 'Manrope_500Medium' }}>
            {isError ? 'Couldn\'t load customer — check your connection' : 'Customer not found'}
          </Text>
          {isError && (
            <TouchableOpacity
              onPress={() => refetch()}
              style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: c.orange }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: '#fff' }}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const avatarLabel = initials(isEditing ? (editName || customer.name) : customer.name);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={s.header}>
          {isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              style={[s.navBtn, { width: 'auto', paddingHorizontal: 14 }]}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.muted }}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.navBtn}>
              <ChevronLeft size={18} color={c.ink} strokeWidth={2.1} />
            </TouchableOpacity>
          )}
          <Text style={s.headerTitle}>{isEditing ? 'Edit customer' : 'Customer'}</Text>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={isSaving || !editName.trim()}
              style={[s.navBtn, { width: 'auto', paddingHorizontal: 14, backgroundColor: c.orange, borderColor: c.orange }]}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#fff' }}>Save</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={startEditing} style={s.navBtn}>
                <Pencil size={15} color={c.ink} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={s.navBtn}>
                <Trash2 size={15} color={c.orange} strokeWidth={2} />
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
              placeholderTextColor={c.muted}
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
                <View style={s.detailIcon}><Phone size={15} color={c.orange} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                  placeholderTextColor={c.muted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[s.editRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                <View style={s.detailIcon}><Mail size={15} color={c.blue} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email"
                  placeholderTextColor={c.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={[s.editRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                <View style={s.detailIcon}><MapPin size={15} color={c.muted} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address"
                  placeholderTextColor={c.muted}
                />
              </View>
            </View>

            <Text style={[s.sectionEyebrow, { marginTop: 18 }]}>Notes</Text>
            <View style={[s.card, { padding: 14 }]}>
              <TextInput
                style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.ink, minHeight: 80, textAlignVertical: 'top' }}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Gate codes, preferences, parking…"
                placeholderTextColor={c.muted}
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
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.greenSoft }]} onPress={() => openCall(customer.phone!)}>
                  <Phone size={20} color={c.green} strokeWidth={2} />
                  <Text style={[s.actionLabel, { color: c.green }]}>Call</Text>
                </TouchableOpacity>
              ) : null}
              {(customer.phone || customer.email) ? (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: c.orangeSoft }]}
                  onPress={() => router.push(`/customers/compose?customerId=${id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone ?? '')}&customerEmail=${encodeURIComponent(customer.email ?? '')}` as any)}
                >
                  <MessageSquare size={20} color={c.orange} strokeWidth={2} />
                  <Text style={[s.actionLabel, { color: c.orange }]}>Message</Text>
                </TouchableOpacity>
              ) : null}
              {customer.email ? (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.blueSoft }]} onPress={() => openEmail(customer.email!)}>
                  <Mail size={20} color={c.blue} strokeWidth={2} />
                  <Text style={[s.actionLabel, { color: c.blue }]}>Email</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: c.paperDeep }]}
                onPress={() => router.push(`/quotes/create?customerName=${encodeURIComponent(customer.name)}&customerId=${customer.id}` as any)}
              >
                <FileText size={20} color={c.ink} strokeWidth={2} />
                <Text style={[s.actionLabel, { color: c.ink }]}>Quote</Text>
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
                    <View style={s.detailIcon}><Phone size={15} color={c.orange} strokeWidth={2} /></View>
                    <Text style={s.detailText}>{customer.phone}</Text>
                    <Text style={s.detailAction}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {customer.email ? (
                  <TouchableOpacity style={[s.detailRow, { borderTopWidth: customer.phone ? 1 : 0, borderTopColor: c.lineSoft }]} onPress={() => openEmail(customer.email!)}>
                    <View style={s.detailIcon}><Mail size={15} color={c.blue} strokeWidth={2} /></View>
                    <Text style={s.detailText}>{customer.email}</Text>
                    <Text style={[s.detailAction, { color: c.blue }]}>Email</Text>
                  </TouchableOpacity>
                ) : null}
                {customer.address ? (
                  <TouchableOpacity style={[s.detailRow, { borderTopWidth: (customer.phone || customer.email) ? 1 : 0, borderTopColor: c.lineSoft }]} onPress={() => openMaps(customer.address!)}>
                    <View style={s.detailIcon}><MapPin size={15} color={c.muted} strokeWidth={2} /></View>
                    <Text style={[s.detailText, { flex: 1 }]}>{customer.address}</Text>
                    <Text style={[s.detailAction, { color: c.muted }]}>Maps</Text>
                  </TouchableOpacity>
                ) : null}
                {!customer.phone && !customer.email && !customer.address ? (
                  <View style={s.detailRow}>
                    <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted }}>No contact details on file</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Notes */}
            {customer.notes ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text style={s.sectionEyebrow}>Notes</Text>
                <View style={[s.card, { padding: 14 }]}>
                  <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.mutedHi, lineHeight: 20 }}>{customer.notes}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
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
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
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
    backgroundColor: `${c.orange}20`,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
  },
  name: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.6,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  editNameInput: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.5,
    borderBottomWidth: 2,
    borderBottomColor: c.orange,
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
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.lineSoft,
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
    backgroundColor: c.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: c.ink,
  },
  detailAction: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.orange,
  },
  editInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: c.ink,
    paddingVertical: 2,
  },
});
