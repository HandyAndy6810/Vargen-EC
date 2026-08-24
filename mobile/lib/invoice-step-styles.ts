import { StyleSheet } from 'react-native';
import type { Colors } from '@/hooks/use-theme';

/**
 * Invoice-specific styles shared across the stepped New Invoice screens.
 * Lifted verbatim from the old single-screen invoices/create.tsx so the look is
 * unchanged. The step chrome (progress rail, pinned footer) is QuoteStepScaffold.
 */
export const makeInvoiceStyles = (c: Colors) => StyleSheet.create({
  sectionEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 22, marginBottom: 8,
  },
  errorBox: { backgroundColor: c.redSoft, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.red },

  // Convert-from-quote
  prefillCard: {
    backgroundColor: c.orangeSoft, borderRadius: 18, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(242,106,42,0.3)', marginTop: 4,
  },
  prefillIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
  prefillEyebrow: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep, letterSpacing: 2, textTransform: 'uppercase' },
  prefillTitle: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 2 },
  prefillSub: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.orangeDeep, marginTop: 1 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid },
  typeChipActive: { backgroundColor: c.ink, borderColor: c.ink },
  typeChipText: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.mutedHi },
  typeChipTextActive: { color: c.paper },
  typeHint: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.muted, marginTop: 8, lineHeight: 17 },
  infoCard: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 11 },
  infoDot: { fontSize: 13, color: c.orange, fontFamily: 'Manrope_800ExtraBold' },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.ink },

  // Standalone fields
  input: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'Manrope_500Medium', color: c.ink,
  },
  card: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },

  labourRow: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 16 },
  labourDivider: { width: 1, backgroundColor: c.lineSoft, marginVertical: 4 },
  labourLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 },
  labourInputWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  labourUnit: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: c.muted },
  labourInput: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, textAlign: 'center', minWidth: 50 },
  labourTotal: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.orange, marginTop: 2 },

  lineEditRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14 },
  lineInput: {
    backgroundColor: c.paper, borderWidth: 1, borderColor: c.lineSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.ink,
  },
  lineTotal: { flex: 1, height: 40, backgroundColor: c.paperDeep, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  lineTotalText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  removeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.paperDeep, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.lineSoft },
  addLineBtnText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep },

  // AI suggestions
  suggestionsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingHorizontal: 4 },
  suggestionsLoadingText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.muted },
  suggestionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 2 },
  suggestionsTitle: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep, letterSpacing: 0.5, textTransform: 'uppercase' },
  suggestionsCard: { backgroundColor: c.orangeSoft, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(242,106,42,0.2)', overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  suggestionDesc: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink, marginBottom: 2 },
  suggestionMeta: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.mutedHi },
  suggestionAddBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: c.orangeSoft,
    borderWidth: 1, borderColor: 'rgba(242,106,42,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  totalBand: {
    marginTop: 14, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 18, backgroundColor: c.ink,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalBandLabel: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2, textTransform: 'uppercase' },
  totalBandSub: { fontSize: 10, fontFamily: 'Manrope_500Medium', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  totalBandAmount: { fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: c.orange, letterSpacing: -1 },
});
