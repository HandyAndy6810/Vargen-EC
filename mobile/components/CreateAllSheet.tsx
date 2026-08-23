import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';
import { User, FileText, CalendarClock, X, Check } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

export type CreateAllPlan = {
  scheduledDate: Date | null;
  createCustomer: boolean;
  /** Possibly corrected here — voice can mishear a name or a phone number */
  customer: { name: string; phone: string; email: string; address: string };
};

/**
 * Final review before anything is written. AI can mishear a price or a day, and
 * money and the calendar are the two things you cannot have quietly wrong — so
 * the customer, quote and schedule are all shown for a glance-and-confirm
 * rather than being created straight off the back of a voice prompt.
 */
export function CreateAllSheet({
  visible,
  onClose,
  onConfirm,
  busy,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  isExistingCustomer,
  jobTitle,
  total,
  itemCount,
  initialScheduledISO,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (plan: CreateAllPlan) => void;
  busy: boolean;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  isExistingCustomer: boolean;
  jobTitle: string;
  total: number;
  itemCount: number;
  initialScheduledISO?: string;
}) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const seeded = initialScheduledISO && !isNaN(new Date(initialScheduledISO).getTime())
    ? new Date(initialScheduledISO)
    : null;

  const [scheduleOn, setScheduleOn] = useState(!!seeded);
  const [day, setDay] = useState<Date>(seeded ?? new Date());
  const [hour, setHour] = useState<number>(seeded ? seeded.getHours() : 8);

  // Editable customer details — the whole point of the review step is catching
  // a misheard name or phone number before it's written to the database.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone ?? '');
  const [email, setEmail] = useState(customerEmail ?? '');
  const [address, setAddress] = useState(customerAddress ?? '');

  useEffect(() => {
    if (!visible) return;
    const s2 = initialScheduledISO && !isNaN(new Date(initialScheduledISO).getTime())
      ? new Date(initialScheduledISO) : null;
    setScheduleOn(!!s2);
    setDay(s2 ?? new Date());
    setHour(s2 ? s2.getHours() : 8);
    setEditing(false);
    setName(customerName);
    setPhone(customerPhone ?? '');
    setEmail(customerEmail ?? '');
    setAddress(customerAddress ?? '');
  }, [visible, initialScheduledISO, customerName, customerPhone, customerEmail, customerAddress]);

  const scheduledDate = scheduleOn ? setMinutes(setHours(startOfDay(day), hour), 0) : null;
  const canCreateCustomer = !isExistingCustomer && !!name.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <TouchableOpacity style={s.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={c.mutedHi} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={s.title}>Ready to create</Text>
          <Text style={s.sub}>Have a quick look before this is saved.</Text>

          <ScrollView style={{ alignSelf: 'stretch', marginTop: 16 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
            {/* Customer — tap Edit to correct anything voice got wrong */}
            <View style={[s.row, editing && { alignItems: 'flex-start' }]}>
              <View style={[s.rowIcon, { backgroundColor: c.greenSoft }]}>
                <User size={17} color={c.green} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.rowLabel}>Customer</Text>
                  <TouchableOpacity
                    onPress={() => setEditing(e => !e)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={editing ? 'Done editing customer' : 'Edit customer details'}
                  >
                    <Text style={s.editLink}>{editing ? 'Done' : 'Edit'}</Text>
                  </TouchableOpacity>
                </View>

                {editing ? (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <TextInput
                      style={s.input} value={name} onChangeText={setName}
                      placeholder="Name" placeholderTextColor={c.muted}
                    />
                    <TextInput
                      style={s.input} value={phone} onChangeText={setPhone}
                      placeholder="Phone" placeholderTextColor={c.muted} keyboardType="phone-pad"
                    />
                    <TextInput
                      style={s.input} value={email} onChangeText={setEmail}
                      placeholder="Email" placeholderTextColor={c.muted}
                      keyboardType="email-address" autoCapitalize="none"
                    />
                    <TextInput
                      style={s.input} value={address} onChangeText={setAddress}
                      placeholder="Site address" placeholderTextColor={c.muted}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={s.rowValue} numberOfLines={1}>{name.trim() || 'Not named'}</Text>
                    {(phone || email || address) ? (
                      <Text style={s.rowMeta} numberOfLines={2}>
                        {[phone, email, address].filter(Boolean).join('  ·  ')}
                      </Text>
                    ) : (
                      <Text style={s.rowMeta}>No contact details — tap Edit to add</Text>
                    )}
                  </>
                )}
              </View>
              {!editing && (
                <Text style={s.tag}>{isExistingCustomer ? 'Existing' : canCreateCustomer ? 'New' : '—'}</Text>
              )}
            </View>

            {/* Quote */}
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: c.orangeSoft }]}>
                <FileText size={17} color={c.orange} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowLabel}>Quote</Text>
                <Text style={s.rowValue} numberOfLines={1}>{jobTitle || 'Untitled quote'}</Text>
                <Text style={s.rowMeta}>{itemCount} {itemCount === 1 ? 'line item' : 'line items'}</Text>
              </View>
              <Text style={s.amount}>${total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            {/* Schedule */}
            <View style={[s.row, { alignItems: 'flex-start' }]}>
              <View style={[s.rowIcon, { backgroundColor: c.blueSoft }]}>
                <CalendarClock size={17} color={c.blue} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.rowLabel}>Schedule a job</Text>
                  <TouchableOpacity
                    onPress={() => setScheduleOn(v => !v)}
                    style={[s.toggle, scheduleOn && { backgroundColor: c.orange, borderColor: c.orange }]}
                    accessibilityRole="button"
                    accessibilityLabel={scheduleOn ? 'Turn off scheduling' : 'Turn on scheduling'}
                  >
                    <Text style={[s.toggleText, scheduleOn && { color: '#fff' }]}>{scheduleOn ? 'On' : 'Off'}</Text>
                  </TouchableOpacity>
                </View>

                {scheduleOn ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)).map((d, i) => {
                          const active = format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                          return (
                            <TouchableOpacity key={i} onPress={() => setDay(d)} style={[s.chip, active && s.chipActive]}>
                              <Text style={[s.chipText, active && s.chipTextActive]}>
                                {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE d')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {HOURS.map(h => (
                          <TouchableOpacity key={h} onPress={() => setHour(h)} style={[s.chip, hour === h && s.chipActive]}>
                            <Text style={[s.chipText, hour === h && s.chipTextActive]}>
                              {format(setHours(startOfDay(new Date()), h), 'h a')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Text style={s.rowMeta}>
                      {scheduledDate ? format(scheduledDate, 'EEE d MMM · h:mm a') : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={s.rowMeta}>No job will be scheduled.</Text>
                )}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[s.confirmBtn, busy && { opacity: 0.6 }]}
            onPress={() => onConfirm({
              scheduledDate,
              createCustomer: canCreateCustomer,
              customer: { name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() },
            })}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create everything"
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Check size={18} color="#fff" strokeWidth={2.6} />
                <Text style={s.confirmText}>Create it all</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.paper,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
    alignItems: 'center', maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineMid, marginBottom: 8 },
  closeBtn: {
    position: 'absolute', top: 14, right: 16, width: 36, height: 36, borderRadius: 12,
    backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 14, letterSpacing: -0.4 },
  sub: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  rowValue: { fontSize: 14.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 2, letterSpacing: -0.2 },
  rowMeta: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 3 },
  tag: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi,
    letterSpacing: 1.2, textTransform: 'uppercase', flexShrink: 0,
  },
  editLink: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  input: {
    backgroundColor: c.paperDeep, borderRadius: 10, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  amount: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3, flexShrink: 0 },
  toggle: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineMid,
  },
  toggleText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineMid,
  },
  chipActive: { backgroundColor: c.ink, borderColor: c.ink },
  chipText: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  chipTextActive: { color: c.paper },
  confirmBtn: {
    alignSelf: 'stretch', height: 54, borderRadius: 16, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  confirmText: { fontSize: 15.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
