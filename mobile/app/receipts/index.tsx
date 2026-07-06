import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showConfirm } from '@/lib/dialogs';
import { ChevronLeft, Plus, Camera, Trash2, Tag } from 'lucide-react-native';
import { useReceipts, useDeleteReceipt } from '@/hooks/use-receipts';

const ORANGE      = '#f26a2a';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const CARD        = '#ffffff';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const GREEN       = '#2a9d4c';
const GREEN_SOFT  = '#e5f6eb';
const PURPLE      = '#7c3aed';
const PURPLE_SOFT = '#ede9fe';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Materials:     { bg: '#e0f2fe', text: '#0369a1' },
  Equipment:     { bg: '#fef3c7', text: '#92400e' },
  Fuel:          { bg: '#fee2e2', text: '#b91c1c' },
  Subcontractor: { bg: '#ede9fe', text: '#7c3aed' },
  Food:          { bg: '#d1fae5', text: '#065f46' },
  Other:         { bg: '#f3f4f6', text: '#4b5563' },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ReceiptsScreen() {
  const { data: receipts = [], isLoading, refetch, isRefetching } = useReceipts();
  const deleteMutation = useDeleteReceipt();

  const totalSpend = receipts.reduce((sum: number, r: any) => sum + (Number(r.totalAmount) || 0), 0);

  const onDelete = useCallback((id: number, vendor: string) => {
    showConfirm({
      title: 'Delete Receipt',
      message: `Delete receipt from "${vendor || 'Unknown vendor'}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(id),
    });
  }, [deleteMutation]);

  const renderItem = ({ item }: { item: any }) => {
    const catStyle = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other;
    return (
      <View style={s.receiptCard}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.vendorText} numberOfLines={1}>
              {item.vendor || 'Unknown vendor'}
            </Text>
            {item.receiptDate ? (
              <Text style={s.dateText}>{formatDate(item.receiptDate)}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={s.amountText}>
              ${Number(item.totalAmount || 0).toFixed(2)}
            </Text>
            <View style={[s.categoryPill, { backgroundColor: catStyle.bg }]}>
              <Text style={[s.categoryPillText, { color: catStyle.text }]}>
                {item.category || 'Other'}
              </Text>
            </View>
          </View>
        </View>
        {item.notes ? (
          <Text style={s.notesText} numberOfLines={2}>{item.notes}</Text>
        ) : null}
        <View style={s.cardBottom}>
          {item.items ? (() => {
            try {
              const parsed = JSON.parse(item.items);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return (
                  <Text style={s.itemsCountText}>
                    {parsed.length} line item{parsed.length !== 1 ? 's' : ''}
                  </Text>
                );
              }
            } catch {}
            return null;
          })() : null}
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => onDelete(item.id, item.vendor)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={15} color={MUTED} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Summary card */}
      <View style={s.summaryCard}>
        <View style={s.summaryGlow} />
        <Text style={s.summaryEyebrow}>Total Spend</Text>
        <Text style={s.summaryAmount}>${totalSpend.toFixed(2)}</Text>
        <Text style={s.summaryCount}>{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} tracked</Text>
      </View>

      <Text style={s.sectionEyebrow}>All Receipts</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconCircle}>
        <Camera size={32} color={ORANGE} strokeWidth={1.5} />
      </View>
      <Text style={s.emptyTitle}>No receipts yet</Text>
      <Text style={s.emptySubtitle}>Scan a receipt with your camera to track your expenses automatically.</Text>
      <TouchableOpacity style={s.emptyCta} onPress={() => router.push('/receipts/scan')}>
        <Text style={s.emptyCtaText}>Scan your first receipt</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={22} color={INK} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Receipts</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/receipts/scan')} activeOpacity={0.8}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ORANGE} size="large" />
        </View>
      ) : (
        <FlatList
          data={receipts as any[]}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={ORANGE}
            />
          }
          showsVerticalScrollIndicator={false}
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
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryCard: {
    backgroundColor: INK,
    borderRadius: 22,
    padding: 22,
    marginTop: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${ORANGE}55`,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 38,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -1.2,
  },
  summaryCount: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  receiptCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    padding: 16,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  vendorText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    letterSpacing: -0.2,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  notesText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED_HI,
    lineHeight: 17,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  itemsCountText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCta: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  emptyCtaText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
