import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { copyText } from '@/lib/clipboard';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { ActionSheetModal, type SheetAction } from '@/components/ActionSheetModal';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import PDFComposeModal from '@/components/PDFComposeModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInvoice, useUpdateInvoice, useDeleteInvoice } from '@/hooks/use-invoices';
import { useStripePaymentLink } from '@/hooks/use-stripe';
import { useSquarePaymentLink } from '@/hooks/use-square';
import { useSettings } from '@/hooks/use-settings';
import { buildQuotePDF, type PdfDocumentData } from '@/lib/quote-pdf';
import { ChevronLeft, Check, CreditCard, Building2, Copy, FileText, MoreHorizontal } from 'lucide-react-native';
import { format, differenceInCalendarDays } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';


export default function InvoiceDetailScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = id ? Number(id) : 0;
  const { data: invoice, isLoading } = useInvoice(invoiceId) as any;
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const [partialMode, setPartialMode] = useState(false);
  const [partialAmt, setPartialAmt] = useState('');
  const [showPDF, setShowPDF] = useState(false);
  const [pdfPending, setPdfPending] = useState(false);
  const stripeLink = useStripePaymentLink();
  const squareLink = useSquarePaymentLink();
  const { data: settings } = useSettings();

  const sharePaymentLink = (url: string, label: string) => {
    Share.share({ message: `Pay your invoice here: ${url}`, url }).catch(() => {
      // Fallback: copy to clipboard
      copyText(url);
      showAlert('Copied', `${label} payment link copied to clipboard`);
    });
  };

  const handlePayByCard = () => {
    if (!invoiceId) return;
    if (invoice?.stripePaymentLinkUrl) {
      sharePaymentLink(invoice.stripePaymentLinkUrl, 'Stripe');
      return;
    }
    stripeLink.mutate(invoiceId, {
      onSuccess: (data: any) => sharePaymentLink(data.url, 'Stripe'),
      onError: (err: any) => showAlert('Card payment unavailable', err.message),
    });
  };

  const handlePayBySquare = () => {
    if (!invoiceId) return;
    if (invoice?.squarePaymentLinkUrl) {
      sharePaymentLink(invoice.squarePaymentLinkUrl, 'Square');
      return;
    }
    squareLink.mutate(invoiceId, {
      onSuccess: (data: any) => sharePaymentLink(data.url, 'Square'),
      onError: (err: any) => showAlert('Square payment unavailable', err.message),
    });
  };

  const copyToClipboard = (value: string, label: string) => {
    copyText(value);
    showAlert('Copied', `${label} copied to clipboard`);
  };

  const handleMarkPaid = () => {
    if (!invoiceId) return;
    showConfirm({
      title: 'Mark as paid?',
      message: 'This will update the invoice status to Paid.',
      confirmLabel: 'Mark paid',
      onConfirm: () => updateInvoice.mutate({
        id: invoiceId,
        status: 'paid',
        paidDate: new Date().toISOString() as any,
      }),
    });
  };

  const handleRecordPartial = () => {
    const amount = parseFloat(partialAmt);
    if (!amount || amount <= 0) { showAlert('Enter a valid amount'); return; }
    // Send payAmount and let the server accumulate against prior partials and
    // decide paid vs partial — sending paidAmount directly would overwrite
    // earlier payments
    updateInvoice.mutate({ id: invoiceId, payAmount: amount } as any);
    setPartialMode(false);
    setPartialAmt('');
  };

  const handleMarkUnpaid = () => {
    showConfirm({
      title: 'Mark as unpaid?',
      message: 'This will revert the invoice back to Sent.',
      confirmLabel: 'Mark unpaid',
      destructive: true,
      onConfirm: () => updateInvoice.mutate({ id: invoiceId, status: 'sent', paidDate: null } as any),
    });
  };

  const generateAndSharePDF = async (customMessage: string, notes: string) => {
    setPdfPending(true);
    try {
      const parsedItems = (JSON.parse(invoice?.items || '[]') as any[]).map((item: any) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit,
        unitPrice: item.unitPrice || 0,
      }));

      // Use actual invoice title (not truncated first-item description)
      const invoiceTitle = invoice?.title || (parsedItems[0]?.description ?? `Invoice ${num}`);

      const docData: PdfDocumentData = {
        documentType: 'invoice',
        documentNumber: invoice?.invoiceNumber || String(id).slice(-3),
        createdAt: invoice?.createdAt ?? new Date().toISOString(),
        dueDate: invoice?.dueDate,
        status: invoice?.status,
        jobTitle: invoiceTitle,
        customerName: invoice?.customerName ?? undefined,
        items: parsedItems,
        notes: notes || invoice?.notes || undefined,
        customMessage: customMessage || undefined,
        subtotal: parseFloat(invoice?.subtotal || '0'),
        gstAmount: parseFloat(invoice?.gstAmount || '0'),
        totalAmount: parseFloat(invoice?.totalAmount || '0'),
        includeGST: parseFloat(invoice?.gstAmount || '0') > 0,
      };

      const html = buildQuotePDF(docData, settings ?? {});
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setShowPDF(false);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: '.pdf',
        dialogTitle: `Invoice ${invoice?.invoiceNumber || id}`,
      });
    } catch (err: any) {
      showAlert('Could not generate PDF', err?.message ?? 'Please try again.');
    } finally {
      setPdfPending(false);
    }
  };

  const handleDelete = () => {
    showConfirm({
      title: 'Delete invoice?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteInvoice.mutate(invoiceId, { onSuccess: () => router.back() }),
    });
  };

  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const moreActions: SheetAction[] = [
    { label: 'Record partial payment', onPress: () => setPartialMode(true) },
    invoice?.stripePaymentLinkUrl ? { label: 'Copy Stripe link', onPress: () => copyToClipboard(invoice.stripePaymentLinkUrl, 'Stripe payment link') } : null,
    invoice?.squarePaymentLinkUrl ? { label: 'Copy Square link', onPress: () => copyToClipboard(invoice.squarePaymentLinkUrl, 'Square payment link') } : null,
    { label: 'Delete invoice', destructive: true, onPress: handleDelete },
  ].filter(Boolean) as SheetAction[];
  const handleMore = () => setShowMoreSheet(true);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={c.orange} />
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: c.muted }}>Invoice not found</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted }}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Parse items JSON
  let invoiceItems: Array<{ description: string; quantity: number; unit?: string; unitPrice?: number; total?: number }> = [];
  try { invoiceItems = JSON.parse(invoice?.items || '[]'); } catch {}

  const subtotal = invoice?.subtotal ? parseFloat(invoice.subtotal) : 0;
  const gst = invoice?.gstAmount ? parseFloat(invoice.gstAmount) : 0;
  const totalAmount = invoice?.totalAmount ? parseFloat(invoice.totalAmount) : 0;
  const status = invoice?.status || 'draft';
  const num = invoice?.invoiceNumber || `INV-${String(id).slice(-3)}`;

  // Title: try to find job title from items or notes
  const firstItem = invoiceItems[0];
  const title = firstItem?.description
    ? (firstItem.description.length > 30 ? firstItem.description.slice(0, 27) + '…' : firstItem.description)
    : `Invoice ${num}`;

  // Due date
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
  const dueDays = dueDate ? differenceInCalendarDays(dueDate, new Date()) : null;
  const dueDateStr = dueDate ? format(dueDate, 'EEE d MMM') : null;
  const dueLine = dueDateStr
    ? dueDays === 0
      ? `${dueDateStr} · due today`
      : dueDays !== null && dueDays > 0
      ? `${dueDateStr} · ${dueDays} day${dueDays === 1 ? '' : 's'}`
      : `${dueDateStr} · overdue`
    : null;

  // Status display
  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue' || (status === 'sent' && dueDays !== null && dueDays < 0);
  const statusColor = isPaid ? c.green : isOverdue ? c.red : c.blue;
  const statusTitle = isPaid ? 'Paid' : isOverdue ? 'Overdue' : status === 'draft' ? 'Draft' : status === 'partial' ? 'Partially paid' : 'Sent';
  const statusSub = isPaid
    ? (invoice?.paidDate ? `Paid on ${format(new Date(invoice.paidDate), 'EEE d MMM')}` : 'Payment received')
    : isOverdue
    ? `Was due ${dueDateStr || ''}`
    : status === 'partial'
    ? `$${parseFloat(invoice?.paidAmount || '0').toFixed(0)} received`
    : 'Awaiting payment';

  // Hero card colour: orange if overdue, dark otherwise
  const heroBg = isOverdue ? c.orangeDeep : c.ink;

  return (
    <>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.iconBtn}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{num}</Text>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {invoice?.customerName ? (
            <TouchableOpacity
              activeOpacity={invoice.customerId ? 0.7 : 1}
              onPress={() => invoice.customerId && router.push(`/customers/${invoice.customerId}` as any)}
            >
              <Text style={s.customerLink}>{invoice.customerName}{invoice.customerId ? ' ›' : ''}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {!isPaid && (
          <TouchableOpacity onPress={handleMore} activeOpacity={0.7} style={s.iconBtn}>
            <MoreHorizontal size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>

          {/* Amount due hero */}
          <View style={[s.heroCard, { backgroundColor: heroBg }]}>
            <View style={s.heroGlow} />
            <Text style={s.heroEyebrow}>{isPaid ? 'Amount paid' : 'Amount due'}</Text>
            <Text style={s.heroAmount}>
              ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {dueLine && !isPaid ? (
              <Text style={s.heroDue}>
                Due <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>{dueLine}</Text>
              </Text>
            ) : null}
          </View>

          {/* Status */}
          <Text style={s.sectionEyebrow}>Status</Text>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>{statusTitle}</Text>
                <Text style={s.statusSub}>{statusSub}</Text>
              </View>
            </View>
          </View>

          {/* Charges */}
          <Text style={s.sectionEyebrow}>
            Charges{invoiceItems.length > 0 ? ` · ${invoiceItems.length} items` : ''}
          </Text>
          <View style={[s.card, { padding: 0 }]}>
            {invoiceItems.length > 0 ? (
              invoiceItems.map((item, i) => {
                const lineTotal = item.total ?? ((item.quantity || 1) * (item.unitPrice || 0));
                return (
                  <View key={i} style={[s.lineRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.lineName}>{item.description}</Text>
                      {item.unitPrice ? (
                        <Text style={s.lineMeta}>
                          {item.quantity} {item.unit || 'ea'} @ ${item.unitPrice.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={s.lineAmt}>
                      ${lineTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted }}>No items</Text>
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
                <Text style={[s.totalLabel, { color: c.ink, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }]}>Total</Text>
                <Text style={[s.totalValue, { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }]}>
                  ${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment methods */}
          <Text style={s.sectionEyebrow}>Payment methods</Text>
          <View style={[s.card, { padding: 0 }]}>
            {/* Bank transfer */}
            {settings?.bsb || settings?.accountNumber ? (
              <View style={s.pmRow}>
                <View style={s.pmIcon}>
                  <Building2 size={16} color={c.mutedHi} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.pmLabel}>Bank transfer / EFT</Text>
                  {settings.accountName ? <Text style={s.pmDetail}>{settings.accountName}</Text> : null}
                  {settings.bankName ? <Text style={s.pmDetail}>{settings.bankName}</Text> : null}
                  {settings.bsb ? (
                    <TouchableOpacity style={s.copyRow} onPress={() => copyToClipboard(settings.bsb, 'BSB')} activeOpacity={0.7}>
                      <Text style={s.pmDetail}>BSB: <Text style={s.pmDetailBold}>{settings.bsb}</Text></Text>
                      <Copy size={12} color={c.muted} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                  {settings.accountNumber ? (
                    <TouchableOpacity style={s.copyRow} onPress={() => copyToClipboard(settings.accountNumber, 'Account number')} activeOpacity={0.7}>
                      <Text style={s.pmDetail}>Account: <Text style={s.pmDetailBold}>{settings.accountNumber}</Text></Text>
                      <Copy size={12} color={c.muted} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Check size={14} color={c.green} strokeWidth={2.5} />
              </View>
            ) : (
              <TouchableOpacity style={s.pmRow} onPress={() => router.push('/settings/bank' as any)} activeOpacity={0.7}>
                <View style={s.pmIcon}>
                  <Building2 size={16} color={c.mutedHi} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pmLabel}>Bank transfer / EFT</Text>
                  <Text style={[s.pmDetail, { color: c.orange }]}>Tap to add bank details →</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Card payment rows */}
            {settings?.stripeEnabled && (
              <View style={[s.pmRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                <View style={s.pmIcon}>
                  <CreditCard size={16} color={c.mutedHi} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pmLabel}>Pay by card (Stripe)</Text>
                  <Text style={s.pmDetail}>1.7% + 30¢ · Cards, Apple Pay, Google Pay</Text>
                </View>
                <Check size={14} color={c.green} strokeWidth={2.5} />
              </View>
            )}
            {settings?.squareEnabled && (
              <View style={[s.pmRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                <View style={s.pmIcon}>
                  <CreditCard size={16} color={c.mutedHi} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pmLabel}>Pay by Square</Text>
                  <Text style={s.pmDetail}>1.6% · Cards, Apple Pay, Google Pay</Text>
                </View>
                <Check size={14} color={c.green} strokeWidth={2.5} />
              </View>
            )}
          </View>

          {/* Notes */}
          {invoice?.notes ? (
            <>
              <Text style={s.sectionEyebrow}>Notes</Text>
              <View style={s.card}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.mutedHi, lineHeight: 20 }}>
                  {invoice.notes}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Action bar */}
      {!isPaid ? (
        <View style={s.bottomBar}>
          {partialMode && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <TextInput
                style={{ flex: 1, height: 44, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineMid, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.ink }}
                placeholder="Amount received ($)"
                placeholderTextColor={c.muted}
                keyboardType="decimal-pad"
                value={partialAmt}
                onChangeText={setPartialAmt}
                autoFocus
              />
              <TouchableOpacity
                style={{ height: 44, paddingHorizontal: 16, backgroundColor: c.green, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                onPress={handleRecordPartial}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>Record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ height: 44, paddingHorizontal: 12, backgroundColor: c.paperDeep, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => { setPartialMode(false); setPartialAmt(''); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.mutedHi }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => setShowPDF(true)} activeOpacity={0.7} style={s.pdfBtn}>
              <FileText size={16} color={c.orange} strokeWidth={2} />
              <Text style={s.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
            {settings?.stripeEnabled && (
              <TouchableOpacity
                onPress={handlePayByCard}
                activeOpacity={0.8}
                disabled={stripeLink.isPending}
                style={s.cardBtn}
              >
                {stripeLink.isPending
                  ? <ActivityIndicator size="small" color={c.ink} />
                  : <CreditCard size={16} color={c.ink} strokeWidth={2.2} />}
                <Text style={s.cardBtnText}>{invoice?.stripePaymentLinkUrl ? 'Share Stripe' : 'Stripe'}</Text>
              </TouchableOpacity>
            )}
            {settings?.squareEnabled && (
              <TouchableOpacity
                onPress={handlePayBySquare}
                activeOpacity={0.8}
                disabled={squareLink.isPending}
                style={s.cardBtn}
              >
                {squareLink.isPending
                  ? <ActivityIndicator size="small" color={c.ink} />
                  : <CreditCard size={16} color={c.ink} strokeWidth={2.2} />}
                <Text style={s.cardBtnText}>{invoice?.squarePaymentLinkUrl ? 'Share Square' : 'Square'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleMarkPaid}
              activeOpacity={0.8}
              disabled={updateInvoice.isPending}
              style={[s.markPaidBtn, { flex: 1 }]}
            >
              {updateInvoice.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Check size={18} color="#fff" strokeWidth={2.5} />}
              <Text style={s.markPaidBtnText}>Mark paid</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.bottomBar}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowPDF(true)} activeOpacity={0.7} style={s.pdfBtn}>
              <FileText size={16} color={c.orange} strokeWidth={2} />
              <Text style={s.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
            <View style={[s.paidBadge, { flex: 1 }]}>
              <Check size={18} color={c.green} strokeWidth={2.5} />
              <Text style={s.paidBadgeText}>Invoice paid — all done</Text>
            </View>
            <TouchableOpacity
              onPress={handleMarkUnpaid}
              activeOpacity={0.7}
              style={{ height: 54, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.paperDeep, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Manrope_700Bold', color: c.mutedHi }}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>

    <PDFComposeModal
      visible={showPDF}
      onClose={() => setShowPDF(false)}
      onShare={generateAndSharePDF}
      documentType="invoice"
      documentNumber={invoice?.invoiceNumber || String(id).slice(-3)}
      customerName={invoice?.customerName}
      jobTitle={invoice?.title || title}
      totalAmount={totalAmount}
      initialNotes={invoice?.notes}
      isPending={pdfPending}
    />

    <ActionSheetModal
      visible={showMoreSheet}
      title="Invoice options"
      actions={moreActions}
      onClose={() => setShowMoreSheet(false)}
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
  customerLink: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: c.blue,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${c.orange}88`,
    opacity: 0.35,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.5,
    lineHeight: 46,
    marginTop: 6,
  },
  heroDue: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
  statusSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lineName: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
    lineHeight: 18,
  },
  lineMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  lineAmt: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    minWidth: 70,
    textAlign: 'right',
    flexShrink: 0,
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
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pmIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: c.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
  pmDetail: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 1,
  },
  pmDetailBold: {
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  cardBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
  markPaidBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  markPaidBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  paidBadge: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.greenSoft,
    borderWidth: 1,
    borderColor: `${c.green}44`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  paidBadgeText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.green,
  },
  pdfBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.orangeSoft,
    borderWidth: 1,
    borderColor: `${c.orange}44`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  pdfBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
  },
});
