import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuote, useQuoteItems, useDeleteQuote, useUpdateQuote } from '@/hooks/use-quotes';
import { useXeroStatus, useCreateXeroInvoice } from '@/hooks/use-xero';
import { useSettings } from '@/hooks/use-settings';
import { buildQuotePDF, type PdfDocumentData } from '@/lib/quote-pdf';
import { ChevronLeft, MoreHorizontal, Phone, MessageSquare, Edit2, FileText } from 'lucide-react-native';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import PDFComposeModal from '@/components/PDFComposeModal';
import { ActionSheetModal, type SheetAction } from '@/components/ActionSheetModal';
import { showAlert, showConfirm } from '@/lib/dialogs';


const statusPillFor = (c: Colors): Record<string, { bg: string; fg: string; bd: string; label: string }> => ({
  draft:    { bg: c.paperDeep, fg: c.mutedHi,    bd: c.lineMid,          label: 'Draft' },
  sent:     { bg: c.blueSoft,  fg: c.blue,         bd: c.blueBorder,       label: 'Sent' },
  viewed:   { bg: c.blueSoft,  fg: c.blue,         bd: c.blueBorder,       label: 'Viewed' },
  accepted: { bg: c.greenSoft, fg: c.green,        bd: `${c.green}44`,      label: 'Accepted' },
  overdue:  { bg: c.orangeSoft, fg: c.orangeDeep, bd: `${c.orange}44`,    label: 'Overdue' },
  invoiced: { bg: c.greenSoft, fg: c.green,        bd: `${c.green}44`,      label: 'Invoiced' },
  declined: { bg: '#fde5e5',  fg: '#d23b3b',    bd: '#d23b3b44',       label: 'Declined' },
  rejected: { bg: '#fde5e5',  fg: '#d23b3b',    bd: '#d23b3b44',       label: 'Declined' },
});

const PROGRESS_STEPS = ['Draft', 'Sent', 'Viewed', 'Accepted'];
const PROGRESS_STATUSES = ['draft', 'sent', 'viewed', 'accepted'];

function getProgressIndex(status: string): number {
  const map: Record<string, number> = { draft: 0, sent: 1, viewed: 2, accepted: 3, invoiced: 3 };
  return map[status] ?? 0;
}

function isTerminalStatus(status: string): { terminal: true; label: string; color: string } | null {
  if (status === 'declined') return { terminal: true, label: 'Declined', color: '#d23b3b' };
  if (status === 'expired')  return { terminal: true, label: 'Expired', color: 'rgba(20,19,16,0.4)' };
  return null;
}

