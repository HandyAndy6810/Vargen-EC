import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Plus, ChevronRight, User } from 'lucide-react-native';
import { useCustomers } from '@/hooks/use-customers';
import { queryClient } from '@/lib/queryClient';
import type { Customer } from '@shared/mobile-types';

const ORANGE     = '#f26a2a';
const INK        = '#141310';
const PAPER      = '#f7f4ee';
const CARD       = '#ffffff';
const MUTED      = 'rgba(20,19,16,0.55)';
const MUTED_HI   = 'rgba(20,19,16,0.72)';
const LINE_SOFT  = 'rgba(20,19,16,0.08)';
const LINE_MID   = 'rgba(20,19,16,0.14)';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function CustomerRow({ item, onPress }: { item: Customer; onPress: () => void }) {
  const color = ORANGE;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.row}>
      <View style={[s.avatar, { backgroundColor: INK }]}>
        <Text style={[s.avatarText, { color }]}>{initials(item.name)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {item.phone || item.email || 'No contact info'}
        </Text>
      </View>
      <ChevronRight size={14} color={MUTED} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function CustomersScreen() {
  const { data, isLoading, refetch } = useCustomers();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const customers = (data as Customer[]) || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [customers, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBtn}>
          <ChevronLeft size={18} color={INK} strokeWidth={2.1} />
        </TouchableOpacity>
        <Text style={s.title}>Customers</Text>
        <TouchableOpacity
          style={[s.navBtn, { backgroundColor: ORANGE }]}
          onPress={() => router.push('/customers/new' as any)}
        >
          <Plus size={18} color="#fff" strokeWidth={2.1} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Search size={15} color={MUTED} strokeWidth={2} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search customers…"
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: LINE_SOFT }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
          renderItem={({ item }) => (
            <CustomerRow item={item} onPress={() => router.push(`/customers/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <User size={32} color={MUTED} strokeWidth={1.5} />
              <Text style={s.emptyText}>
                {search ? 'No customers match that search' : 'No customers yet'}
              </Text>
            </View>
          }
          style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: LINE_SOFT, overflow: 'hidden', marginHorizontal: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE_MID,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: INK,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: CARD,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
  },
  rowName: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
});
