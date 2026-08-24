import { StyleSheet } from 'react-native';
import type { Colors } from '@/hooks/use-theme';

/**
 * Field / line-item / modal / total styles shared across the stepped New Quote
 * screens. Lifted verbatim from the old single-screen quotes/create.tsx so the
 * look is unchanged; the step chrome (header, progress rail, pinned footer)
 * lives in QuoteStepScaffold.
 */
export const makeQuoteStyles = (c: Colors) => StyleSheet.create({
  sectionEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  fieldGroup: {
    backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft,
    overflow: 'hidden', marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12,
  },
  fieldLabel: {
    fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.mutedHi, width: 72, flexShrink: 0,
  },
  fieldInput: {
    flex: 1, fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink, paddingVertical: 2,
  },

  // Line items — summary rows
  lineItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 18,
  },
  lineNameText: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink, marginBottom: 3 },
  lineMetaText: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted },
  lineTotalText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  addLineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 20, borderTopWidth: 1, borderTopColor: c.lineMid,
  },
  addLineBtnText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep },

  // Totals hero
  totalHero: { backgroundColor: c.ink, borderRadius: 20, padding: 20, overflow: 'hidden', marginBottom: 20 },
  totalHeroGlow: {
    position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70,
    backgroundColor: `${c.orange}88`, opacity: 0.35,
  },
  totalEyebrow: {
    fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4,
  },
  totalAmt: { fontSize: 40, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -1.2, lineHeight: 44 },
  totalSub: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: 'rgba(255,255,255,0.5)', marginTop: 6 },

  // Line item modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.lineSoft,
  },
  modalCancelBtn: { paddingVertical: 4, paddingHorizontal: 2, minWidth: 60 },
  modalCancelText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.mutedHi },
  modalTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  modalDoneBtn: { paddingVertical: 4, paddingHorizontal: 2, minWidth: 60, alignItems: 'flex-end' },
  modalDoneText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  modalLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  modalInputWrap: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
  modalTextArea: { padding: 16, fontSize: 16, fontFamily: 'Manrope_600SemiBold', color: c.ink, minHeight: 100 },
  modalInput: { padding: 16, fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  modalTotalCard: {
    marginTop: 24, backgroundColor: c.ink, borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
  },
  modalTotalLabel: {
    fontSize: 12, fontFamily: 'Manrope_700Bold', color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  modalTotalAmt: { fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#fff', letterSpacing: -0.8 },
  deleteLineBtn: {
    marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(210,59,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(210,59,59,0.15)',
  },

  errorBanner: { backgroundColor: '#fde5e5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: '#d23b3b' },
});
