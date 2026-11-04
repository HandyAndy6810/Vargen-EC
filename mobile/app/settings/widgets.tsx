import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary, wellFill } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useMemo, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { HOME_WIDGETS, resolveWidgetLayout, serializeWidgetLayout, type WidgetEntry } from '@shared/home-widgets';

const META = new Map(HOME_WIDGETS.map((w) => [w.id, w]));
const defaultLayout = () => resolveWidgetLayout(null);


export default function WidgetsScreen() {
  const { colors: c, isDark } = useTheme();
  const { scrollY, scrollProps } = useGradientScroll();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [saved, setSaved] = useState(false);

  // The same reading of settings.bladeOrder as Home: one entry per real widget,
  // so the arrows only ever swap rows you can see.
  const initialOrder = useMemo(() => resolveWidgetLayout(settings?.bladeOrder), [settings?.bladeOrder]);

  const [order, setOrder] = useState<WidgetEntry[]>(initialOrder);
  const loadedBladeOrder = useRef<string | null>(null);

  // Sync order when settings first loads or bladeOrder changes (useState ignores updates to initial value)
  useEffect(() => {
    const bo = settings?.bladeOrder ?? null;
    if (bo !== loadedBladeOrder.current) {
      loadedBladeOrder.current = bo;
      setOrder(initialOrder);
    }
  }, [settings?.bladeOrder, initialOrder]);

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
    const next = [...order];
    next[index] = { ...next[index], visible: !next[index].visible };
    setOrder(next);
    setSaved(false);
  };

  const handleSave = () => {
    updateSettings.mutate(
      { bladeOrder: serializeWidgetLayout(order) },
      {
        onSuccess: () => setSaved(true),
      }
    );
  };

  const handleReset = () => {
    setOrder(defaultLayout());
    setSaved(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="Preferences" title="Home widgets" />

      <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <Text style={s.subText}>Reorder and show/hide widgets on your home screen. Changes take effect immediately after saving.</Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={s.eyebrow}>Widget order</Text>
          <View style={s.list}>
            {order.map(({ id, visible }, index) => {
              const meta = META.get(id);
              if (!meta) return null;
              return (
                <View
                  key={id}
                  style={[s.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.lineSoft }, !visible && s.rowHidden]}
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
      </Animated.ScrollView>

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

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  subText: {
    fontSize: 13,
    fontFamily: 'HostGrotesk_500Medium',
    color: heroSecondary(isDark),
    lineHeight: 19,
  },
  eyebrow: {
    fontSize: 13,
    fontFamily: 'HostGrotesk_600SemiBold',
    color: heroSecondary(isDark),
    marginBottom: 8,
    marginLeft: 2,
  },
  list: {
    ...rimTile(c, isDark),
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
    backgroundColor: wellFill(isDark),
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  widgetLabel: {
    fontSize: 14,
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: c.ink,
  },
  mutedLabel: {
    color: c.muted,
  },
  widgetDesc: {
    fontSize: 11,
    fontFamily: 'HostGrotesk_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  resetText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk_700Bold',
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
    fontFamily: 'HostGrotesk_800ExtraBold',
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
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: c.green,
    letterSpacing: 0.2,
  },
});
