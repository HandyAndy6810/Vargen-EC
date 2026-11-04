import {
  View,
  Text,
  Animated,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { ScreenGradient, GradientHeader, GlassButton, RimCard, useGradientScroll } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { router } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Phone, MessageSquare, MapPin, Users } from 'lucide-react-native';
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
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const hasPhone = !!item.phone;
  // Company arrives with the customer details work; shown whenever it's there.
  const company = (item as Customer & { companyName?: string | null }).companyName;
  return (
    <RimCard padding="none" style={s.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}`}
        style={({ pressed }) => [s.cardMain, pressed && { opacity: 0.7 }]}
      >
        <View style={[s.avatar, { backgroundColor: avatarColor(item.name) }]}>
          <Text style={s.avatarText}>{initials(item.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.cardSub} numberOfLines={1}>
            {company || item.phone || item.email || 'No contact details yet'}
          </Text>
          {item.address ? (
            <View style={s.addrRow}>
              <MapPin size={12} color={c.muted} strokeWidth={2} />
              <Text style={s.addrText} numberOfLines={1}>{item.address}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={s.cardActions}>
        <Pressable
          style={({ pressed }) => [s.actionBtn, !hasPhone && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
          disabled={!hasPhone}
          onPress={() => item.phone && openCall(item.phone)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${item.name}`}
        >
          <Phone size={17} color={c.ink} strokeWidth={2.1} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.actionBtn, !hasPhone && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
          disabled={!hasPhone}
          onPress={() => item.phone && openText(item.phone)}
          accessibilityRole="button"
          accessibilityLabel={`Text ${item.name}`}
        >
          <MessageSquare size={17} color={c.ink} strokeWidth={2.1} />
        </Pressable>
      </View>
    </RimCard>
  );
}

export default function CustomersScreen() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const { scrollY, scrollProps } = useGradientScroll();
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
      c.phone?.includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      (c as Customer & { companyName?: string | null }).companyName?.toLowerCase().includes(q)
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
      {/* Search */}
      <View style={s.searchWrap}>
        <Search size={15} color={c.muted} strokeWidth={2} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, company, phone or address"
          accessibilityLabel="Search customers"
          placeholderTextColor={c.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {isError && !refreshing && (
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={s.errorBanner}>
          <Text style={s.errorText}>{data ? 'Showing the copy saved on this phone — tap to refresh' : "Couldn't load customers — tap to retry"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader
        eyebrow={customers.length
          ? `${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}${newThisMonth > 0 ? ` · ${newThisMonth} new this month` : ''}`
          : 'Your book'}
        title="Customers"
        right={
          <GlassButton filled label="Add customer" onPress={() => router.push('/customers/new' as any)}>
            <Plus size={19} color="#fff" strokeWidth={2.3} />
          </GlassButton>
        }
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      ) : (
        <Animated.FlatList
          {...scrollProps}
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
            <RimCard padding="lg" style={s.empty}>
              <View style={s.emptyIcon}>
                {search ? <Search size={26} color={c.orange} strokeWidth={2} /> : <Users size={28} color={c.orange} strokeWidth={1.8} />}
              </View>
              <Text style={s.emptyTitle}>
                {search ? `Nobody matches “${search.trim()}”` : 'Your customer book is empty'}
              </Text>
              <Text style={s.emptySub}>
                {search
                  ? 'Try part of a name, a company, a phone number or a street.'
                  : 'Add the people you work for once, and they’re ready for every quote, invoice and job. Customers you add while quoting land here too.'}
              </Text>
              {!isError && (
                <Pressable
                  style={({ pressed }) => [s.emptyCta, pressed && { opacity: 0.85 }]}
                  onPress={() => router.push('/customers/new' as any)}
                  accessibilityRole="button"
                >
                  <Plus size={16} color="#fff" strokeWidth={2.4} />
                  <Text style={s.emptyCtaText}>{search ? 'Add a new customer' : 'Add your first customer'}</Text>
                </Pressable>
              )}
            </RimCard>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 48,
    ...rimTile(c, isDark),
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HostGrotesk_500Medium',
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
    fontFamily: 'HostGrotesk_700Bold',
    color: c.red,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 12,
    gap: 8,
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
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.3,
  },
  cardName: {
    fontSize: 16,
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'HostGrotesk_600SemiBold',
    color: c.mutedHi,
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
    fontSize: 12,
    fontFamily: 'HostGrotesk_500Medium',
    color: c.muted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  // Call and Text: 44pt targets, quiet glass so the row reads as one tile.
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,29,33,0.06)',
  },
  empty: {
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: c.ink,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 13.5,
    fontFamily: 'HostGrotesk_500Medium',
    color: c.mutedHi,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 290,
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
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: '#fff',
  },
});
