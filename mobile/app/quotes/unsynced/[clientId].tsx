import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { ChevronLeft, CloudOff, RefreshCw, Share2 } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { useOutbox, syncOutbox } from '@/lib/quote-outbox';
import { readUnsynced } from '@/lib/unsynced-quote';
import { useIsOnline } from '@/lib/connectivity';
import { buildQuotePDF } from '@/lib/quote-pdf';
import { sharePdf, documentFilename } from '@/lib/share-pdf';
import { showAlert } from '@/lib/dialogs';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A quote saved on this phone with no connection, not yet on the server. Read only:
 * it can't be edited or sent until it syncs (editing offline would need conflict
 * handling; sending needs the server). Its PDF can still be shared, built on the
 * phone and marked DRAFT, since it has no quote number yet.
 */
export default function UnsyncedQuoteScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const entry = useOutbox().find(e => e.clientId === clientId);
  const { data: settings } = useSettings();
  const online = useIsOnline();
  const [syncing, setSyncing] = useState(false);

  if (!entry) {
    // Synced (or removed) while open: the real quote is in the list now.
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
          <Text style={s.title}>Synced</Text>
          <Text style={s.sub}>This quote is on the server now. Find it in your quotes list.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const q = readUnsynced(entry);
  const items: any[] = Array.isArray(q.content.items) ? q.content.items : [];

  const syncNow = async () => {
    setSyncing(true);
    try { await syncOutbox(); } finally { setSyncing(false); }
  };

  const sharePdfDraft = async () => {
    const payload = {
      documentType: 'quote' as const,
      documentNumber: 'DRAFT',
      createdAt: format(new Date(q.savedAt), 'd MMM yyyy'),
      expiryDate: q.content.expiryDate || undefined,
      status: 'draft' as const,
      jobTitle: q.title,
      summary: q.content.summary || undefined,
      customerName: q.customerName || undefined,
      items: items.map(it => ({
        description: it.description || 'Item',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || undefined,
        unitPrice: Number(it.unitPrice) || 0,
      })),
      notes: q.content.notes || undefined,
      subtotal: q.subtotal, gstAmount: q.gst, totalAmount: q.total,
      includeGST: q.gst > 0,
    };
    try {
      await sharePdf(buildQuotePDF(payload, settings ?? {}), documentFilename(payload));
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/cancel|dismiss/i.test(msg)) return;
      showAlert('Could not share the quote', msg || 'Try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{q.reference}</Text>
          <Text style={s.title} numberOfLines={1}>{q.title}</Text>
        </View>
        <TouchableOpacity onPress={sharePdfDraft} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Share as a draft PDF">
          <Share2 size={17} color={c.orange} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }}>
        <View style={s.banner}>
          <CloudOff size={16} color={c.orangeDeep} strokeWidth={2.4} />
          <Text style={s.bannerText}>
            Not synced yet. Saved on this phone {online ? '' : 'with no connection '}and read only until it reaches the server.
            {q.lastError && online ? `\nLast try: ${q.lastError}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.syncBtn} onPress={syncNow} disabled={syncing} activeOpacity={0.8} accessibilityRole="button">
          {syncing ? <ActivityIndicator color="#fff" /> : <RefreshCw size={15} color="#fff" strokeWidth={2.6} />}
          <Text style={s.syncText}>Sync now</Text>
        </TouchableOpacity>

        <View style={s.card}>
          <Text style={s.label}>Customer</Text>
          <Text style={s.value}>{q.customerName || 'No customer yet'}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Items</Text>
          {items.map((it, i) => (
            <View key={i} style={[s.line, i > 0 && s.lineBorder]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.lineName} numberOfLines={2}>{it.description || 'Item'}</Text>
                <Text style={s.sub}>{Number(it.quantity) || 1} {it.unit || 'ea'} × {money(Number(it.unitPrice) || 0)}</Text>
              </View>
              <Text style={s.lineAmt}>{money((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))}</Text>
            </View>
          ))}
          <View style={[s.line, s.lineBorder]}>
            <Text style={[s.lineName, { flex: 1 }]}>Total{q.gst > 0 ? ' inc GST' : ''}</Text>
            <Text style={s.total}>{money(q.total)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 11, fontFamily: 'HostGrotesk_700Bold', color: c.orangeDeep },
  title: { fontSize: 18, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink, letterSpacing: -0.3 },
  sub: { fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2, textAlign: 'left' },
  banner: {
    flexDirection: 'row', gap: 10, backgroundColor: c.orangeSoft, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${c.orange}55`,
  },
  bannerText: { flex: 1, fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: c.orangeDeep, lineHeight: 18 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.orangeDeep, borderRadius: 14, paddingVertical: 14,
  },
  syncText: { fontSize: 15, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff' },
  card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, padding: 14 },
  label: { fontSize: 10, fontFamily: 'HostGrotesk_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  value: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  lineBorder: { borderTopWidth: 1, borderTopColor: c.lineSoft },
  lineName: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  lineAmt: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  total: { fontSize: 16, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
});
