import { useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { format } from 'date-fns';
import {
  ChevronLeft, ChevronDown, ChevronRight, Send, FileText, Trash2,
  Lock, Unlock, AlertTriangle, User, X, Wrench, Package, Plus, ArrowUp, Share2,
} from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useQuoteDraft, unitSell, type LineItem } from '@/hooks/use-quote-draft';
import { useSettings } from '@/hooks/use-settings';
import { MarkupSlider } from '@/components/MarkupSlider';
import { buildQuotePDF } from '@/lib/quote-pdf';
import { showConfirm, showAlert } from '@/lib/dialogs';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// How far the row travels, and how wide the button under it is. The button is
// narrower than the travel and inset from the edges, so a full swipe reveals the
// whole pill with a margin around it rather than stopping half way across it.
const SWIPE_W = 104;
const DELETE_INSET = 8;

/**
 * Drag a line item left to reveal Delete. Uses PanResponder and the built-in
 * Animated API — the same pair the rest of the app animates with — and only claims
 * the gesture once movement is clearly horizontal, so vertical scrolling still works.
 */
function SwipeableRow({
  children,
  onDelete,
  bg,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  bg: string;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);

  const slide = (to: number) => {
    open.current = to !== 0;
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        const base = open.current ? -SWIPE_W : 0;
        x.setValue(Math.min(0, Math.max(-SWIPE_W, base + g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        const base = open.current ? -SWIPE_W : 0;
        slide(base + g.dx < -SWIPE_W / 2 ? -SWIPE_W : 0);
      },
    })
  ).current;

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        style={[sw.deleteZone, { width: SWIPE_W - DELETE_INSET * 2, right: DELETE_INSET }]}
        activeOpacity={0.85}
        onPress={() => { slide(0); onDelete(); }}
        accessibilityRole="button"
        accessibilityLabel="Delete line item"
      >
        <Trash2 size={18} color="#fff" strokeWidth={2.2} />
        <Text style={sw.deleteText}>Delete</Text>
      </TouchableOpacity>
      <Animated.View style={{ transform: [{ translateX: x }], backgroundColor: bg }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  // A rounded pill inset from the row edges rather than a full-bleed red block —
  // it reads as a button you press, not as the row bleeding open.
  deleteZone: {
    position: 'absolute', top: 6, bottom: 6,
    backgroundColor: '#d23b3b', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  deleteText: { fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
});

/**
 * Screen 3 — everything else lives here. Order follows the brief: totals, markup,
 * line items, labour, flags, actions. Customer is a gate on Send only: Preview PDF
 * and Save draft deliberately work without one.
 */
export default function ReviewStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const d = useQuoteDraft();
  const { data: settings } = useSettings() as any;

  // Both groups can be open at once — they're independent.
  const [openGroups, setOpenGroups] = useState<{ labour: boolean; material: boolean }>({
    labour: true, material: true,
  });
  const [flagsOpen, setFlagsOpen] = useState(true);

  const labour = d.lines.filter(l => l.category === 'labour');
  const materials = d.lines.filter(l => l.category !== 'labour');
  const needsPrice = d.lines.filter(l => l.needsPrice);
  const hasFlags = needsPrice.length > 0 || d.assumptions.length > 0;

  const labourHours = labour.reduce((n, l) => n + (parseFloat(l.qty) || 0), 0);
  const labourRate = labour.length
    ? (parseFloat(labour[0].cost || '0') || 0)
    : (typeof settings?.labourRate === 'number' ? settings.labourRate : 0);

  const idxOf = (line: LineItem) => d.lines.indexOf(line);

  /** Rate applies to every labour line's cost — price then follows the markup. */
  const applyLabourRate = (raw: string) => {
    const rate = parseFloat(raw);
    d.setLines(prev => prev.map(l =>
      l.category === 'labour' ? { ...l, cost: Number.isFinite(rate) ? String(rate) : '' } : l
    ));
  };

  /** Hours scale the labour lines proportionally so the split between them holds. */
  const applyLabourHours = (raw: string) => {
    const next = parseFloat(raw);
    if (!Number.isFinite(next) || next < 0) return;
    const current = labourHours;
    d.setLines(prev => prev.map(l => {
      if (l.category !== 'labour') return l;
      if (current <= 0) return { ...l, qty: String(next) };
      const share = (parseFloat(l.qty) || 0) / current;
      return { ...l, qty: String(Math.round(next * share * 100) / 100) };
    }));
  };

  /**
   * Show the quote itself, full screen, in the app.
   *
   * This used to call Print.printAsync, which opens iOS's AirPrint dialog — printer,
   * copies, paper size — with the document shrunk behind it. That's a print queue,
   * not a preview. Rendering the same HTML that becomes the PDF means what's on
   * screen is exactly what the customer receives, with no second layout to drift.
   */
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const previewPDF = () => {
    try {
      setPreviewHtml(buildQuotePDF(d.quotePayload(), settings));
    } catch (e: any) {
      showAlert('Could not build the preview', String(e?.message || 'Try again.'));
    }
  };

  const onSend = () => {
    // The gate: a quote can be drafted and previewed without a customer, but not sent.
    if (d.customer.trim()) { d.handleSendPress(); return; }
    router.push('/quotes/create/send' as any);
  };


  const onDiscard = () => {
    showConfirm({
      title: 'Discard this quote?',
      message: 'The quote and everything in it will be lost.',
      confirmLabel: 'Discard',
      destructive: true,
      onConfirm: () => {
        // Deliberately thrown away — don't offer it back on the next new quote.
        d.forgetSavedDraft();
        try { router.dismissAll(); } catch {}
        router.replace('/(tabs)/quotes');
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
          onPress={() => router.push(`/quotes/create/line?index=${i}` as any)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${l.name || 'line item'}`}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.lineName} numberOfLines={2}>{l.name || 'Untitled item'}</Text>
            <Text style={s.lineMetaLabel}>
              {l.qty || '1'} {l.unit || 'ea'} · cost {money(parseFloat(l.cost || '0') || 0)}
              {l.needsPrice ? '  ·  Needs price' : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={s.lineTotal}>{money((parseFloat(l.qty) || 0) * sell)}</Text>
            <TouchableOpacity
              onPress={() => d.toggleLineLock(i)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={l.markupLocked ? 'Unpin price from markup' : 'Pin this price'}
            >
              {l.markupLocked
                ? <Lock size={15} color={c.orange} strokeWidth={2.4} />
                : <Unlock size={15} color={c.muted} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  const group = (
    key: 'labour' | 'material',
    label: string,
    Icon: typeof Wrench,
    items: LineItem[],
  ) => {
    const open = openGroups[key];
    const sum = items.reduce((n, l) => n + (parseFloat(l.qty) || 0) * unitSell(l, d.markupPct), 0);
    return (
      <View style={s.group}>
        <TouchableOpacity
          style={s.groupHead}
          activeOpacity={0.7}
          onPress={() => setOpenGroups(g => ({ ...g, [key]: !g[key] }))}
          accessibilityRole="button"
          accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${label}`}
        >
          <View style={[s.groupIcon, { backgroundColor: key === 'labour' ? c.blueSoft : c.orangeSoft }]}>
            <Icon size={16} color={key === 'labour' ? c.blue : c.orange} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.groupLabel}>{label}</Text>
            <Text style={s.groupMeta}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
          </View>
          <Text style={s.groupSum}>{money(sum)}</Text>
          {open
            ? <ChevronDown size={16} color={c.muted} strokeWidth={2} />
            : <ChevronRight size={16} color={c.muted} strokeWidth={2} />}
        </TouchableOpacity>
        {open ? (
          <View style={s.groupBody}>
            {items.map(renderLine)}
            <TouchableOpacity
              style={s.addLineBtn}
              activeOpacity={0.7}
              onPress={() => router.push(`/quotes/create/line?index=new&category=${key}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`Add a ${label.toLowerCase()} line`}
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
          {/* Totals + markup, all live on the drag */}
          <MarkupSlider
            lines={d.lines}
            markupPct={d.markupPct}
            onChange={d.setMarkupPct}
            roundUp={d.roundUp}
          />

          {/* Lands the customer-facing total on a whole dollar */}
          <TouchableOpacity
            style={[s.roundBtn, d.roundUp && s.roundBtnOn]}
            activeOpacity={0.8}
            onPress={() => d.setRoundUp(!d.roundUp)}
            accessibilityRole="button"
            accessibilityLabel={d.roundUp ? 'Turn off rounding' : 'Round the total up to the nearest dollar'}
          >
            <ArrowUp size={15} color={d.roundUp ? '#fff' : c.orange} strokeWidth={2.6} />
            <Text style={[s.roundText, d.roundUp && { color: '#fff' }]}>
              {d.roundUp ? `Rounded up to ${money(d.total)}` : 'Round up?'}
            </Text>
          </TouchableOpacity>

          {/* What the customer reads — tap to reword it */}
          <Text style={s.sectionLabel}>Description</Text>
          <View style={s.descCard}>
            <TextInput
              style={s.descInput}
              value={d.summary}
              onChangeText={d.setSummary}
              placeholder="What the job involves — this appears on the quote."
              placeholderTextColor={c.muted}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Line items, grouped */}
          <Text style={s.sectionLabel}>Line items</Text>
          {group('labour', 'Labour', Wrench, labour)}
          {group('material', 'Materials', Package, materials)}

          {/* Labour block */}
          {labour.length ? (
            <>
              <Text style={s.sectionLabel}>Labour</Text>
              <View style={s.labourCard}>
                <View style={s.labourCell}>
                  <Text style={s.labourLabel}>Hours</Text>
                  <TextInput
                    style={s.labourInput}
                    defaultValue={String(labourHours)}
                    onEndEditing={e => applyLabourHours(e.nativeEvent.text)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={s.labourTimes}>×</Text>
                <View style={s.labourCell}>
                  <Text style={s.labourLabel}>Your rate</Text>
                  <TextInput
                    style={s.labourInput}
                    defaultValue={String(labourRate)}
                    onEndEditing={e => applyLabourRate(e.nativeEvent.text)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={s.labourLabel}>Labour cost</Text>
                  <Text style={s.labourTotal}>{money(labourHours * labourRate)}</Text>
                </View>
              </View>
            </>
          ) : null}

          {/* Flags — assumptions and anything we couldn't price */}
          {hasFlags ? (
            <>
              <TouchableOpacity
                style={s.flagsHead}
                activeOpacity={0.7}
                onPress={() => setFlagsOpen(o => !o)}
                accessibilityRole="button"
                accessibilityLabel="Toggle checks and assumptions"
              >
                <AlertTriangle size={16} color={c.orangeDeep} strokeWidth={2.4} />
                <Text style={s.flagsTitle}>
                  Check before sending · {needsPrice.length + d.assumptions.length}
                </Text>
                {flagsOpen
                  ? <ChevronDown size={16} color={c.orangeDeep} strokeWidth={2} />
                  : <ChevronRight size={16} color={c.orangeDeep} strokeWidth={2} />}
              </TouchableOpacity>
              {flagsOpen ? (
                <View style={s.flagsBody}>
                  {needsPrice.map((l, i) => (
                    <View key={`np-${i}`} style={s.flagRow}>
                      <Text style={s.flagTag}>NEEDS PRICE</Text>
                      <Text style={s.flagText}>{l.name || 'Unnamed item'} — not in your price book, check the figure.</Text>
                    </View>
                  ))}
                  {d.assumptions.map((a, i) => (
                    <View key={`as-${i}`} style={s.flagRow}>
                      <Text style={[s.flagTag, { color: c.mutedHi, backgroundColor: c.paperDeep }]}>ASSUMED</Text>
                      <Text style={s.flagText}>{a}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {d.error ? (
            <View style={s.errorBanner}><Text style={s.errorText}>{d.error}</Text></View>
          ) : null}

          <TouchableOpacity style={s.discardBtn} activeOpacity={0.7} onPress={onDiscard}>
            <Trash2 size={15} color={c.muted} strokeWidth={2} />
            <Text style={s.discardText}>Discard quote</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Actions */}
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
            <Text style={s.sendText}>Send to customer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Live preview — the real document, not a redrawn approximation */}
      <Modal
        visible={previewHtml !== null}
        animationType="slide"
        onRequestClose={() => setPreviewHtml(null)}
      >
        {/* SafeAreaView doesn't get the insets inside a Modal, so the bar rendered
            underneath the status bar and its buttons couldn't be tapped. Applying
            the measured inset directly always works. */}
        <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
          <View style={s.previewBar}>
            <TouchableOpacity
              onPress={() => setPreviewHtml(null)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close the preview"
            >
              <X size={20} color={c.ink} strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={s.previewTitle}>What your customer sees</Text>
            <TouchableOpacity
              onPress={d.shareAnyway}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Share this quote"
            >
              <Share2 size={19} color={c.orange} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: previewHtml || '' }}
            style={{ flex: 1, backgroundColor: '#fff' }}
            // The quote is a fixed A4-width document, so let it scale to the phone
            // rather than forcing a sideways scroll.
            scalesPageToFit
            startInLoadingState
            renderLoading={() => (
              <View style={s.previewLoading}>
                <ActivityIndicator color={c.orange} size="large" />
              </View>
            )}
          />
          <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
        </View>
      </Modal>

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
  descCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  descInput: {
    fontSize: 14.5, fontFamily: 'Manrope_500Medium', color: c.ink,
    lineHeight: 21, minHeight: 60, padding: 0,
  },
  sectionLabel: {
    fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 22, marginBottom: 8,
  },
  group: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft,
    marginBottom: 10, overflow: 'hidden',
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  groupIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  groupLabel: { fontSize: 15.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  groupMeta: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
  groupSum: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  groupBody: { borderTopWidth: 1, borderTopColor: c.lineSoft, paddingHorizontal: 14 },
  lineRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.lineSoft,
  },
  lineName: { fontSize: 14.5, fontFamily: 'Manrope_700Bold', color: c.ink },
  lineMetaLabel: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 4 },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 15 },
  addLineText: { fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  roundBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 10, height: 46, borderRadius: 15,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.orange,
  },
  roundBtnOn: { backgroundColor: c.orange, borderColor: c.orange },
  roundText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  fieldLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, marginTop: 12,
  },
  editorHint: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 12, lineHeight: 18 },
  deleteBtn: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: c.redSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  lineTotal: { fontSize: 14.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  labourCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  labourCell: { minWidth: 56 },
  labourLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  labourInput: {
    fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, padding: 0, marginTop: 3,
    borderBottomWidth: 1, borderBottomColor: c.lineMid, paddingBottom: 2,
  },
  labourTimes: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.muted, marginTop: 12 },
  labourTotal: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 3 },
  flagsHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22,
    backgroundColor: c.orangeSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  flagsTitle: { flex: 1, fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep },
  flagsBody: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineSoft,
    marginTop: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  flagTag: {
    fontSize: 9.5, fontFamily: 'Manrope_800ExtraBold', color: c.orangeDeep,
    backgroundColor: c.orangeSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    letterSpacing: 0.6, overflow: 'hidden',
  },
  flagText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.mutedHi, lineHeight: 18 },
  errorBanner: { marginTop: 16, backgroundColor: c.redSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  errorText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.red },
  discardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 18, marginTop: 6 },
  discardText: { fontSize: 13.5, fontFamily: 'Manrope_700Bold', color: c.muted },
  footer: {
    paddingTop: 12, paddingBottom: 30, paddingHorizontal: 20, gap: 10,
    backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.lineSoft,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: {
    flex: 1, height: 48, borderRadius: 15, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.lineMid,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  ghostText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  sendBtn: {
    height: 58, borderRadius: 18, backgroundColor: c.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  sendText: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '88%',
    backgroundColor: c.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineMid, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  sheetTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  sheetSub: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 4 },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  custAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  custAvatarText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  custName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink },
  custSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 1 },
  orLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  gateInput: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  gateConfirm: {
    height: 52, borderRadius: 16, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  gateConfirmText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  previewBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.lineSoft, backgroundColor: c.paper,
  },
  previewTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.2 },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  gateAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16, marginTop: 14,
    backgroundColor: c.orangeSoft, borderWidth: 1, borderColor: c.orange,
  },
  gateAddText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  gateShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, marginTop: 4,
  },
  gateShareText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
});
