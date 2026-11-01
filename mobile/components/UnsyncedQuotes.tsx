import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CloudOff, RefreshCw, ChevronRight } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useOutbox, syncOutbox } from '@/lib/quote-outbox';
import { readUnsynced } from '@/lib/unsynced-quote';
import { useIsOnline } from '@/lib/connectivity';
import { hapticSelect } from '@/lib/haptics';

const money = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Quotes saved on this phone with no connection, at the top of the quotes list
 * until they reach the server. Each opens read-only; "Sync now" tries straight away
 * (it also happens on its own when the app comes back or the connection returns).
 */
export function UnsyncedQuotes() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const entries = useOutbox();
  const online = useIsOnline();
  const [syncing, setSyncing] = useState(false);
  if (!entries.length) return null;

  const syncNow = async () => {
    hapticSelect();
    setSyncing(true);
    try { await syncOutbox(); } finally { setSyncing(false); }
  };

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <CloudOff size={15} color={c.orangeDeep} strokeWidth={2.4} />
        <Text style={s.headText}>
          {entries.length} quote{entries.length === 1 ? '' : 's'} not synced yet
          {online ? '' : ' · offline'}
        </Text>
        <TouchableOpacity
          style={s.syncBtn}
          onPress={syncNow}
          disabled={syncing}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Sync now"
        >
          {syncing
            ? <ActivityIndicator size="small" color={c.orangeDeep} />
            : <RefreshCw size={13} color={c.orangeDeep} strokeWidth={2.6} />}
          <Text style={s.syncText}>Sync now</Text>
        </TouchableOpacity>
      </View>
      {entries.map((e) => {
        const q = readUnsynced(e);
        return (
          <TouchableOpacity
            key={q.clientId}
            style={s.row}
            activeOpacity={0.7}
            onPress={() => router.push(`/quotes/unsynced/${q.clientId}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`${q.title}, not synced yet`}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title} numberOfLines={1}>{q.title}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {q.customerName || 'No customer'} · {q.reference}
              </Text>
              {q.lastError && online ? <Text style={s.err} numberOfLines={1}>Last try: {q.lastError}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={s.amount}>{money(q.total)}</Text>
              <View style={s.badge}><Text style={s.badgeText}>Not synced yet</Text></View>
            </View>
            <ChevronRight size={16} color={c.muted} strokeWidth={2.2} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: {
    backgroundColor: c.orangeSoft, borderRadius: 16, borderWidth: 1, borderColor: `${c.orange}55`,
    padding: 12, gap: 8, marginHorizontal: 20, marginBottom: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { flex: 1, fontSize: 13, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orangeDeep },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: c.orangeDeep,
  },
  syncText: { fontSize: 12, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orangeDeep },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.lineSoft,
  },
  title: { fontSize: 14, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
  meta: { fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
  err: { fontSize: 11, fontFamily: 'HostGrotesk_600SemiBold', color: c.red, marginTop: 2 },
  amount: { fontSize: 14, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
  badge: { backgroundColor: c.orangeDeep, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff', letterSpacing: 0.3 },
});
