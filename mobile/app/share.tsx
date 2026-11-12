import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Animated, ActivityIndicator, Image, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { Check, FileText, Search, Sparkles, Contact, MessageSquare } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, RimCard, wellFill } from '@/components/Rim';
import { Press } from '@/components/Press';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useJobs } from '@/hooks/use-jobs';
import { useQuotes } from '@/hooks/use-quotes';
import { useCustomers } from '@/hooks/use-customers';
import { apiRequest } from '@/lib/api';
import { useIsOnline } from '@/lib/connectivity';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { keepSharedFile, photoDataUri, fileText, forgetFiles } from '@/lib/share-files';
import { keepFile, addCustomerNote, saveContact } from '@/lib/share-actions';
import { queueShare } from '@/lib/share-outbox';
import {
  setReceiptQueue, setQuotePrefill, setCustomerPrefill, setShareAfterLogin, type LocalFile,
} from '@/lib/share-handoff';
import {
  shareItems, shareMenu, itemsForAction, ACTION_LABELS, CANT_USE, parseVCard,
  type ShareAction, type ShareItem, type ContactCard,
} from '@shared/share-intake';
import { itemKey } from '@shared/price-list';

type Picking = null | { what: 'job' | 'quote' | 'customer'; action: ShareAction };

/**
 * Share to Vargen (docs/pricing-design.md, Build order step 5): "What do you
 * want to do with this?".
 *
 * Whatever was shared from another app (a supplier invoice or receipt, a job
 * site photo, a customer's message, a contact card; one or several) lands here,
 * in the main app (the iOS share extension only hands over). The menu comes
 * from the first item and applies to all; the AI's guess goes first, marked
 * "Suggested". Nothing happens until the tradie taps: nothing is saved silently.
 *
 *  - Signed out: sign in, then carry on with the same share.
 *  - No signal: the choice is kept on the phone and done when the signal is
 *    back (lib/share-outbox).
 *  - Anything Vargen can't use: said plainly.
 */
