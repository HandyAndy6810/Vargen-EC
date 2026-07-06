import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showConfirm } from '@/lib/dialogs';
import { ChevronLeft, Plus, Trash2, Pencil, Check, X, BookOpen } from 'lucide-react-native';
import { usePriceBook, useCreatePriceBookItem, useUpdatePriceBookItem, useDeletePriceBookItem, PriceBookItem } from '@/hooks/use-price-book';


const UNITS = ['each', 'hr', 'm', 'lm', 'sqm', 'm³', 'kg', 'lot', 'roll'];

interface FormState {
  description: string;
  unit: string;
  price: string;
  supplier: string;
  category: string;
}

const EMPTY_FORM: FormState = { description: '', unit: 'each', price: '', supplier: '', category: '' };

export default function PriceBookScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: items = [], isLoading } = usePriceBook();
  const createMutation = useCreatePriceBookItem();
  const updateMutation = useUpdatePriceBookItem();
  const deleteMutation = useDeletePriceBookItem();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() =>
    items.reduce<Record<string, PriceBookItem[]>>((acc, item) => {
      const key = item.category || 'Uncategorised';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {}),
    [items]
  );

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowAddForm(true);
  };

  const startEdit = (item: PriceBookItem) => {
    setShowAddForm(false);
    setEditingId(item.id);
    setForm({
      description: item.description,
      unit: item.unit,
      price: item.price,
      supplier: item.supplier || '',
      category: item.category || '',
    });
    setError(null);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const saveAdd = async () => {
    if (!form.description.trim()) return setError('Description is required');
    if (!form.price.trim() || isNaN(parseFloat(form.price))) return setError('Enter a valid price');
    setError(null);
    try {
      await createMutation.mutateAsync({
        description: form.description.trim(),
        unit: form.unit,
        price: form.price.trim(),
        supplier: form.supplier.trim() || undefined,
        category: form.category.trim() || undefined,
      });
      setShowAddForm(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || 'Could not save — check your connection and try again.');
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!form.description.trim()) return setError('Description is required');
    if (!form.price.trim() || isNaN(parseFloat(form.price))) return setError('Enter a valid price');
    setError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        description: form.description.trim(),
        unit: form.unit,
        price: form.price.trim(),
        supplier: form.supplier.trim() || undefined,
        category: form.category.trim() || undefined,
      });
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || 'Could not save — check your connection and try again.');
    }
  };

  const confirmDelete = (item: PriceBookItem) => {
    showConfirm({
      title: 'Delete item',
      message: `Remove "${item.description}" from your price book?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Settings</Text>
            <Text style={s.title}>Price book</Text>
          </View>
          <TouchableOpacity onPress={startAdd} activeOpacity={0.7} style={s.addBtn} accessibilityRole="button" accessibilityLabel="Add price book item">
            <Plus size={18} color={c.orange} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

          {/* Info banner */}
          <View style={s.infoBanner}>
            <BookOpen size={16} color={c.orangeDeep} strokeWidth={2} />
            <Text style={s.infoText}>
              Items you add here are injected into every AI quote. The AI uses your exact prices instead of generic estimates.
            </Text>
          </View>

          {/* Add form */}
          {showAddForm && (
            <View style={s.formCard}>
              <Text style={s.formTitle}>New item</Text>
              {error && <Text style={s.errorText}>{error}</Text>}
              <ItemForm form={form} setForm={setForm} />
              <View style={s.formActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={cancelForm} activeOpacity={0.7}>
                  <X size={15} color={c.mutedHi} strokeWidth={2} />
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={saveAdd}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Check size={15} color="#fff" strokeWidth={2.5} />
                      <Text style={s.saveBtnText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Loading */}
          {isLoading && (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color={c.orange} />
            </View>
          )}

          {/* Empty state */}
          {!isLoading && items.length === 0 && !showAddForm && (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No prices saved yet</Text>
              <Text style={s.emptySubtitle}>
                Add the materials and parts you use regularly. The AI will use your exact prices whenever they match a quote item.
              </Text>
              <TouchableOpacity style={s.emptyAddBtn} onPress={startAdd} activeOpacity={0.8}>
                <Plus size={16} color="#fff" strokeWidth={2.5} />
                <Text style={s.emptyAddBtnText}>Add first item</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Grouped items */}
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <View key={category} style={{ marginBottom: 20 }}>
              <Text style={s.categoryLabel}>{category}</Text>
              <View style={s.itemsCard}>
                {categoryItems.map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 && <View style={s.divider} />}
                    {editingId === item.id ? (
                      <View style={{ padding: 12 }}>
                        {error && <Text style={s.errorText}>{error}</Text>}
                        <ItemForm form={form} setForm={setForm} />
                        <View style={[s.formActions, { marginTop: 8 }]}>
                          <TouchableOpacity style={s.cancelBtn} onPress={cancelForm} activeOpacity={0.7}>
                            <X size={14} color={c.mutedHi} strokeWidth={2} />
                            <Text style={s.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
                            onPress={saveEdit}
                            disabled={isSaving}
                            activeOpacity={0.8}
                          >
                            {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                              <>
                                <Check size={14} color="#fff" strokeWidth={2.5} />
                                <Text style={s.saveBtnText}>Save</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={s.itemRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.itemDescription} numberOfLines={1}>{item.description}</Text>
                          <Text style={s.itemMeta}>
                            {item.unit}{item.supplier ? ` · ${item.supplier}` : ''}
                          </Text>
                        </View>
                        <Text style={s.itemPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                        <TouchableOpacity onPress={() => startEdit(item)} style={s.iconBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={`Edit ${item.description}`}>
                          <Pencil size={14} color={c.muted} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item)} style={s.iconBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={`Delete ${item.description}`}>
                          <Trash2 size={14} color={c.red} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ItemForm({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const set = (key: keyof FormState) => (val: string) => setForm({ ...form, [key]: val });
  return (
    <View style={{ gap: 8 }}>
      <TextInput
        style={s.input}
        placeholder="Description (e.g. Rheem 315L HWS)"
        placeholderTextColor={c.muted}
        value={form.description}
        onChangeText={set('description')}
        returnKeyType="next"
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.inputLabel}>Price ($)</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            placeholderTextColor={c.muted}
            value={form.price}
            onChangeText={set('price')}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.inputLabel}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setForm({ ...form, unit: u })}
                  style={[s.unitChip, form.unit === u && s.unitChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.unitChipText, form.unit === u && s.unitChipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder="Supplier (optional)"
          placeholderTextColor={c.muted}
          value={form.supplier}
          onChangeText={set('supplier')}
          returnKeyType="next"
        />
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder="Category (optional)"
          placeholderTextColor={c.muted}
          value={form.category}
          onChangeText={set('category')}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 22, fontFamily: 'Manrope_800ExtraBold',
    color: c.ink, letterSpacing: -0.5, marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: c.orangeSoft, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(242,106,42,0.35)', marginBottom: 20,
  },
  infoText: {
    flex: 1, fontSize: 12.5, fontFamily: 'Manrope_500Medium',
    color: c.orangeDeep, lineHeight: 18,
  },
  categoryLabel: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 8,
  },
  itemsCard: {
    backgroundColor: c.card, borderRadius: 18,
    borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  itemDescription: {
    fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink,
  },
  itemMeta: {
    fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2,
  },
  itemPrice: {
    fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink,
    minWidth: 64, textAlign: 'right',
  },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: c.paperDeep, alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: c.lineSoft, marginHorizontal: 14 },
  formCard: {
    backgroundColor: c.card, borderRadius: 18, borderWidth: 1,
    borderColor: c.lineMid, padding: 16, marginBottom: 20,
  },
  formTitle: {
    fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginBottom: 12,
  },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: {
    flex: 1, height: 40, borderRadius: 12, backgroundColor: c.paperDeep,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  cancelBtnText: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  saveBtn: {
    flex: 2, height: 40, borderRadius: 12, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveBtnText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  errorText: {
    fontSize: 12, fontFamily: 'Manrope_600SemiBold',
    color: c.red, marginBottom: 8,
  },
  input: {
    backgroundColor: c.paperDeep, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  inputLabel: {
    fontSize: 10, fontFamily: 'Manrope_700Bold',
    color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  unitChip: {
    height: 34, paddingHorizontal: 10, borderRadius: 10,
    backgroundColor: c.paperDeep, alignItems: 'center', justifyContent: 'center',
  },
  unitChipActive: { backgroundColor: c.orange },
  unitChipText: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  unitChipTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted,
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  emptyAddBtn: {
    height: 48, paddingHorizontal: 24, borderRadius: 16,
    backgroundColor: c.orange, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  emptyAddBtnText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
