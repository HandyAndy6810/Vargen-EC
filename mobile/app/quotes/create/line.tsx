import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuoteDraft, unitSell, type LineItem } from '@/hooks/use-quote-draft';
import { hapticPress } from '@/lib/haptics';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Adding and editing a line, as a real iOS sheet rather than a hand-built one.
 *
 * The native presentation brings the grabber, the drag-to-resize detents, the
 * rubber-banding and the keyboard behaviour for free — all of which had to be
 * approximated before, and one of those approximations is what put the old editor
 * up under the status bar with its fields overlapping.
 *
 * `index` is the line being edited, or "new" to add one.
 */
export default function LineEditorSheet() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = useQuoteDraft();
  const { index, category } = useLocalSearchParams<{ index?: string; category?: string }>();

  const isNew = index === 'new' || index == null;
  const editIndex = isNew ? null : Number(index);

  const [line, setLine] = useState<LineItem>(() => {
    if (editIndex != null && d.lines[editIndex]) return { ...d.lines[editIndex] };
    // A new line inherits the group it was added from, so "Add labour" gives hours
    // rather than a material priced by the each.
    const isLabour = category === 'labour';
    return {
      name: '', qty: '1', price: '', cost: '',
      unit: isLabour ? 'hr' : 'ea',
      category: isLabour ? 'labour' : 'material',
    };
  });

  const set = (patch: Partial<LineItem>) => setLine(prev => ({ ...prev, ...patch }));
  const canSave = !!line.name.trim();

  const onSave = () => {
    if (!canSave) return;
    hapticPress();
    d.upsertLine(editIndex, line);
    router.back();
  };

  const onDelete = () => {
    if (editIndex == null) return;
    d.removeLine(editIndex);
    router.back();
  };

  return (
    <View style={s.wrap}>
      <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>{isNew ? 'Add line item' : 'Edit line item'}</Text>

        <Text style={s.fieldLabel}>Description</Text>
        <TextInput
          style={[s.input, { minHeight: 62, textAlignVertical: 'top' }]}
          value={line.name}
          onChangeText={v => set({ name: v })}
          placeholder="e.g. 25mm copper elbow x4"
          placeholderTextColor={c.muted}
          multiline
          autoFocus
        />

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Qty</Text>
            <TextInput
              style={s.input}
              value={line.qty}
              onChangeText={v => set({ qty: v })}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={c.muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Unit</Text>
            <TextInput
              style={s.input}
              value={line.unit ?? ''}
              onChangeText={v => set({ unit: v })}
              placeholder="ea"
              placeholderTextColor={c.muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Your cost</Text>
            <TextInput
              style={s.input}
              value={line.cost ?? ''}
              onChangeText={v => set({ cost: v })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={c.muted}
            />
          </View>
        </View>

        <Text style={s.hint}>
          Charged at {money(unitSell(line, d.markupPct))} each with your {Math.round(d.markupPct)}% markup.
        </Text>

        <View style={s.actions}>
          {editIndex != null ? (
            <TouchableOpacity
              style={s.deleteBtn}
              activeOpacity={0.8}
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete this line item"
            >
              <Trash2 size={16} color="#d23b3b" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[s.saveBtn, !canSave && { opacity: 0.45 }]}
            activeOpacity={0.85}
            disabled={!canSave}
            onPress={onSave}
          >
            <Text style={s.saveText}>{isNew ? 'Add item' : 'Save item'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.paper },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  title: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginBottom: 16 },
  fieldLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  hint: { fontSize: 12.5, fontFamily: 'Manrope_600SemiBold', color: c.muted, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  deleteBtn: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.redSoft,
  },
  saveBtn: {
    flex: 1, height: 52, borderRadius: 16, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
