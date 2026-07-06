import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft, Camera, ImageIcon, RotateCw, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '@/lib/api';
import { useCreateReceipt } from '@/hooks/use-receipts';


const CATEGORIES = ['Materials', 'Equipment', 'Fuel', 'Subcontractor', 'Food', 'Other'] as const;

interface ScanResult {
  vendor: string;
  date: string;
  total: string;
  category: string;
  items: Array<{ description: string; amount: number }>;
  notes: string;
}

type Step = 'capture' | 'scanning' | 'review';

export default function ScanReceiptScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [step, setStep] = useState<Step>('capture');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanFailed, setScanFailed] = useState(false);

  // Review form fields
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ description: string; amount: number }>>([]);

  const createReceipt = useCreateReceipt();

  const cycleCategory = () => {
    const idx = CATEGORIES.indexOf(category as any);
    setCategory(CATEGORIES[(idx + 1) % CATEGORIES.length]);
  };

  const populateForm = (result: ScanResult) => {
    setVendor(result.vendor || '');
    setDate(result.date || '');
    setAmount(result.total || '0');
    setCategory(CATEGORIES.includes(result.category as any) ? result.category : 'Other');
    setNotes(result.notes || '');
    setLineItems(result.items || []);
  };

  const scanImage = async (base64: string) => {
    setStep('scanning');
    try {
      const res = await apiRequest('POST', '/api/receipts/scan', {
        imageBase64: base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`,
      });
      if (res.ok) {
        const data: ScanResult = await res.json();
        setScanResult(data);
        setScanFailed(false);
        populateForm(data);
      } else {
        // Scan failed — go to review with empty fields, but say so
        setScanResult(null);
        setScanFailed(true);
      }
    } catch {
      // Network error — go to review with empty fields, but say so
      setScanResult(null);
      setScanFailed(true);
    }
    setStep('review');
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission required', 'Camera access is needed to scan receipts.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      await scanImage(result.assets[0].base64);
    }
  };

  const handleLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission required', 'Photo library access is needed to choose a receipt image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      await scanImage(result.assets[0].base64);
    }
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      showAlert('Invalid amount', 'Please enter a valid total amount.');
      return;
    }
    if (date && isNaN(new Date(date).getTime())) {
      showAlert('Invalid date', 'Use the format 2026-07-06, or leave it blank.');
      return;
    }
    try {
      await createReceipt.mutateAsync({
        vendor: vendor || undefined,
        receiptDate: date || undefined,
        totalAmount: amount,
        category: category || undefined,
        notes: notes || undefined,
        items: lineItems.length > 0 ? JSON.stringify(lineItems) : undefined,
      });
      router.replace('/receipts' as any);
    } catch (err: any) {
      const msg = err?.message || 'Could not save receipt. Please try again.';
      showAlert('Save failed', msg);
    }
  };

  // ── Step 1: Capture ───────────────────────────────────────────────────────
  if (step === 'capture') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={22} color={c.ink} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Scan Receipt</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={s.captureIconCircle}>
              <Camera size={36} color={c.orange} strokeWidth={1.5} />
            </View>
            <Text style={s.captureTitle}>Capture a receipt</Text>
            <Text style={s.captureSub}>
              Point your camera at a receipt or choose one from your photo library. AI will extract the details automatically.
            </Text>
          </View>

          <TouchableOpacity style={s.captureBtn} onPress={handleCamera} activeOpacity={0.85}>
            <Camera size={22} color="#fff" strokeWidth={2} />
            <Text style={s.captureBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.libraryBtn} onPress={handleLibrary} activeOpacity={0.85}>
            <ImageIcon size={22} color={c.orange} strokeWidth={2} />
            <Text style={s.libraryBtnText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignSelf: 'center', marginTop: 8, paddingVertical: 8 }}
            onPress={() => {
              setStep('review');
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.muted }}>
              Enter manually instead
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: Scanning ────────────────────────────────────────────────────────
  if (step === 'scanning') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <ActivityIndicator color={c.orange} size="large" />
          <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: c.ink }}>Scanning receipt...</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted }}>AI is extracting the details</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 2: Review ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => setStep('capture')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color={c.ink} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Review Receipt</Text>
            {scanResult ? (
              <Text style={{ fontSize: 10, fontFamily: 'Manrope_600SemiBold', color: c.orange, marginTop: 1 }}>
                AI extracted — confirm the details
              </Text>
            ) : (
              <Text style={{ fontSize: 10, fontFamily: 'Manrope_600SemiBold', color: c.muted, marginTop: 1 }}>
                Enter details manually
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => setStep('capture')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCw size={18} color={c.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {scanFailed && (
            <View style={{ backgroundColor: c.orangeSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.orange, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.orangeDeep }}>
                Couldn't read the receipt
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.orangeDeep, marginTop: 2 }}>
                The fields below are blank — enter the details manually, or go back and try a clearer photo.
              </Text>
            </View>
          )}
          {/* Vendor */}
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Vendor / Supplier</Text>
            <TextInput
              style={s.fieldInput}
              value={vendor}
              onChangeText={setVendor}
              placeholder="e.g. Bunnings Warehouse"
              placeholderTextColor={c.muted}
              returnKeyType="next"
            />
          </View>

          {/* Date */}
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Date</Text>
            <TextInput
              style={s.fieldInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={c.muted}
              returnKeyType="next"
            />
          </View>

          {/* Amount */}
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Total Amount</Text>
            <TextInput
              style={s.fieldInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={c.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Category */}
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Category</Text>
            <TouchableOpacity style={s.categoryRow} onPress={cycleCategory} activeOpacity={0.75}>
              <Text style={s.categoryValue}>{category}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: c.orange }}>
                Tap to change
              </Text>
            </TouchableOpacity>
            <View style={s.categoryChips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.categoryChip, category === cat && s.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.categoryChipText, category === cat && s.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={s.fieldCard}>
            <Text style={s.fieldLabel}>Notes</Text>
            <TextInput
              style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              placeholderTextColor={c.muted}
              multiline
              returnKeyType="done"
            />
          </View>

          {/* Line items (read-only from AI) */}
          {lineItems.length > 0 && (
            <View style={s.fieldCard}>
              <Text style={s.fieldLabel}>Line Items (from scan)</Text>
              {lineItems.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    s.lineItemRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft },
                  ]}
                >
                  <Text style={s.lineItemDesc} numberOfLines={2}>{item.description}</Text>
                  <Text style={s.lineItemAmt}>${Number(item.amount || 0).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer save button */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, createReceipt.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={createReceipt.isPending}
            activeOpacity={0.85}
          >
            {createReceipt.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={18} color="#fff" strokeWidth={2.5} />
                <Text style={s.saveBtnText}>Save Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.4,
  },
  captureIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  captureTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  captureSub: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: c.mutedHi,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: c.orange,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  captureBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: c.card,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: c.lineMid,
  },
  libraryBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: c.orange,
    letterSpacing: -0.2,
  },
  fieldCard: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.lineSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: c.ink,
    padding: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryValue: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.lineMid,
  },
  categoryChipActive: {
    backgroundColor: c.orange,
    borderColor: c.orange,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: c.mutedHi,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  lineItemDesc: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
  },
  lineItemAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(247,244,238,0.92)',
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: c.orange,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
});

