import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ChevronLeft, Check, Maximize2, X } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { showAlert } from '@/lib/dialogs';
import { hapticSelect, hapticPress } from '@/lib/haptics';
import { animateNextLayout } from '@/lib/layout-animation';
import {
  QUOTE_TEMPLATES, DEFAULT_TEMPLATE_ID, buildDocumentWith, sampleDocument,
  thumbnailHtml, fitToWidthHtml, A4_PX,
} from '@/lib/pdf-templates';

// A spread wide enough that most trades find something that is theirs, kept to
// colours that stay legible as a heading and as white text on a solid block —
// every template uses the accent both ways.
const ACCENTS = [
  '#f26a2a', // the default orange
  '#d97706', // amber
  '#b45309', // bronze
  '#dc2626', // red
  '#e11d48', // rose
  '#7c3aed', // violet
  '#4f46e5', // indigo
  '#2563eb', // blue
  '#0284c7', // sky
  '#0d9488', // teal
  '#16a34a', // green
  '#15803d', // forest
  '#78350f', // brown
  '#475569', // slate
  '#141310', // near black
];
const FONTS = [
  { value: 'inter',   label: 'Modern' },
  { value: 'manrope', label: 'Rounded' },
  { value: 'georgia', label: 'Traditional' },
];

// Two per row, with the page's own proportions so a card reads as a sheet of paper.
const CARD_W = 152;
const THUMB_SCALE = CARD_W / A4_PX.width;
const CARD_H = Math.round(A4_PX.height * THUMB_SCALE);

/**
 * Pick the style a customer sees. Every card is the real template rendered small
 * through a WebView, not a drawing of it — so what's on the card is exactly what
 * gets sent, and a template change can never leave a stale picture behind.
 */
