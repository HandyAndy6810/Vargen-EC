import { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { addDays, format } from 'date-fns';
import {
  ChevronLeft, ChevronDown, Send, FileText, Trash2, Lock, Unlock,
  X, Wrench, Package, Plus, ArrowUp, Share2, CalendarClock, TrendingUp,
} from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';
import { unitSell, type LineItem } from '@/hooks/use-quote-draft';
import { useSettings } from '@/hooks/use-settings';
import { MarkupSlider } from '@/components/MarkupSlider';
import { SwipeableRow } from '@/components/SwipeableRow';
import { ActionSheetModal } from '@/components/ActionSheetModal';
import { buildQuotePDF } from '@/lib/quote-pdf';
import { showConfirm, showAlert } from '@/lib/dialogs';
import { hapticPress } from '@/lib/haptics';

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TERM_OPTIONS = [7, 14, 30];

/**
 * The invoice Review, built to the same shape as the quote one so the two feel like
 * the same app: totals at the top, line items grouped into Labour and Materials,
 * tap to edit in a sheet, swipe to delete, then the actions.
 *
 * What's here and isn't on a quote:
 *  - a DUE DATE, which the old flow never set at all
 *  - deposit / balance, when the invoice came from a quote
 *  - a variance panel showing what changed against that quote
 *
 * And what's deliberately absent: the markup slider disappears once the invoice came
 * from a quote. That price was agreed with the customer, and quietly marking it up
 * afterwards is how disputes start.
 */
export default function InvoiceReviewStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const d = useInvoiceDraft();
  const { data: settings } = useSettings() as any;

  const [openGroups, setOpenGroups] = useState({ labour: true, material: true });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [varianceOpen, setVarianceOpen] = useState(true);

  const labour = d.lines.filter(l => l.category === 'labour');
  const materials = d.lines.filter(l => l.category !== 'labour');
  const idxOf = (line: LineItem) => d.lines.indexOf(line);

  const previewPDF = () => {
    try {
      setPreviewHtml(buildQuotePDF(d.invoicePayload(), settings));
    } catch (e: any) {
      showAlert('Could not build the preview', String(e?.message || 'Try again.'));
    }
  };

  const onSend = () => {
    if (d.customer.trim()) { d.handleSendPress(); return; }
    router.push('/invoices/create/send' as any);
  };

  const onDiscard = () => {
    showConfirm({
      title: 'Discard this invoice?',
      message: 'The invoice and everything in it will be lost.',
      confirmLabel: 'Discard',
      destructive: true,
      onConfirm: () => {
        d.forgetSavedDraft();
        try { router.dismissAll(); } catch {}
        router.replace('/(tabs)/invoices');
      },
    });
  };

  const renderLine = (l: LineItem) => {
    const i = idxOf(l);
    const sell = unitSell(l, d.markupPct);
    return (
      <SwipeableRow key={`${i}-${l.name}`} bg={c.card} onDelete={() => d.removeLine(i)}>
        <TouchableOpacity
          style={s.lineRow}
          activeOpacity={0.7}
          onPress={() => router.push(`/invoices/create/line?index=${i}` as any)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${l.name || 'line item'}`}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.lineName} numberOfLines={2}>{l.name || 'Untitled item'}</Text>
            <Text style={s.lineMeta}>
              {l.qty} {l.unit || 'ea'}
              {parseFloat(l.cost || '0') > 0 ? ` · cost ${money(parseFloat(l.cost || '0'))}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={s.linePrice}>{money((parseFloat(l.qty) || 0) * sell)}</Text>
            {!d.fromQuote ? (
              <TouchableOpacity onPress={() => d.toggleLineLock(i)} hitSlop={10}>
                {l.markupLocked
                  ? <Lock size={13} color={c.orange} strokeWidth={2.4} />
                  : <Unlock size={13} color={c.muted} strokeWidth={2.2} />}
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  const renderGroup = (
    key: 'labour' | 'material',
    label: string,
    Icon: typeof Wrench,
    items: LineItem[],
  ) => {
    const open = openGroups[key];
    const groupTotal = items.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * unitSell(l, d.markupPct), 0);
    return (
      <View style={s.group}>
        <TouchableOpacity
          style={s.groupHead}
          activeOpacity={0.7}
          onPress={() => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))}
        >
          <View style={[s.groupIcon, { backgroundColor: key === 'labour' ? c.blueSoft : c.orangeSoft }]}>
            <Icon size={16} color={key === 'labour' ? c.blue : c.orange} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.groupTitle}>{label}</Text>
            <Text style={s.groupCount}>{items.length} item{items.length === 1 ? '' : 's'}</Text>
          </View>
          <Text style={s.groupTotal}>{money(groupTotal)}</Text>
          <ChevronDown
            size={18}
            color={c.muted}
            strokeWidth={2.2}
            style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }}
          />
        </TouchableOpacity>

        {open ? (
          <View style={s.groupBody}>
            {items.map(renderLine)}
            <TouchableOpacity
              style={s.addLineBtn}
              activeOpacity={0.7}
              onPress={() => router.push(`/invoices/create/line?index=new&category=${key}` as any)}
            >
              <Plus size={15} color={c.orange} strokeWidth={2.6} />
              <Text style={s.addLineText}>Add {key === 'labour' ? 'labour' : 'material'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <TextInput
            style={s.topTitle}
            value={d.jobTitle}
            onChangeText={d.setJobTitle}
            placeholder="Job title"
            placeholderTextColor={c.muted}
            accessibilityLabel="Job title"
          />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {d.fromQuote ? (
            <View style={s.agreedCard}>
              <Text style={s.agreedEyebrow}>Invoice total · inc GST</Text>
              <Text style={s.agreedTotal}>{money(d.total)}</Text>
              <Text style={s.agreedNote}>
                Priced from the accepted quote. Edit a line to change it — the markup
                slider is off because these figures are already agreed.
              </Text>
            </View>
          ) : (
            <MarkupSlider
              lines={d.lines}
              markupPct={d.markupPct}
              onChange={d.setMarkupPct}
              roundUp={d.roundUp}
            />
          )}

          {/* Deposit / balance — only meaningful against a quote */}
          {d.fromQuote ? (
            <View style={s.typeRow}>
              {(['full', 'deposit', 'balance'] as const).map(t => {
                const on = d.invoiceType === t;
                const label = t === 'full' ? 'Full amount' : t === 'deposit' ? 'Deposit' : 'Balance';
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, on && s.typeChipOn]}
                    activeOpacity={0.8}
                    onPress={() => { hapticPress(); d.setInvoiceType(t); }}
                  >
                    <Text style={[s.typeChipText, on && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {d.fromQuote && d.invoiceType === 'deposit' ? (
            <View style={s.depositRow}>
              {[25, 30, 50].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[s.depChip, d.depositPercent === p && s.depChipOn]}
                  activeOpacity={0.8}
                  onPress={() => { hapticPress(); d.setDepositPercent(p); }}
                >
                  <Text style={[s.depChipText, d.depositPercent === p && { color: '#fff' }]}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {d.fromQuote && d.priorInvoiced > 0 ? (
            <Text style={s.priorNote}>
              {money(d.priorInvoiced)} already invoiced against this quote.
            </Text>
          ) : null}

          {!d.fromQuote ? (
            <TouchableOpacity
              style={[s.roundBtn, d.roundUp && s.roundBtnOn]}
              activeOpacity={0.8}
              onPress={() => { hapticPress(); d.setRoundUp(!d.roundUp); }}
            >
              <ArrowUp size={15} color={d.roundUp ? '#fff' : c.orange} strokeWidth={2.6} />
              <Text style={[s.roundText, d.roundUp && { color: '#fff' }]}>
                {d.roundUp ? `Rounded up to ${money(d.total)}` : 'Round up?'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Due date — an invoice's defining field, and the one the old flow
              never set, which is why nothing could ever show as overdue. */}
          <Text style={s.sectionLabel}>Payment due</Text>
          <View style={s.dueCard}>
            <View style={s.dueHead}>
              <CalendarClock size={16} color={c.orange} strokeWidth={2.2} />
              <Text style={s.dueDate}>{d.dueDateLabel}</Text>
            </View>
            <View style={s.termRow}>
              {TERM_OPTIONS.map(days => {
                const on = d.paymentTermsDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[s.termChip, on && s.termChipOn]}
                    activeOpacity={0.8}
                    onPress={() => { hapticPress(); d.setPaymentTermsDays(days); }}
                  >
                    <Text style={[s.termChipText, on && { color: '#fff' }]}>Net {days}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={s.termChip}
                activeOpacity={0.8}
                onPress={() => { hapticPress(); d.setDueDate(addDays(d.dueDate, 7)); }}
                accessibilityLabel="Push the due date back a week"
              >
                <Text style={s.termChipText}>+1 week</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* What changed against the quote */}
          {d.variance.length ? (
            <>
              <TouchableOpacity
                style={s.varianceHead}
                activeOpacity={0.7}
                onPress={() => setVarianceOpen(o => !o)}
              >
                <TrendingUp size={15} color={d.varianceTotal >= 0 ? c.orange : c.green} strokeWidth={2.4} />
                <Text style={s.varianceTitle}>
                  {d.varianceTotal >= 0 ? 'Above' : 'Below'} the quote by {money(Math.abs(d.varianceTotal))}
                </Text>
                <ChevronDown
                  size={16}
                  color={c.muted}
                  strokeWidth={2.2}
                  style={{ transform: [{ rotate: varianceOpen ? '0deg' : '-90deg' }] }}
                />
              </TouchableOpacity>
              {varianceOpen ? (
                <View style={s.varianceBody}>
                  <Text style={s.varianceLede}>
                    Worth explaining to the customer before you send it.
                  </Text>
                  {d.variance.map((row, i) => (
                    <View key={i} style={s.varianceRow}>
                      <Text style={s.varianceLabel} numberOfLines={2}>{row.label}</Text>
                      <Text style={[s.varianceDelta, { color: row.delta >= 0 ? c.orange : c.green }]}>
                        {row.delta >= 0 ? '+' : ''}{money(row.delta)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          <Text style={s.sectionLabel}>Description</Text>
          <View style={s.descCard}>
            <TextInput
              style={s.descInput}
              value={d.summary}
              onChangeText={d.setSummary}
              placeholder="What the work involved — this appears on the invoice."
              placeholderTextColor={c.muted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={s.sectionLabel}>Line items</Text>
          {renderGroup('labour', 'Labour', Wrench, labour)}
          {renderGroup('material', 'Materials', Package, materials)}

          {d.error ? (
            <View style={s.errorBanner}><Text style={s.errorText}>{d.error}</Text></View>
          ) : null}

          <TouchableOpacity style={s.discardBtn} activeOpacity={0.7} onPress={onDiscard}>
            <Trash2 size={15} color={c.muted} strokeWidth={2} />
            <Text style={s.discardText}>Discard invoice</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <View style={s.footerRow}>
            <TouchableOpacity style={s.ghostBtn} activeOpacity={0.8} onPress={previewPDF}>
              <FileText size={15} color={c.ink} strokeWidth={2.2} />
              <Text style={s.ghostText}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} activeOpacity={0.8} onPress={() => d.save('draft')} disabled={d.saving}>
              {d.saving ? <ActivityIndicator size="small" color={c.ink} /> : <Text style={s.ghostText}>Save draft</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.sendBtn} activeOpacity={0.85} onPress={onSend} disabled={d.saving}>
            <Send size={17} color="#fff" strokeWidth={2.2} />
            <Text style={s.sendText}>Send invoice</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={previewHtml !== null} animationType="slide" onRequestClose={() => setPreviewHtml(null)}>
        <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
          <View style={s.previewBar}>
            <TouchableOpacity onPress={() => setPreviewHtml(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close the preview">
              <X size={20} color={c.ink} strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={s.previewTitle}>What your customer sees</Text>
            <TouchableOpacity onPress={d.shareAnyway} hitSlop={12} accessibilityRole="button" accessibilityLabel="Share this invoice">
              <Share2 size={19} color={c.orange} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: previewHtml || '' }}
            style={{ flex: 1, backgroundColor: '#fff' }}
            scalesPageToFit
            startInLoadingState
            renderLoading={() => (
              <View style={s.previewLoading}><ActivityIndicator color={c.orange} size="large" /></View>
            )}
          />
          <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
        </View>
      </Modal>

      <ActionSheetModal
        visible={d.showSendSheet}
        onClose={() => d.setShowSendSheet(false)}
        title="Send this invoice"
        actions={d.sendActions}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { flex: 1, fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.3, padding: 0 },
  agreedCard: {
    backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.lineSoft,
    padding: 18, marginTop: 8,
  },
  agreedEyebrow: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  agreedTotal: { fontSize: 38, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -1.2, marginTop: 4 },
  agreedNote: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: c.muted, lineHeight: 18, marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  typeChip: {
    flex: 1, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid,
  },
  typeChipOn: { backgroundColor: c.orange, borderColor: c.orange },
  typeChipText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
  depositRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  depChip: {
    flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
  },
  depChipOn: { backgroundColor: c.orange, borderColor: c.orange },
  depChipText: { fontSize: 12.5, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
  priorNote: { fontSize: 12.5, fontFamily: 'Manrope_600SemiBold', color: c.muted, marginTop: 10 },
  roundBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 15, marginTop: 12,
    borderWidth: 1, borderColor: c.orange, backgroundColor: 'transparent',
  },
  roundBtnOn: { backgroundColor: c.orange },
  roundText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  sectionLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 22, marginBottom: 8,
  },
  dueCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, padding: 14 },
  dueHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueDate: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
  termRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  termChip: {
    flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft,
  },
  termChipOn: { backgroundColor: c.orange, borderColor: c.orange },
  termChipText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
  varianceHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  varianceTitle: { flex: 1, fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  varianceBody: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 8,
  },
  varianceLede: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginBottom: 10 },
  varianceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  varianceLabel: { flex: 1, fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.mutedHi },
  varianceDelta: { fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold' },
  descCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  descInput: { fontSize: 14.5, fontFamily: 'Manrope_500Medium', color: c.ink, lineHeight: 21, minHeight: 60, padding: 0 },
  group: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft,
    marginBottom: 10, overflow: 'hidden',
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  groupIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 14.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  groupCount: { fontSize: 11.5, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 1 },
  groupTotal: { fontSize: 14.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  groupBody: { borderTopWidth: 1, borderTopColor: c.lineSoft },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  lineName: { fontSize: 13.5, fontFamily: 'Manrope_700Bold', color: c.ink, lineHeight: 18 },
  lineMeta: { fontSize: 11.5, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
  linePrice: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  addLineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.lineSoft,
  },
  addLineText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  errorBanner: { marginTop: 16, backgroundColor: c.redSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.red },
  discardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 18, marginTop: 6 },
  discardText: { fontSize: 13.5, fontFamily: 'Manrope_700Bold', color: c.muted },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 10,
    backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.lineSoft,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 50, borderRadius: 15, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid,
  },
  ghostText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    height: 56, borderRadius: 17, backgroundColor: c.orange,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 18, elevation: 8,
  },
  sendText: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  previewBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.lineSoft, backgroundColor: c.paper,
  },
  previewTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
  previewLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
