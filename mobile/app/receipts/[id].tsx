import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, Check } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { useReceipt, useUpdateReceipt, useDeleteReceipt } from '@/hooks/use-receipts';

const CATEGORIES = ['Materials', 'Equipment', 'Fuel', 'Subcontractor', 'Food', 'Other'] as const;

export default function ReceiptDetailScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = id ? Number(id) : 0;
  const { data: receipt, isLoading } = useReceipt(receiptId) as any;
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();

  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');

  const prefilled = useRef(false);
  useEffect(() => {
    if (!receipt || prefilled.current) return;
    prefilled.current = true;
    setVendor(receipt.vendor || '');
    setDate(receipt.receiptDate || '');
    setAmount(receipt.totalAmount || '');
    setCategory(receipt.category || 'Other');
    setNotes(receipt.notes || '');
  }, [receipt]);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) {
      showAlert('Invalid amount', 'Please enter a valid total amount.');
      return;
    }
    if (date) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(date) || isNaN(new Date(date).getTime())) {
        showAlert('Invalid date', 'Use the format YYYY-MM-DD (e.g. 2026-07-06).');
        return;
      }
    }
    updateReceipt.mutate(
      {
        id: receiptId,
        vendor: vendor || null,
        receiptDate: date || null,
        totalAmount: amount,
        category,
        notes: notes || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => showAlert('Could not save', err?.message || 'Try again.'),
      }
    );
  };

  const handleDelete = () => {
    showConfirm({
      title: 'Delete receipt?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteReceipt.mutate(receiptId, { onSuccess: () => router.back() } as any),
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={c.orange} />
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.muted }}>Receipt not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Receipt</Text>
            <Text style={s.title} numberOfLines={1}>{receipt.vendor || 'Unknown vendor'}</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Delete receipt">
            <Trash2 size={18} color={c.red} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Vendor / Supplier</Text>
            <TextInput style={s.input} value={vendor} onChangeText={setVendor} placeholder="e.g. Bunnings" placeholderTextColor={c.muted} />
          </View>
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Total amount ($)</Text>
            <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={c.muted} />
          </View>
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Date</Text>
            <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-07-06" placeholderTextColor={c.muted} autoCapitalize="none" />
          </View>
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Category ${cat}`}
                  style={[s.catChip, category === cat && { backgroundColor: c.ink, borderColor: c.ink }]}
                >
                  <Text style={[s.catChipText, category === cat && { color: c.paper }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Notes</Text>
            <TextInput
              style={[s.input, { height: 88, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Job reference, what it was for…"
              placeholderTextColor={c.muted}
              multiline
            />
          </View>
        </ScrollView>

        <View style={s.saveBar}>
          <TouchableOpacity
            style={s.saveBtn}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={updateReceipt.isPending}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            {updateReceipt.isPending
              ? <ActivityIndicator color="#fff" />
              : <><Check size={18} color="#fff" strokeWidth={2.5} /><Text style={s.saveBtnText}>Save changes</Text></>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 18, fontFamily: 'Manrope_800ExtraBold',
    color: c.ink, letterSpacing: -0.4, marginTop: 2,
  },
  fieldCard: {
    backgroundColor: c.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: c.lineSoft,
  },
  fieldLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold',
    color: c.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.ink,
    paddingVertical: 6,
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineMid,
  },
  catChipText: { fontSize: 12, fontFamily: 'Manrope_700Bold', color: c.ink },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16,
    backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.lineSoft,
  },
  saveBtn: {
    height: 54, borderRadius: 18, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});
