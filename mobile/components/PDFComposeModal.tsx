import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FileText, X, Share2 } from 'lucide-react-native';

const ORANGE      = '#f26a2a';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const MUTED       = 'rgba(20,19,16,0.50)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShare: (customMessage: string, notes: string) => void;
  documentType: 'quote' | 'invoice';
  documentNumber: string;
  customerName?: string;
  jobTitle?: string;
  totalAmount: number;
  initialNotes?: string;
  isPending?: boolean;
}

export default function PDFComposeModal({
  visible,
  onClose,
  onShare,
  documentType,
  documentNumber,
  customerName,
  jobTitle,
  totalAmount,
  initialNotes = '',
  isPending = false,
}: Props) {
  const isInvoice = documentType === 'invoice';
  const docLabel  = isInvoice ? 'Invoice' : 'Quote';
  const num       = `${isInvoice ? 'INV' : 'Q'}-${documentNumber}`;

  // Use local state seeded from props every time the modal opens
  const [customMessage, setCustomMessage] = React.useState('');
  const [notes, setNotes]                 = React.useState(initialNotes);

  // Re-seed notes when modal opens with new data
  React.useEffect(() => {
    if (visible) {
      setCustomMessage('');
      setNotes(initialNotes);
    }
  }, [visible, initialNotes]);

  const amt = totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={s.sheet}>
            {/* Handle */}
            <View style={s.handle} />

            {/* Header row */}
            <View style={s.headerRow}>
              <View style={s.docBadge}>
                <FileText size={18} color={ORANGE} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.docLabel}>{docLabel} · {num}</Text>
                {jobTitle ? <Text style={s.docTitle} numberOfLines={1}>{jobTitle}</Text> : null}
              </View>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.closeBtn}>
                <X size={18} color={MUTED_HI} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Summary strip */}
            <View style={s.summaryStrip}>
              <View style={{ flex: 1 }}>
                <Text style={s.summaryLabel}>Customer</Text>
                <Text style={s.summaryValue}>{customerName || 'No customer'}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.summaryLabel}>Total</Text>
                <Text style={[s.summaryValue, { color: ORANGE }]}>${amt}</Text>
              </View>
            </View>

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Custom message field */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Message to customer</Text>
                <Text style={s.fieldHint}>Optional — appears at the top of the PDF</Text>
                <TextInput
                  style={s.textArea}
                  placeholder={`Hi ${customerName?.split(' ')[0] || 'there'}, please find your ${docLabel.toLowerCase()} attached…`}
                  placeholderTextColor={MUTED}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Notes / terms */}
              <View style={[s.field, { marginTop: 4 }]}>
                <Text style={s.fieldLabel}>Notes &amp; terms</Text>
                <Text style={s.fieldHint}>Appears at the bottom of the PDF</Text>
                <TextInput
                  style={s.textArea}
                  placeholder="Payment terms, job details, warranty info…"
                  placeholderTextColor={MUTED}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* CTA */}
            <View style={s.footer}>
              <TouchableOpacity
                style={[s.shareBtn, isPending && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={() => onShare(customMessage, notes)}
                disabled={isPending}
              >
                {isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Share2 size={18} color="#fff" strokeWidth={2} />}
                <Text style={s.shareBtnText}>
                  {isPending ? 'Generating…' : `Share ${docLabel} PDF`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Need React for hooks inside the component
import React from 'react';

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PAPER,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(20,19,16,0.15)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  docBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff1eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: LINE_SOFT,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  fieldHint: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginBottom: 7,
  },
  textArea: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: INK,
    minHeight: 80,
  },
  footer: {
    marginTop: 16,
  },
  shareBtn: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  shareBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
