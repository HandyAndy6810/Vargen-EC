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
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Plus, ChevronRight, User } from 'lucide-react-native';
import { useCustomers } from '@/hooks/use-customers';
import { queryClient } from '@/lib/queryClient';
import type { Customer } from '@shared/mobile-types';


function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function CustomerRow({ item, onPress }: { item: Customer; onPress: () => void }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const color = c.orange;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.row}>
      <View style={[s.avatar, { backgroundColor: c.ink }]}>
        <Text style={[s.avatarText, { color }]}>{initials(item.name)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {item.phone || item.email || 'No contact info'}
        </Text>
      </View>
      <ChevronRight size={14} color={c.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function CustomersScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading, isError, refetch } = useCustomers();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.navBtn}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.1} />
        </TouchableOpacity>
        <Text style={s.title}>Customers</Text>
        <TouchableOpacity
          style={[s.navBtn, { backgroundColor: c.orange }]}
          onPress={() => router.push('/customers/new' as any)}
        >
          <Plus size={18} color="#fff" strokeWidth={2.1} />
        </TouchableOpacity>
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
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: '#fde5e5', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f0a0a0' }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: '#d23b3b' }}>
            Couldn't load customers — tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.lineSoft }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} />}
          renderItem={({ item }) => (
            <CustomerRow item={item} onPress={() => router.push(`/customers/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <User size={32} color={c.muted} strokeWidth={1.5} />
              <Text style={s.emptyText}>
                {search ? 'No customers match that search' : 'No customers yet'}
              </Text>
              {!search && !isError && (
                <TouchableOpacity
                  style={s.emptyCta}
                  onPress={() => router.push('/customers/new' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={s.emptyCtaText}>Add your first customer</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          style={{ backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden', marginHorizontal: 20 }}
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
    paddingBottom: 16,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.lineMid,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: c.card,
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
    color: c.ink,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
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
    color: c.muted,
  },
  emptyCta: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.orange,
  },
  emptyCtaText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
});