export default function QuoteStylingScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [fullId, setFullId] = useState<string | null>(null);

  const selected = settings?.quoteTemplate ?? DEFAULT_TEMPLATE_ID;
  const accent = settings?.quoteAccentColor ?? '#f26a2a';
  const font = settings?.quoteFontFamily ?? 'inter';

  // Sample rather than a real quote: the tradie may have none yet, and a consistent
  // document makes the styles genuinely comparable side by side.
  const sample = useMemo(() => sampleDocument('quote'), []);

  const save = (patch: object) => {
    update.mutate(patch as any, {
      onError: () => showAlert('Could not save', 'Check your connection and try again.'),
    });
  };

  const html = (id: string, scale?: number) => {
    const doc = buildDocumentWith(id, sample, settings ?? {});
    // Thumbnails are scaled to the card; the full preview is fitted to the screen
    // width, which a raw A4 page is about twice as wide as.
    return scale ? thumbnailHtml(doc, scale) : fitToWidthHtml(doc);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Quote styling</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          This is what your customer opens. Pick a style, then set the colour and type
          to match your business — every style uses both.
        </Text>

        <View style={s.group}>
          <Text style={s.groupLabel}>Style</Text>
          <View style={s.grid}>
            {QUOTE_TEMPLATES.map(t => {
              const on = t.id === selected;
              return (
                <View key={t.id} style={s.cardWrap}>
                  <TouchableOpacity
                    style={[s.card, on && { borderColor: c.orange, borderWidth: 2 }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (on) return;
                      animateNextLayout();
                      hapticSelect();
                      save({ quoteTemplate: t.id });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Use the ${t.name} style`}
                  >
                    <View style={s.thumbClip} pointerEvents="none">
                      <WebView
                        style={{ width: CARD_W, height: CARD_H, backgroundColor: '#fff' }}
                        originWhitelist={['*']}
                        source={{ html: html(t.id, THUMB_SCALE) }}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                      />
                    </View>

                    {on ? (
                      <View style={[s.tick, { backgroundColor: c.orange }]}>
                        <Check size={13} color="#fff" strokeWidth={3} />
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={s.expand}
                      onPress={() => { hapticPress(); setFullId(t.id); }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview the ${t.name} style full size`}
                    >
                      <Maximize2 size={12} color="#fff" strokeWidth={2.6} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  <Text style={[s.cardName, on && { color: c.orange }]}>{t.name}</Text>
                  <Text style={s.cardBlurb}>{t.blurb}</Text>
                </View>
              );
            })}
          </View>
          <Text style={s.hint}>
            More styles are on the way. Tap the corner of any card to see it full size.
          </Text>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Colour</Text>
          <View style={s.swatchRow}>
            {ACCENTS.map(col => (
              <TouchableOpacity
                key={col}
                style={[
                  s.swatch,
                  { backgroundColor: col, borderColor: accent === col ? c.ink : 'transparent' },
                ]}
                activeOpacity={0.8}
                onPress={() => { hapticSelect(); save({ quoteAccentColor: col }); }}
                accessibilityRole="button"
                accessibilityLabel={`Use ${col} as the accent colour`}
              />
            ))}
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Type</Text>
          <View style={s.chipsRow}>
            {FONTS.map(f => {
              const on = font === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    s.chip,
                    { borderColor: on ? c.orange : c.lineMid, backgroundColor: on ? c.orangeSoft : c.card },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => { hapticSelect(); save({ quoteFontFamily: f.value }); }}
                >
                  <Text style={[s.chipLabel, { color: on ? c.orangeDeep : c.mutedHi }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.hint}>
            Your logo, business details and ABN come from Business details.
          </Text>
        </View>
      </ScrollView>

      {/* Full-size preview, on the real A4 page */}
      <Modal visible={!!fullId} animationType="slide" onRequestClose={() => setFullId(null)}>
        {/* SafeAreaView does not receive the insets inside a Modal, so the bar
            rendered underneath the status bar and its close button could not be
            tapped — the preview became a trap. The measured inset always works. */}
        <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
          <View style={s.modalBar}>
            <Text style={s.modalTitle}>
              {QUOTE_TEMPLATES.find(t => t.id === fullId)?.name ?? 'Preview'}
            </Text>
            <TouchableOpacity
              onPress={() => setFullId(null)}
              style={s.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Close the preview"
            >
              <X size={19} color={c.ink} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          {fullId ? (
            <WebView
              style={{ flex: 1, backgroundColor: '#fff' }}
              originWhitelist={['*']}
              source={{ html: html(fullId) }}
            />
          ) : null}
          {fullId && fullId !== selected ? (
            <View style={[s.modalFoot, { paddingBottom: 12 + insets.bottom }]}>
              <TouchableOpacity
                style={[s.useBtn, { backgroundColor: c.orange }]}
                activeOpacity={0.85}
                onPress={() => {
                  hapticSelect();
                  save({ quoteTemplate: fullId });
                  setFullId(null);
                }}
              >
                <Text style={s.useBtnText}>Use this style</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 },
    backBtn: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: c.card,
      borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center',
    },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
    intro: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', color: c.muted, lineHeight: 19, paddingHorizontal: 20, paddingTop: 4 },
    group: { paddingHorizontal: 20, paddingTop: 24 },
    groupLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    cardWrap: { width: CARD_W },
    card: {
      width: CARD_W, height: CARD_H, borderRadius: 10, overflow: 'hidden',
      backgroundColor: '#fff', borderWidth: 1, borderColor: c.lineMid,
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1,
      shadowRadius: 8, elevation: 3,
    },
    thumbClip: { width: CARD_W, height: CARD_H, overflow: 'hidden' },
    tick: {
      position: 'absolute', top: 7, left: 7, width: 22, height: 22, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
    },
    expand: {
      position: 'absolute', bottom: 7, right: 7, width: 24, height: 24, borderRadius: 8,
      backgroundColor: 'rgba(20,19,16,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    cardName: { fontSize: 13.5, fontFamily: 'Manrope_800ExtraBold', color: c.ink, marginTop: 8 },
    cardBlurb: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, lineHeight: 15, marginTop: 2 },
    hint: { fontSize: 11.5, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 14, lineHeight: 17 },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatch: { width: 34, height: 34, borderRadius: 11, borderWidth: 2.5 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
    modalBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.lineSoft,
    },
    modalTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
    modalFoot: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.lineSoft },
    useBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    useBtnText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  });
}
