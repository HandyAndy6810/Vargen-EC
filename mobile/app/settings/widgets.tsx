import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useMemo, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';


type WidgetMeta = {
  id: string;
  label: string;
  description: string;
};

const WIDGET_META: WidgetMeta[] = [
  { id: 'quickactions', label: 'Quick Actions',     description: 'Start timer, scan, AI quote, navigate' },
  { id: 'schedule',     label: 'Today\'s Schedule', description: 'Jobs on today and upcoming' },
  { id: 'outstanding',  label: 'Outstanding',       description: 'Unpaid & overdue invoice totals' },
  { id: 'weather',      label: 'Weather',           description: '7-day forecast + rain warnings' },
  { id: 'recentquotes', label: 'Recent Quotes',     description: 'Last 5 quotes with status' },
  { id: 'pipeline',     label: 'Pipeline',          description: 'Quote funnel counts' },
  { id: 'revenue',      label: 'Revenue',           description: 'Paid invoice total' },
  { id: 'nudge',        label: 'AI Nudge',          description: 'Smart suggestions based on your data' },
];

const DEFAULT_ORDER = WIDGET_META.map(w => w.id);

export default function WidgetsScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [saved, setSaved] = useState(false);

  // Parse saved order from settings.bladeOrder
  const initialOrder: string[] = useMemo(() => {
    try {
      const raw = settings?.bladeOrder;
      const parsed = raw ? JSON.parse(raw) : [];
      if (parsed.length > 0 && WIDGET_META.some(w => parsed.includes(w.id) || parsed.includes(`-${w.id}`))) {
        // Ensure all widgets are present (add missing ones at end)
        const existing = new Set(parsed.map((id: string) => id.replace(/^-/, '')));
        const missing = DEFAULT_ORDER.filter(id => !existing.has(id));
        return [...parsed, ...missing];
      }
    } catch {}
    return DEFAULT_ORDER;
  }, [settings?.bladeOrder]);

  const [order, setOrder] = useState<string[]>(initialOrder);
  const loadedBladeOrder = useRef<string | null>(null);

  // Sync order when settings first loads or bladeOrder changes (useState ignores updates to initial value)
  useEffect(() => {
    const bo = settings?.bladeOrder ?? null;
    if (bo !== loadedBladeOrder.current) {
      loadedBladeOrder.current = bo;
      setOrder(initialOrder);
    }
  }, [settings?.bladeOrder, initialOrder]);

  const isVisible = (id: string) => !order.find(entry => entry === `-${id}`);
  const idOf = (entry: string) => entry.replace(/^-/, '');

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...order];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setOrder(next);
    setSaved(false);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const next = [...order];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setOrder(next);
    setSaved(false);
  };

  const toggleVisible = (index: number) => {
    const entry = order[index];
    const next = [...order];
    next[index] = entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
    setOrder(next);
    setSaved(false);
  };

  const handleSave = () => {
    updateSettings.mutate(
      { bladeOrder: JSON.stringify(order) },
      {
        onSuccess: () => setSaved(true),
      }
    );
  };

  const handleReset = () => {
    setOrder(DEFAULT_ORDER);
    setSaved(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.navBtn} activeOpacity={0.7}>
          <ChevronLeft size={18} color={c.ink} strokeWidth={2.1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Customise Widgets</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <Text style={s.subText}>Reorder and show/hide widgets on your home screen. Changes take effect immediately after saving.</Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={s.eyebrow}>Widget Order</Text>
          <View style={s.list}>
            {order.map((entry, index) => {
              const id = idOf(entry);
              const meta = WIDGET_META.find(w => w.id === id);
              if (!meta) return null;
              const visible = !entry.startsWith('-');
              return (
                <View
                  key={id}
                  style={[s.row, index > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }, !visible && s.rowHidden]}
                >
                  {/* Reorder buttons */}
                  <View style={s.reorderCol}>
                    <TouchableOpacity
                      onPress={() => moveUp(index)}
                      style={[s.arrowBtn, index === 0 && s.arrowDisabled]}
                      disabled={index === 0}
                      activeOpacity={0.6}
                    >
                      <ChevronUp size={14} color={index === 0 ? c.muted : c.ink} strokeWidth={2.2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(index)}
                      style={[s.arrowBtn, index === order.length - 1 && s.arrowDisabled]}
                      disabled={index === order.length - 1}
                      activeOpacity={0.6}
                    >
                      <ChevronDown size={14} color={index === order.length - 1 ? c.muted : c.ink} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>

                  {/* Widget info */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.widgetLabel, !visible && s.mutedLabel]}>{meta.label}</Text>
                    <Text style={s.widgetDesc} numberOfLines={1}>{meta.description}</Text>
                  </View>

                  {/* Visibility toggle */}
                  <Switch
                    value={visible}
                    onValueChange={() => toggleVisible(index)}
                    trackColor={{ false: c.lineMid, true: c.greenSoft }}
                    thumbColor={visible ? c.green : c.muted}
                    ios_backgroundColor={c.lineMid}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Reset link */}
        <TouchableOpacity onPress={handleReset} style={{ alignItems: 'center', paddingTop: 18 }} activeOpacity={0.7}>
          <Text style={s.resetText}>Reset to default order</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        {saved ? (
          <View style={s.savedRow}>
            <Text style={s.savedText}>✓ Saved</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.saveBtn, updateSettings.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={updateSettings.isPending}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>Save widget layout</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.2,
  },
  subText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    lineHeight: 19,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  list: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.lineSoft,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowHidden: {
    opacity: 0.45,
  },
  reorderCol: {
    gap: 2,
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: c.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  widgetLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
  },
  mutedLabel: {
    color: c.muted,
  },
  widgetDesc: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  resetText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.orange,
    textDecorationLine: 'underline',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.paper,
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 10,
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: 0.2,
  },
  savedRow: {
    height: 52,
    borderRadius: 16,
    backgroundColor: c.greenSoft,
    borderWidth: 1,
    borderColor: c.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.green,
    letterSpacing: 0.2,
  },
});