export default function ShareScreen() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useGradientScroll();
  const { hasShareIntent, shareIntent, resetShareIntent, isReady } = useShareIntentContext();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const online = useIsOnline();

  const items: ShareItem[] = useMemo(() => shareItems({
    text: shareIntent?.text ?? null,
    webUrl: shareIntent?.webUrl ?? null,
    files: (shareIntent?.files ?? []).map((f) => ({ path: f.path, mimeType: f.mimeType, fileName: f.fileName, size: f.size ?? null })),
  }), [shareIntent]);

  const [local, setLocal] = useState<Map<string, LocalFile>>(new Map());
  const [preparing, setPreparing] = useState(true);
  const [suggested, setSuggested] = useState<ShareAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<Picking>(null);
  const asked = useRef(false);

  // Signed out: sign in first, then come back to this same share (the tab layout brings us back).
  useEffect(() => {
    if (authLoading || isAuthenticated) return;
    setShareAfterLogin(true);
    router.replace('/(auth)/login');
  }, [authLoading, isAuthenticated]);

  // Copy what was shared somewhere the app owns, so it survives until it's used (and offline).
  useEffect(() => {
    if (!isReady) return;
    let live = true;
    (async () => {
      const map = new Map<string, LocalFile>();
      for (const it of items) {
        if (it.kind === 'text' || it.kind === 'unsupported') continue;
        try { map.set(it.file.path, await keepSharedFile(it.file)); } catch { /* unreadable: treated as unusable below */ }
      }
      if (live) { setLocal(map); setPreparing(false); }
    })();
    return () => { live = false; };
  }, [isReady, items]);

  // The AI's guess for the first item, when there's a signal. Only reorders the menu.
  useEffect(() => {
    if (preparing || asked.current || !online || !isAuthenticated) return;
    asked.current = true;
    const first = items.find((i) => i.kind !== 'unsupported');
    if (!first) return;
    (async () => {
      try {
        let body: any = null;
        if (first.kind === 'text') body = { kind: 'text', text: first.text };
        else if (first.kind === 'image' && local.get(first.file.path)) body = { kind: 'image', imageBase64: await photoDataUri(local.get(first.file.path)!) };
        if (!body) return;
        const r = await apiRequest('POST', '/api/share/suggest', body);
        const data = await r.json().catch(() => ({}));
        if (data?.suggested) setSuggested(data.suggested);
      } catch { /* no suggestion: the doc's default order */ }
    })();
  }, [preparing, online, isAuthenticated, items, local]);

  // Usable = recognised AND copied (a file the phone couldn't read counts as unusable).
  const usable = items.filter((i) => i.kind === 'text' || (i.kind !== 'unsupported' && local.has(i.file.path)));
  const menu = shareMenu(preparing ? items : usable, suggested);
  const skipped = items.length - usable.length;

  const done = (to: string) => {
    resetShareIntent();
    router.replace(to as any);
  };
  const close = () => {
    forgetFiles([...local.values()]);
    done('/(tabs)');
  };

  const filesFor = (action: ShareAction): LocalFile[] =>
    itemsForAction(usable, action).flatMap((i) => (i.kind !== 'text' && i.kind !== 'unsupported' && local.get(i.file.path) ? [local.get(i.file.path)!] : []));
  const textOf = () => usable.filter((i): i is { kind: 'text'; text: string } => i.kind === 'text').map((i) => i.text).join('\n\n');

  const savedForLater = (to = '/(tabs)') => {
    showAlert('Saved on this phone', "No signal right now. It'll be done as soon as you're back online.");
    done(to);
  };

  /** A choice that needs one of their jobs, quotes or customers goes via the picker first. */
  const choose = async (action: ShareAction) => {
    if (action === 'expense_job' || action === 'job_photo') return setPicking({ what: 'job', action });
    if (action === 'quote_photo') return setPicking({ what: 'quote', action });
    if (action === 'customer_note') return setPicking({ what: 'customer', action });
    await act(action, null);
  };

  const act = async (action: ShareAction, targetId: number | null) => {
    setPicking(null);
    setBusy(true);
    try {
      switch (action) {
        case 'expense':
        case 'expense_job': {
          const files = filesFor(action);
          if (!online) { await queueShare(files.map((file) => ({ action: 'expense', file, jobId: targetId }))); return savedForLater('/receipts'); }
          // The receipt screen reads each one and the tradie checks it before saving.
          setReceiptQueue(files, targetId);
          return done('/receipts/scan?share=1');
        }
        case 'job_photo': {
          const files = filesFor(action);
          if (!online) { await queueShare(files.map((file) => ({ action: 'job_photo', file, jobId: targetId! }))); return savedForLater(`/jobs/${targetId}`); }
          for (const f of files) await keepFile({ jobId: targetId! }, f);
          await forgetFiles(files);
          return done(`/jobs/${targetId}`);
        }
        case 'quote_photo': {
          const files = filesFor(action);
          if (!online) { await queueShare(files.map((file) => ({ action: 'quote_photo', file, quoteId: targetId! }))); return savedForLater(`/quotes/${targetId}`); }
          for (const f of files) await keepFile({ quoteId: targetId! }, f);
          await forgetFiles(files);
          return done(`/quotes/${targetId}`);
        }
        case 'quote_from_photo':
          // Kept with the quote once it's saved (use-quote-draft); the quote flow works offline.
          setQuotePrefill(null, filesFor(action));
          return done('/quotes/create');
        case 'quote_from_text':
          setQuotePrefill(textOf(), []);
          return done('/quotes/create');
        case 'customer_note': {
          const text = textOf();
          if (!online) { await queueShare([{ action: 'customer_note', customerId: targetId!, text, at: Date.now() }]); return savedForLater(`/customers/${targetId}`); }
          await addCustomerNote(targetId!, text);
          return done(`/customers/${targetId}`);
        }
        case 'save_customer': {
          const cards: ContactCard[] = [];
          for (const f of filesFor(action)) {
            const card = parseVCard(await fileText(f).catch(() => ''));
            if (card) cards.push(card);
          }
          await forgetFiles(filesFor(action));
          if (!cards.length) { showAlert("Couldn't read that contact", CANT_USE); return; }
          if (cards.length === 1) {
            // The new-customer form, filled in: the tradie checks it and saves.
            setCustomerPrefill(cards[0]);
            return done('/customers/new');
          }
          showConfirm({
            title: `Save ${cards.length} customers?`,
            message: cards.map((k) => k.name).join(', '),
            confirmLabel: 'Save them',
            onConfirm: async () => {
              if (!online) { await queueShare(cards.map((contact) => ({ action: 'save_customer', contact }))); return savedForLater('/customers'); }
              for (const k of cards) await saveContact(k);
              done('/customers');
            },
          });
          return;
        }
      }
    } catch (e: any) {
      showAlert("Couldn't do that", e?.message === CANT_USE ? CANT_USE : (e?.message || 'Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // ── What to show ──
  if (!isReady || authLoading || (preparing && hasShareIntent)) {
    return <SafeAreaView style={[s.center, { backgroundColor: c.paper }]}><ActivityIndicator color={c.orange} /></SafeAreaView>;
  }

  if (picking) {
    return <Picker what={picking.what} onBack={() => setPicking(null)} onPick={(id) => act(picking.action, id)} />;
  }

  const nothing = !hasShareIntent || !items.length;
  const unusable = !nothing && !menu.actions.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Shared to Vargen" title="What do you want to do with this?" onBack={close} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 14 }}>
        {nothing ? (
          <RimCard padding="lg"><Text style={s.plain}>Nothing came through. Try sharing it again.</Text></RimCard>
        ) : (
          <Preview items={items} local={local} />
        )}

        {unusable ? (
          <RimCard padding="lg"><Text style={s.plain}>{CANT_USE}</Text></RimCard>
        ) : null}
        {!unusable && skipped > 0 ? (
          <Text style={s.note}>{skipped} {skipped === 1 ? "item isn't" : "items aren't"} something Vargen can use, so {skipped === 1 ? "it'll be" : "they'll be"} left out.</Text>
        ) : null}
        {!online && menu.actions.length ? (
          <Text style={s.note}>No signal: what you pick is kept on this phone and done when you're back online.</Text>
        ) : null}

        {busy ? <ActivityIndicator color={c.orange} style={{ marginTop: 10 }} /> : (
          <View style={{ gap: 10 }}>
            {menu.actions.map((a, i) => (
              <Press
                key={a}
                style={[s.option, i === 0 && s.optionFirst]}
                pressedStyle={{ opacity: 0.85 }}
                onPress={() => choose(a)}
                accessibilityRole="button"
                accessibilityLabel={ACTION_LABELS[a]}
              >
                <Text style={[s.optionText, i === 0 && s.optionTextFirst]}>{ACTION_LABELS[a]}</Text>
                {i === 0 && suggested === a ? (
                  <View style={s.suggested}>
                    <Sparkles size={12} color={i === 0 ? '#fff' : c.orange} strokeWidth={2.4} />
                    <Text style={s.suggestedText}>Suggested</Text>
                  </View>
                ) : null}
              </Press>
            ))}
          </View>
        )}

        <Press style={s.cancel} pressedStyle={{ opacity: 0.7 }} onPress={close} accessibilityRole="button">
          <Text style={s.cancelText}>{nothing || unusable ? 'Close' : 'Cancel'}</Text>
        </Press>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

/** What was shared: photo thumbnails, PDF names, the message, the contact. */
function Preview({ items, local }: { items: ShareItem[]; local: Map<string, LocalFile> }) {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const photos = items.filter((i) => i.kind === 'image');
  const others = items.filter((i) => i.kind !== 'image');
  return (
    <RimCard padding="md" style={{ gap: 10 }}>
      {photos.length ? (
        <View style={s.thumbs}>
          {photos.slice(0, 6).map((p, i) => {
            const f = p.kind === 'image' ? local.get(p.file.path) : undefined;
            return f ? <Image key={i} source={{ uri: f.uri }} style={s.thumb} /> : <View key={i} style={[s.thumb, { backgroundColor: wellFill(isDark) }]} />;
          })}
          {photos.length > 6 ? <Text style={s.more}>+{photos.length - 6}</Text> : null}
        </View>
      ) : null}
      {others.map((it, i) => (
        <View key={i} style={s.row}>
          {it.kind === 'pdf' ? <FileText size={18} color={c.ink} strokeWidth={2} />
            : it.kind === 'contact' ? <Contact size={18} color={c.ink} strokeWidth={2} />
            : it.kind === 'text' ? <MessageSquare size={18} color={c.ink} strokeWidth={2} />
            : <FileText size={18} color={c.muted} strokeWidth={2} />}
          <Text style={[s.rowText, it.kind === 'unsupported' && { color: c.muted }]} numberOfLines={it.kind === 'text' ? 6 : 1}>
            {it.kind === 'text' ? it.text : it.file.fileName || (it.kind === 'contact' ? 'Contact card' : it.kind === 'pdf' ? 'PDF' : 'File')}
          </Text>
        </View>
      ))}
    </RimCard>
  );
}

/** "Which job / quote / customer?": theirs, searchable (from the phone's copy, so it works offline). */
function Picker({ what, onBack, onPick }: { what: 'job' | 'quote' | 'customer'; onBack: () => void; onPick: (id: number) => void }) {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const [q, setQ] = useState('');
  const jobs = (useJobs() as any).data ?? [];
  const quotes = (useQuotes() as any).data ?? [];
  const customers = (useCustomers() as any).data ?? [];
  const rows: { id: number; title: string; sub: string }[] = useMemo(() => {
    if (what === 'job') return jobs.map((j: any) => ({ id: j.id, title: j.title || 'Job', sub: [j.customerName, j.address].filter(Boolean).join(' · ') }));
    if (what === 'quote') return quotes.map((x: any) => ({ id: x.id, title: x.displayTitle || x.jobTitle || `Quote ${x.id}`, sub: [x.customerName, x.status].filter(Boolean).join(' · ') }));
    return customers.map((x: any) => ({ id: x.id, title: x.name, sub: [x.phone, x.email].filter(Boolean).join(' · ') }));
  }, [what, jobs, quotes, customers]);
  const shown = useMemo(() => {
    const k = itemKey(q);
    return k ? rows.filter((r) => itemKey(`${r.title} ${r.sub}`).includes(k)) : rows;
  }, [q, rows]);
  const title = what === 'job' ? 'Which job?' : what === 'quote' ? 'Which quote?' : 'Which customer?';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" />
      <GradientHeader eyebrow="Shared to Vargen" title={title} onBack={onBack} />
      <View style={{ paddingHorizontal: 20, flex: 1, gap: 10 }}>
        <View style={s.search}>
          <Search size={16} color={c.muted} strokeWidth={2.2} />
          <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={c.muted} />
        </View>
        <FlatList
          data={shown}
          keyExtractor={(r) => String(r.id)}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={s.note}>Nothing here yet.</Text>}
          renderItem={({ item }) => (
            <Press style={s.pickRow} pressedStyle={{ backgroundColor: wellFill(isDark) }} onPress={() => onPick(item.id)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={s.pickTitle} numberOfLines={1}>{item.title}</Text>
                {item.sub ? <Text style={s.pickSub} numberOfLines={1}>{item.sub}</Text> : null}
              </View>
              <Check size={16} color={c.muted} strokeWidth={2} />
            </Press>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plain: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.ink, textAlign: 'center', lineHeight: 21 },
  note: { fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi, lineHeight: 18 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  more: { fontSize: 14, fontFamily: 'HostGrotesk_700Bold', color: c.mutedHi },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowText: { flex: 1, fontSize: 14, fontFamily: 'HostGrotesk_600SemiBold', color: c.ink, lineHeight: 19 },
  option: {
    minHeight: 54, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: c.lineMid, backgroundColor: c.card,
  },
  optionFirst: { backgroundColor: c.orange, borderColor: c.orange },
  optionText: { flexShrink: 1, fontSize: 15.5, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
  optionTextFirst: { color: '#fff' },
  suggested: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  suggestedText: { fontSize: 11, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff' },
  cancel: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.mutedHi },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: wellFill(isDark) },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'HostGrotesk_500Medium', color: c.ink, paddingVertical: 11 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.lineSoft },
  pickTitle: { fontSize: 15, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  pickSub: { fontSize: 12.5, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
});
