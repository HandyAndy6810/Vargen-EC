import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenGradient, GlassButton, RimCard, heroSecondary } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { ChevronLeft, Phone, MessageSquare, Mail, MapPin, FileText, Pencil, Trash2, History } from 'lucide-react-native';
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';
import { CustomerHistory } from '@/components/CustomerHistory';


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
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const insets = useSafeAreaInsets();
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
          <Text style={{ color: c.muted, fontFamily: 'HostGrotesk_500Medium' }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: c.orange, fontFamily: 'HostGrotesk_700Bold' }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ color: c.muted, fontFamily: 'HostGrotesk_500Medium' }}>
            {isError ? 'Couldn\'t load customer — check your connection' : 'Customer not found'}
          </Text>
          {isError && (
            <TouchableOpacity
              onPress={() => refetch()}
              style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: c.orange }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: '#fff' }}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const avatarLabel = initials(isEditing ? (editName || customer.name) : customer.name);

  // Company and customer type arrive with the customer details work; shown
  // whenever they're there.
  const extra = customer as typeof customer & { companyName?: string | null; customerType?: string | null };
  const subLine = [extra.companyName, extra.customerType ? TYPE_LABEL[extra.customerType] ?? extra.customerType : null]
    .filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
        <ScreenGradient intensity="soft" id="customerGradient" />

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 6 }]}>
          {isEditing ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsEditing(false)}
              style={({ pressed }) => [s.textBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.textBtnLabel}>Cancel</Text>
            </Pressable>
          ) : (
            <GlassButton label="Go back" onPress={() => router.back()}>
              <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
            </GlassButton>
          )}
          <View style={{ flex: 1 }} />
          {isEditing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save customer"
              onPress={handleSaveEdit}
              disabled={isSaving || !editName.trim()}
              style={({ pressed }) => [s.textBtn, { backgroundColor: c.orange, borderColor: c.orange }, (pressed || !editName.trim()) && { opacity: 0.75 }]}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[s.textBtnLabel, { color: '#fff' }]}>Save</Text>}
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <GlassButton label="Edit customer" onPress={startEditing}>
                <Pencil size={17} color={c.ink} strokeWidth={2.1} />
              </GlassButton>
              <GlassButton label="Delete customer" onPress={handleDelete}>
                <Trash2 size={17} color={c.red} strokeWidth={2.1} />
              </GlassButton>
            </View>
          )}
        </View>

        {/* Hero */}
        <View style={s.hero}>
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
              accessibilityLabel="Customer name"
            />
          ) : (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={2}>{customer.name}</Text>
              {subLine ? <Text style={s.heroSub} numberOfLines={1}>{subLine}</Text> : null}
              {customer.address ? (
                <Text style={s.heroSub} numberOfLines={2}>{customer.address}</Text>
              ) : null}
            </View>
          )}
        </View>

        {isEditing ? (
          /* ── Edit form ── */
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Text style={s.sectionEyebrow}>Contact details</Text>
            <View style={s.card}>
              <View style={s.editRow}>
                <View style={s.detailIcon}><Phone size={15} color={c.ink} strokeWidth={2} /></View>
                <TextInput
                  style={s.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                  placeholderTextColor={c.muted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[s.editRow, s.divider]}>
                <View style={s.detailIcon}><Mail size={15} color={c.ink} strokeWidth={2} /></View>
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
              <View style={[s.editRow, s.divider]}>
                <View style={s.detailIcon}><MapPin size={15} color={c.ink} strokeWidth={2} /></View>
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
                style={{ fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.ink, minHeight: 80, textAlignVertical: 'top' }}
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
              {[
                customer.phone ? { key: 'call', Icon: Phone, label: 'Call', onPress: () => openCall(customer.phone!) } : null,
                (customer.phone || customer.email) ? {
                  key: 'msg', Icon: MessageSquare, label: 'Message',
                  onPress: () => router.push(`/customers/compose?customerId=${id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone ?? '')}&customerEmail=${encodeURIComponent(customer.email ?? '')}` as any),
                } : null,
                customer.email ? { key: 'email', Icon: Mail, label: 'Email', onPress: () => openEmail(customer.email!) } : null,
                { key: 'quote', Icon: FileText, label: 'Quote', onPress: () => router.push(`/quotes/create?customerName=${encodeURIComponent(customer.name)}&customerId=${customer.id}` as any) },
                { key: 'log', Icon: History, label: 'Log', onPress: () => router.push(`/customers/messages?id=${id}` as any) },
              ].filter(Boolean).map((a) => {
                const { key, Icon, label, onPress } = a!;
                return (
                  <RimCard key={key} padding="none" onPress={onPress} accessibilityLabel={label} style={s.actionBtn}>
                    <View style={s.actionIcon}><Icon size={18} color={c.paper} strokeWidth={2.1} /></View>
                    <Text style={s.actionLabel}>{label}</Text>
                  </RimCard>
                );
              })}
            </View>

            {/* Contact details */}
            <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
              <Text style={s.sectionEyebrow}>Contact details</Text>
              <View style={s.card}>
                {customer.phone ? (
                  <TouchableOpacity style={s.detailRow} onPress={() => openCall(customer.phone!)}>
                    <View style={s.detailIcon}><Phone size={15} color={c.ink} strokeWidth={2} /></View>
                    <Text style={s.detailText}>{customer.phone}</Text>
                    <Text style={s.detailAction}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {customer.email ? (
                  <TouchableOpacity style={[s.detailRow, { borderTopWidth: customer.phone ? StyleSheet.hairlineWidth * 2 : 0, borderTopColor: c.lineSoft }]} onPress={() => openEmail(customer.email!)}>
                    <View style={s.detailIcon}><Mail size={15} color={c.ink} strokeWidth={2} /></View>
                    <Text style={s.detailText}>{customer.email}</Text>
                    <Text style={s.detailAction}>Email</Text>
                  </TouchableOpacity>
                ) : null}
                {customer.address ? (
                  <TouchableOpacity style={[s.detailRow, { borderTopWidth: (customer.phone || customer.email) ? StyleSheet.hairlineWidth * 2 : 0, borderTopColor: c.lineSoft }]} onPress={() => openMaps(customer.address!)}>
                    <View style={s.detailIcon}><MapPin size={15} color={c.ink} strokeWidth={2} /></View>
                    <Text style={[s.detailText, { flex: 1 }]}>{customer.address}</Text>
                    <Text style={s.detailAction}>Maps</Text>
                  </TouchableOpacity>
                ) : null}
                {!customer.phone && !customer.email && !customer.address ? (
                  <View style={s.detailRow}>
                    <Text style={{ fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.muted }}>No contact details on file</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Notes */}
            {customer.notes ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text style={s.sectionEyebrow}>Notes</Text>
                <View style={[s.card, { padding: 14 }]}>
                  <Text style={{ fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi, lineHeight: 20 }}>{customer.notes}</Text>
                </View>
              </View>
            ) : null}

            <CustomerHistory customerId={Number(id)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const TYPE_LABEL: Record<string, string> = {
  residential: 'Residential', commercial: 'Commercial', real_estate: 'Real estate', strata: 'Strata', builder: 'Builder',
};

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  textBtn: {
    height: 40, minWidth: 64, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.62)',
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.9)',
  },
  textBtnLabel: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 },
  // Graphite with orange initials in both modes, as on Home and Profile.
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1C1D21',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...(isDark ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' } : null),
  },
  avatarText: { fontSize: 22, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orange, letterSpacing: -0.3 },
  name: { fontSize: 28, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.9, lineHeight: 32 },
  heroSub: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginTop: 3 },
  editNameInput: {
    flex: 1, fontSize: 24, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.5,
    borderBottomWidth: 2, borderBottomColor: c.orange, paddingBottom: 4,
  },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.fillStrong, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  sectionEyebrow: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: c.mutedHi, marginBottom: 8, marginLeft: 2 },
  card: { ...rimTile(c, isDark), overflow: 'hidden' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  detailIcon: {
    width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,29,33,0.06)',
  },
  detailText: { flex: 1, fontSize: 14, fontFamily: 'HostGrotesk_600SemiBold', color: c.ink },
  detailAction: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: c.orangeDeep },
  editInput: { flex: 1, fontSize: 15, fontFamily: 'HostGrotesk_600SemiBold', color: c.ink, paddingVertical: 2 },
});