export default function QuoteDetailScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const STATUS_PILL = useMemo(() => statusPillFor(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = id ? Number(id) : 0;
  const { data: quote, isLoading } = useQuote(quoteId) as any;
  const { data: quoteItems = [] } = useQuoteItems(quoteId) as any;
  const { data: settings } = useSettings();
  const deleteQuote = useDeleteQuote();
  const updateQuote = useUpdateQuote();
  const [showPDF, setShowPDF] = useState(false);
  const [pdfPending, setPdfPending] = useState(false);
  const [sheetMode, setSheetMode] = useState<null | 'more' | 'status'>(null);
  const { data: xeroStatus } = useXeroStatus();
  const createXeroInvoice = useCreateXeroInvoice(quoteId);

  const duplicateQuote = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/quotes', {
        content: quote?.content,
        jobTitle: (quote as any)?.jobTitle || `Quote #${id}`,
        totalAmount: quote?.totalAmount ?? '0',
        status: 'draft',
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      return res.json();
    },
    onSuccess: (newQuote: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      router.replace(`/quotes/${newQuote.id}` as any);
    },
    onError: () => showAlert('Could not duplicate', 'Try again.'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={c.orange} />
      </SafeAreaView>
    );
  }

  if (!quote) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: c.muted }}>Quote not found</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted }}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Parse content JSON
  let content: any = {};
  try { content = JSON.parse(quote?.content || '{}'); } catch {}

  const title = (quote as any)?.jobTitle || content.jobTitle || `Quote #${id}`;
  const customerName = content.customerName || '';
  const status = quote?.status || 'draft';
  const totalAmount = quote?.totalAmount ? parseFloat(quote.totalAmount) : 0;
  const pill = STATUS_PILL[status] ?? STATUS_PILL.draft;
  const progressIdx = getProgressIndex(status);
  const initials = customerName
    ? customerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const num = `Q-${String(id).padStart(4, '0').slice(-4)}`;
  const issueDate = quote?.createdAt
    ? format(new Date(quote.createdAt), 'EEE d MMM')
    : '';

  // Build display items: prefer saved quoteItems, fallback to content
  let displayItems: Array<{ name: string; qty: number; total: number }> = [];
  if ((quoteItems as any[]).length > 0) {
    displayItems = (quoteItems as any[]).map((item: any) => ({
      name: item.description,
      qty: item.quantity,
      total: parseFloat(item.price),
    }));
  } else if (content.items?.length > 0) {
    displayItems = content.items.map((item: any) => ({
      name: item.description,
      qty: item.quantity || 1,
      total: (item.quantity || 1) * (item.unitPrice || 0),
    }));
  } else if (content.lines?.length > 0) {
    displayItems = content.lines.map((line: any) => ({
      name: line.name,
      qty: line.qty || 1,
      total: (line.qty || 1) * (line.price || 0),
    }));
  }

  const subtotal = content.subtotal
    ? parseFloat(content.subtotal)
    : displayItems.reduce((s, i) => s + i.total, 0);
  const gst = content.gstAmount ? parseFloat(content.gstAmount) : 0;

  const customerPhone = content.customerPhone || null;
  const alreadyInvoiced = status === 'invoiced';
  const terminalStatus = isTerminalStatus(status);

  const statusActions: SheetAction[] = [
    status !== 'sent'     ? { label: 'Mark as Sent',     onPress: () => updateQuote.mutate({ id: quoteId, status: 'sent' } as any) } : null,
    status !== 'accepted' ? { label: 'Mark as Accepted', onPress: () => updateQuote.mutate({ id: quoteId, status: 'accepted' } as any) } : null,
    status !== 'declined' ? { label: 'Mark as Declined', onPress: () => updateQuote.mutate({ id: quoteId, status: 'declined' } as any) } : null,
    status !== 'draft'    ? { label: 'Revert to Draft',  onPress: () => updateQuote.mutate({ id: quoteId, status: 'draft' } as any) } : null,
  ].filter(Boolean) as SheetAction[];

  const moreActions: SheetAction[] = [
    !alreadyInvoiced ? {
      label: 'Delete quote',
      destructive: true,
      onPress: () => showConfirm({
        title: 'Delete quote?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
        onConfirm: () => deleteQuote.mutate(quoteId, { onSuccess: () => router.back() }),
      }),
    } : null,
    status !== 'invoiced' ? { label: 'Change status', onPress: () => setSheetMode('status') } : null,
    { label: 'Duplicate quote', onPress: () => duplicateQuote.mutate() },
    {
      label: 'Share quote',
      onPress: () => Share.share({ message: `Quote ${num} — $${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })} inc. GST` }),
    },
    customerPhone ? { label: 'SMS customer', onPress: () => Linking.openURL(`sms:${customerPhone}`) } : null,
    customerPhone ? { label: 'Call customer', onPress: () => Linking.openURL(`tel:${customerPhone}`) } : null,
  ].filter(Boolean) as SheetAction[];

  const handleMore = () => setSheetMode('more');

  const handleConvert = () => {
    if (alreadyInvoiced) {
      showAlert('Already invoiced', 'An invoice has already been created for this quote.');
      return;
    }
    router.push(`/invoices/create?quoteId=${id}` as any);
  };

  const generateAndSharePDF = async (customMessage: string, notes: string) => {
    setPdfPending(true);
    try {
      const rawItems = (quoteItems as any[]).length > 0
        ? (quoteItems as any[]).map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: parseFloat(item.price) / Math.max(item.quantity, 1),
          }))
        : (content.items ?? content.lines ?? []).map((item: any) => ({
            description: item.description || item.name,
            quantity: item.quantity || item.qty || 1,
            unit: item.unit,
            unitPrice: item.unitPrice ?? (item.price ? parseFloat(item.price) / Math.max(item.quantity || item.qty || 1, 1) : 0),
          }));

      const docData: PdfDocumentData = {
        documentType: 'quote',
        documentNumber: String(id).padStart(4, '0').slice(-4),
        createdAt: quote?.createdAt ?? new Date().toISOString(),
        expiryDate: content.expiryDate,
        status: quote?.status,
        jobTitle: content.jobTitle || title,
        summary: content.summary,
        customerName: content.customerName || quote?.customerName,
        customerPhone: content.customerPhone,
        customerEmail: content.customerEmail,
        customerAddress: content.customerAddress,
        items: rawItems,
        notes: notes || undefined,
        customMessage: customMessage || undefined,
        subtotal,
        gstAmount: gst,
        totalAmount,
        includeGST: content.includeGST ?? true,
      };

      const html = buildQuotePDF(docData, settings ?? {});
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setShowPDF(false);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: '.pdf',
        dialogTitle: `Quote ${num}`,
      });
    } catch (err: any) {
      showAlert('Could not generate PDF', err?.message ?? 'Please try again.');
    } finally {
      setPdfPending(false);
    }
  };

  return (
    <>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.iconBtn}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{num}</Text>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={handleMore}>
          <MoreHorizontal size={18} color={c.ink} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>

          {/* Status hero */}
          <View style={s.statusCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={s.statusCardTitle} numberOfLines={2}>{title}</Text>
                <Text style={s.statusCardSub}>
                  {customerName ? `For ${customerName}` : 'No customer'}{issueDate ? ` · ${issueDate}` : ''}
                </Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: pill.bg, borderColor: pill.bd }]}>
                <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
              <Text style={s.amountLarge}>
                ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={s.amountSub}>inc GST</Text>
            </View>

            {/* Progress rail */}
            {terminalStatus ? (
              <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: terminalStatus.color + '22', borderWidth: 1, borderColor: terminalStatus.color + '44' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: terminalStatus.color, letterSpacing: 1, textTransform: 'uppercase' }}>{terminalStatus.label}</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
                {PROGRESS_STEPS.map((step, i) => {
                  const done = i < progressIdx;
                  const cur = i === progressIdx;
                  const targetStatus = PROGRESS_STATUSES[i];
                  return (
                    <TouchableOpacity
                      key={step}
                      style={{ flex: 1 }}
                      activeOpacity={cur ? 1 : 0.65}
                      onPress={() => {
                        if (!cur) updateQuote.mutate({ id: quoteId, status: targetStatus } as any);
                      }}
                    >
                      <View style={[s.railBar, done ? { backgroundColor: c.orange } : cur ? { backgroundColor: c.orangeSoft } : { backgroundColor: c.paperDeep }]} />
                      <Text style={[s.railLabel, done ? { color: c.orangeDeep } : cur ? { color: c.orange } : { color: c.muted }]}>{step}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Customer */}
          {customerName ? (
            <>
              <Text style={s.sectionEyebrow}>Customer</Text>
              <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={s.custAvatar}>
                  <Text style={s.custAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.custName}>{customerName}</Text>
                </View>
                {customerPhone ? (
                  <>
                    <TouchableOpacity
                      style={s.iconAction}
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                    >
                      <Phone size={16} color={c.ink} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.iconAction}
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(`sms:${customerPhone}`)}
                    >
                      <MessageSquare size={16} color={c.ink} strokeWidth={2} />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Line items */}
          <Text style={s.sectionEyebrow}>
            Line items{displayItems.length > 0 ? ` · ${displayItems.length}` : ''}
          </Text>
          <View style={[s.card, { padding: 0 }]}>
            {displayItems.length > 0 ? (
              displayItems.map((item, i) => (
                <View key={i} style={[s.lineRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                  <Text style={s.lineName}>{item.name}</Text>
                  <Text style={s.lineQty}>×{item.qty}</Text>
                  <Text style={s.lineAmt}>
                    ${item.total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted }}>
                  No line items recorded
                </Text>
              </View>
            )}
            <View style={s.totalSection}>
              {subtotal > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Subtotal</Text>
                  <Text style={s.totalValue}>
                    ${subtotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              {gst > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>GST (10%)</Text>
                  <Text style={s.totalValue}>
                    ${gst.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: c.ink, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }]}>
                  Total
                </Text>
                <Text style={[s.totalValue, { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }]}>
                  ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {content.notes ? (
            <>
              <Text style={s.sectionEyebrow}>Notes</Text>
              <View style={s.card}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.mutedHi, lineHeight: 20 }}>
                  {content.notes}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Xero sync status */}
      {xeroStatus?.connected ? (
        <View style={s.xeroBar}>
          {quote.xeroInvoiceId ? (
            <View style={s.xeroBadge}>
              <Text style={s.xeroText}>
                Synced to Xero{quote.xeroInvoiceNumber ? ` · ${quote.xeroInvoiceNumber}` : ''}
              </Text>
            </View>
          ) : quote.status === 'accepted' ? (
            <TouchableOpacity
              style={s.xeroSyncBtn}
              activeOpacity={0.8}
              disabled={createXeroInvoice.isPending}
              onPress={() => {
                createXeroInvoice.mutate(undefined, {
                  onSuccess: (r) => showAlert('Xero invoice created', `Invoice ${r.invoiceNumber} created in Xero.`),
                  onError: (e: any) => showAlert('Xero sync failed', e.message || 'Try again.'),
                });
              }}
            >
              <Text style={s.xeroSyncBtnText}>
                {createXeroInvoice.isPending ? 'Syncing…' : 'Sync to Xero'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Bottom CTAs */}
      <View style={s.bottomBar}>
        {(status === 'draft' || status === 'sent') && (
          <TouchableOpacity
            style={s.tweakBtn}
            activeOpacity={0.7}
            onPress={() => router.push(`/quotes/create?quoteId=${id}` as any)}
          >
            <Edit2 size={15} color={c.ink} strokeWidth={2} />
            <Text style={s.tweakBtnText}>Tweak</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.pdfBtn}
          activeOpacity={0.7}
          onPress={() => setShowPDF(true)}
        >
          <FileText size={15} color={c.orange} strokeWidth={2} />
          <Text style={s.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.convertBtn, alreadyInvoiced && { backgroundColor: c.paperDeep }]}
          activeOpacity={0.8}
          onPress={handleConvert}
          disabled={alreadyInvoiced}
        >
          <Text style={[s.convertBtnText, alreadyInvoiced && { color: c.mutedHi }]}>
            {alreadyInvoiced ? 'Already invoiced' : 'Convert ›'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>

    <PDFComposeModal
      visible={showPDF}
      onClose={() => setShowPDF(false)}
      onShare={generateAndSharePDF}
      documentType="quote"
      documentNumber={String(id).padStart(4, '0').slice(-4)}
      customerName={content.customerName || quote?.customerName}
      jobTitle={content.jobTitle || title}
      totalAmount={totalAmount}
      initialNotes={content.notes}
      isPending={pdfPending}
    />

    <ActionSheetModal
      visible={sheetMode !== null}
      title={sheetMode === 'status' ? 'Change status' : title}
      actions={sheetMode === 'status' ? statusActions : moreActions}
      onClose={() => setSheetMode(null)}
    />
    </>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: c.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: c.lineSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  statusCardTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.4,
  },
  statusCardSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  amountLarge: {
    fontSize: 36,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
    letterSpacing: -1.1,
    lineHeight: 38,
  },
  amountSub: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.muted,
  },
  railBar: {
    height: 4,
    borderRadius: 999,
  },
  railLabel: {
    fontSize: 9.5,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: c.lineSoft,
  },
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
  },
  custName: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lineName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  lineQty: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    width: 24,
    textAlign: 'right',
  },
  lineAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    minWidth: 70,
    textAlign: 'right',
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
    padding: 16,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: c.mutedHi,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  xeroBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  xeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: c.greenSoft,
    borderWidth: 1,
    borderColor: `${c.green}44`,
  },
  xeroText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: c.green,
  },
  xeroSyncBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.blueSoft,
    borderWidth: 1,
    borderColor: c.blueBorder,
  },
  xeroSyncBtnText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: c.blue,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(247,244,238,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 30,
  },
  tweakBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  tweakBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
  pdfBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: c.orangeSoft,
    borderWidth: 1,
    borderColor: `${c.orange}44`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pdfBtnText: {
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
  },
  convertBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  convertBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
