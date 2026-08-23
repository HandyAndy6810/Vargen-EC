import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';
import { User, FileText, CalendarClock, X, Check } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

export type CreateAllPlan = {
  scheduledDate: Date | null;
  createCustomer: boolean;
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

  useEffect(() => {
    if (!visible) return;
    const s2 = initialScheduledISO && !isNaN(new Date(initialScheduledISO).getTime())
      ? new Date(initialScheduledISO) : null;
    setScheduleOn(!!s2);
    setDay(s2 ?? new Date());
    setHour(s2 ? s2.getHours() : 8);
  }, [visible, initialScheduledISO]);

  const scheduledDate = scheduleOn ? setMinutes(setHours(startOfDay(day), hour), 0) : null;
  const canCreateCustomer = !isExistingCustomer && !!customerName.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <TouchableOpacity style={s.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={c.mutedHi} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={s.title}>Ready to create</Text>
          <Text style={s.sub}>Have a quick look before this is saved.</Text>

          <ScrollView style={{ alignSelf: 'stretch', marginTop: 16 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
            {/* Customer */}
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: c.greenSoft }]}>
                <User size={17} color={c.green} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowLabel}>Customer</Text>
                <Text style={s.rowValue} numberOfLines={1}>{customerName.trim() || 'Not named'}</Text>
                {(customerPhone || customerAddress) ? (
                  <Text style={s.rowMeta} numberOfLines={1}>
                    {[customerPhone, customerAddress].filter(Boolean).join('  ·  ')}
                  </Text>
                ) : null}
              </View>
              <Text style={s.tag}>{isExistingCustomer ? 'Existing' : canCreateCustomer ? 'New' : '—'}</Text>
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
            onPress={() => onConfirm({ scheduledDate, createCustomer: canCreateCustomer })}
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
