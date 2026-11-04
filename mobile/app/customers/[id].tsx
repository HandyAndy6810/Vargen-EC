import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useMemo, useRef, type ReactElement } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenGradient, GlassButton, RimCard, heroSecondary, wellFill } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { showAlert, showConfirm } from '@/lib/dialogs';
import {
  ChevronLeft, ChevronRight, Phone, MessageSquare, Mail, MapPin, FileText, Pencil, Trash2, History,
  KeyRound, Receipt, Building2, PenLine,
} from 'lucide-react-native';
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';
import { CustomerHistory } from '@/components/CustomerHistory';
import { CustomerForm, customerToForm, formToCustomer, customerFormProblem, type CustomerFormValue } from '@/components/CustomerForm';
import { customerTypeLabel, formatAbn, PREFERRED_CONTACT_LABELS, type PreferredContact } from '@shared/customer-fields';


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

/**
 * One customer (round 2, c2), in the order a tradie reaches for things:
 * who they are, how to reach them, what's been done for them, then the
 * details and notes.
 */
export default function CustomerDetailScreen() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: customer, isLoading, isError, refetch } = useCustomer(Number(id));
  const { mutate: updateCustomer, isPending: isSaving } = useUpdateCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();
  const scrollRef = useRef<ScrollView>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<CustomerFormValue | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const startEditing = () => {
    if (!customer) return;
    setForm(customerToForm(customer));
    setFormError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!form) return;
    const problem = customerFormProblem(form);
    if (problem) { setFormError(problem); return; }
    updateCustomer(
      { id: Number(id), data: formToCustomer(form) as any },
      {
        onSuccess: () => { setIsEditing(false); setFormError(null); },
        onError: (err: any) => setFormError(err?.message || 'Could not save changes. Check your connection and try again.'),
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

  const typeLabel = customerTypeLabel(customer.customerType);
  const preferred = customer.preferredContact as PreferredContact | null;
  const preferredLabel = preferred && PREFERRED_CONTACT_LABELS[preferred]
    ? `Prefers ${PREFERRED_CONTACT_LABELS[preferred].toLowerCase()}`
    : null;
  const billingDiffers = !!customer.billingAddress && customer.billingAddress.trim() !== (customer.address || '').trim();

  // Quick actions; the preferred way to reach them goes first.
  const actions = [
    customer.phone ? { key: 'call' as const, Icon: Phone, label: 'Call', onPress: () => openCall(customer.phone!) } : null,
    customer.phone ? { key: 'sms' as const, Icon: MessageSquare, label: 'Text', onPress: () => openSMS(customer.phone!) } : null,
    customer.email ? { key: 'email' as const, Icon: Mail, label: 'Email', onPress: () => openEmail(customer.email!) } : null,
    {
      key: 'quote' as const, Icon: FileText, label: 'New quote',
      onPress: () => router.push(`/quotes/create?customerName=${encodeURIComponent(customer.name)}&customerId=${customer.id}` as any),
    },
  ].filter(Boolean).sort((a, b) => Number(b!.key === preferred) - Number(a!.key === preferred));

  const detailRow = (
    key: string, Icon: any, text: string, action: string | null, onPress: (() => void) | null, first: boolean, sub?: string,
  ) => {
    const body = (
      <>
        <View style={s.detailIcon}><Icon size={15} color={c.ink} strokeWidth={2} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {sub ? <Text style={s.detailSub}>{sub}</Text> : null}
          <Text style={s.detailText}>{text}</Text>
        </View>
        {action ? <Text style={s.detailAction}>{action}</Text> : onPress ? <ChevronRight size={16} color={c.muted} strokeWidth={2} /> : null}
      </>
    );
    return onPress ? (
      <Pressable key={key} style={({ pressed }) => [s.detailRow, !first && s.divider, pressed && { backgroundColor: wellFill(isDark) }]} onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    ) : (
      <View key={key} style={[s.detailRow, !first && s.divider]}>{body}</View>
    );
  };

  const contactRows = [
    customer.phone ? (f: boolean) => detailRow('phone', Phone, customer.phone!, 'Call', () => openCall(customer.phone!), f) : null,
    customer.email ? (f: boolean) => detailRow('email', Mail, customer.email!, 'Email', () => openEmail(customer.email!), f) : null,
    customer.companyName || customer.abn
      ? (f: boolean) => detailRow('company', Building2, [customer.companyName, customer.abn ? `ABN ${formatAbn(customer.abn)}` : null].filter(Boolean).join('\n'), null, null, f, 'Company')
      : null,
    customer.address ? (f: boolean) => detailRow('site', MapPin, customer.address!, 'Maps', () => openMaps(customer.address!), f, 'Site address') : null,
    billingDiffers ? (f: boolean) => detailRow('billing', Receipt, customer.billingAddress!, null, null, f, 'Billing address (on invoices)') : null,
    (f: boolean) => detailRow('compose', PenLine, 'Write a message', null,
      () => router.push(`/customers/compose?customerId=${id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone ?? '')}&customerEmail=${encodeURIComponent(customer.email ?? '')}` as any), f),
    (f: boolean) => detailRow('log', History, 'Contact log', null, () => router.push(`/customers/messages?id=${id}` as any), f),
  ].filter(Boolean) as ((first: boolean) => ReactElement)[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
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
              disabled={isSaving}
              style={({ pressed }) => [s.textBtn, { backgroundColor: c.orange, borderColor: c.orange }, pressed && { opacity: 0.75 }]}
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

        {isEditing && form ? (
          <>
            <Text style={s.editTitle}>Edit {customer.name}</Text>
            {formError ? <Text style={s.formError}>{formError}</Text> : null}
            <CustomerForm
              value={form}
              onChange={(v) => { setForm(v); if (formError) setFormError(null); }}
              scrollRef={scrollRef}
              nameError={formError && !form.name.trim() ? formError : null}
            />
          </>
        ) : (
          <>
            {/* 1. Who they are */}
            <View style={s.hero}>
              <View style={s.avatarWrap}>
                <Text style={s.avatarText}>{initials(customer.name)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={2}>{customer.name}</Text>
                {customer.companyName ? <Text style={s.heroSub} numberOfLines={1}>{customer.companyName}</Text> : null}
                {typeLabel || preferredLabel ? (
                  <View style={s.chipRow}>
                    {typeLabel ? <View style={s.chip}><Text style={s.chipText}>{typeLabel}</Text></View> : null}
                    {preferredLabel ? <View style={s.chip}><Text style={s.chipText}>{preferredLabel}</Text></View> : null}
                  </View>
                ) : null}
              </View>
            </View>

            {/* 2. Reach them, or quote them */}
            <View style={s.actionsRow}>
              {actions.map((a) => {
                const { key, Icon, label, onPress } = a!;
                const isPreferred = key === preferred;
                return (
                  <RimCard
                    key={key}
                    padding="none"
                    onPress={onPress}
                    accessibilityLabel={isPreferred ? `${label} (preferred)` : label}
                    style={[s.actionBtn, isPreferred && { borderColor: c.orange, borderTopColor: c.orange }]}
                  >
                    <View style={[s.actionIcon, isPreferred && { backgroundColor: c.orange }]}>
                      <Icon size={18} color={isPreferred ? '#fff' : c.paper} strokeWidth={2.1} />
                    </View>
                    <Text style={s.actionLabel} numberOfLines={1}>{label}</Text>
                  </RimCard>
                );
              })}
            </View>

            {/* 3. Everything done for them */}
            <CustomerHistory customerId={Number(id)} />

            {/* 4. Details, addresses, access */}
            <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
              <Text style={s.sectionEyebrow}>Contact details</Text>
              <View style={s.card}>
                {contactRows.map((row, i) => row(i === 0))}
              </View>
            </View>

            {customer.accessNotes ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text style={s.sectionEyebrow}>Access notes</Text>
                <View style={[s.card, s.accessCard]}>
                  <KeyRound size={16} color={c.orangeDeep} strokeWidth={2.2} style={{ marginTop: 2 }} />
                  <Text style={s.notesText}>{customer.accessNotes}</Text>
                </View>
              </View>
            ) : null}

            {/* 5. Notes */}
            {customer.notes ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text style={s.sectionEyebrow}>Notes</Text>
                <View style={[s.card, { padding: 16 }]}>
                  <Text style={s.notesText}>{customer.notes}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  textBtn: {
    height: 40, minWidth: 64, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.62)',
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.9)',
  },
  textBtnLabel: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  editTitle: { fontSize: 24, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.6, paddingHorizontal: 20, paddingTop: 8 },
  formError: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: c.red, paddingHorizontal: 22, paddingTop: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 },
  // Graphite with orange initials in both modes, as on Home and Profile.
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1C1D21',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...(isDark ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' } : null),
  },
  avatarText: { fontSize: 22, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orange, letterSpacing: -0.3 },
  name: { fontSize: 28, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.9, lineHeight: 32 },
  heroSub: { fontSize: 14, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.62)',
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.9)',
  },
  chipText: { fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.fillStrong, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  sectionEyebrow: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: c.mutedHi, marginBottom: 8, marginLeft: 2 },
  card: { ...rimTile(c, isDark), overflow: 'hidden' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  detailIcon: {
    width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    backgroundColor: wellFill(isDark),
  },
  detailSub: { fontSize: 12, fontFamily: 'HostGrotesk_600SemiBold', color: c.muted, marginBottom: 1 },
  detailText: { fontSize: 14, fontFamily: 'HostGrotesk_600SemiBold', color: c.ink, lineHeight: 20 },
  detailAction: { fontSize: 13, fontFamily: 'HostGrotesk_700Bold', color: c.orangeDeep },
  accessCard: { flexDirection: 'row', gap: 10, padding: 16, alignItems: 'flex-start' },
  notesText: { flex: 1, fontSize: 14, fontFamily: 'HostGrotesk_500Medium', color: c.ink, lineHeight: 21 },
});
