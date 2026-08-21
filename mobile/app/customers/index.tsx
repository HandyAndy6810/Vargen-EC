import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Plus, Phone, MessageSquare, MapPin, Users } from 'lucide-react-native';
import { useCustomers } from '@/hooks/use-customers';
import type { Customer } from '@shared/mobile-types';


function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// Deterministic accent per customer so the list has visual variety and each
// person is recognisable at a glance, rather than a wall of identical avatars.
const AVATAR_BG = ['#F26A2A', '#1f6feb', '#22a06b', '#8b5cf6', '#e0526e', '#0e9aa7'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function openCall(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}
function openText(phone: string) {
  Linking.openURL(`sms:${phone}`).catch(() => {});
}

function CustomerCard({ item, onPress }: { item: Customer; onPress: () => void }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const hasPhone = !!item.phone;
  return (
    <View style={s.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.cardMain}>
        <View style={[s.avatar, { backgroundColor: avatarColor(item.name) }]}>
          <Text style={s.avatarText}>{initials(item.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.cardSub} numberOfLines={1}>
            {item.phone || item.email || 'No contact info'}
          </Text>
          {item.address ? (
            <View style={s.addrRow}>
              <MapPin size={11} color={c.muted} strokeWidth={2} />
              <Text style={s.addrText} numberOfLines={1}>{item.address}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <View style={s.cardActions}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.greenSoft }, !hasPhone && { opacity: 0.35 }]}
          disabled={!hasPhone}
          onPress={() => item.phone && openCall(item.phone)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${item.name}`}
        >
          <Phone size={16} color={c.green} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.blueSoft }, !hasPhone && { opacity: 0.35 }]}
          disabled={!hasPhone}
          onPress={() => item.phone && openText(item.phone)}
          accessibilityRole="button"
          accessibilityLabel={`Text ${item.name}`}
        >
          <MessageSquare size={16} color={c.blue} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CustomersScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading, isError, refetch } = useCustomers();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const customers = (data as Customer[]) || [];

  // Sorted alphabetically for findability
  const sorted = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [sorted, search]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return customers.filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [customers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const ListHeader = (
    <View>
      {/* Hero stat card */}
      <View style={s.heroCard}>
        <View style={s.heroGlow} />
        <Text style={s.heroEyebrow}>Your book</Text>
        <Text style={s.heroNumber}>{customers.length}</Text>
        <Text style={s.heroSub}>
          {customers.length === 1 ? 'customer' : 'customers'}
          {newThisMonth > 0 ? `  ·  ${newThisMonth} new this month` : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Search size={15} color={c.muted} strokeWidth={2} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search customers…"
          placeholderTextColor={c.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {isError && !refreshing && (
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={s.errorBanner}>
          <Text style={s.errorText}>Couldn't load customers — tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.navBtn}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.1} />
        </TouchableOpacity>
        <Text style={s.title}>Customers</Text>
        <TouchableOpacity
          style={[s.navBtn, { backgroundColor: c.orange, borderColor: c.orange }]}
          onPress={() => router.push('/customers/new' as any)}
          accessibilityRole="button"
          accessibilityLabel="Add customer"
        >
          <Plus size={18} color="#fff" strokeWidth={2.1} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CustomerCard item={item} onPress={() => router.push(`/customers/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}><Users size={30} color={c.orange} strokeWidth={1.6} /></View>
              <Text style={s.emptyTitle}>
                {search ? 'No matches' : 'No customers yet'}
              </Text>
              <Text style={s.emptySub}>
                {search ? 'Try a different name or number.' : 'Add your first customer to start quoting and invoicing.'}
              </Text>
              {!search && !isError && (
                <TouchableOpacity style={s.emptyCta} onPress={() => router.push('/customers/new' as any)} activeOpacity={0.85}>
                  <Plus size={16} color="#fff" strokeWidth={2.4} />
                  <Text style={s.emptyCtaText}>Add your first customer</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: c.ink,
    borderRadius: 22,
    padding: 22,
    marginTop: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: `${c.orange}55`,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroNumber: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.4,
    lineHeight: 46,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.lineMid,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
  },
  errorBanner: {
    marginBottom: 12,
    backgroundColor: c.redSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: c.red,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.red,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.lineSoft,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.3,
  },
  cardName: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12.5,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  addrText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 260,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: c.orange,
  },
  emptyCtaText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
});
