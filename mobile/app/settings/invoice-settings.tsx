import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Alert, Image, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/dialogs';
import { ChevronLeft, Image as ImageIcon, X, Sparkles, Type } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { apiRequest } from '@/lib/api';

function makeStyles(c: Colors) {
  return StyleSheet.create({
    logoPreview: { width: 72, height: 72, borderRadius: 12, resizeMode: 'contain' },
    logoPlaceholder: { width: 72, height: 72, borderRadius: 12, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    urlInput: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.ink, paddingVertical: 0 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
    titleWrap: { flex: 1 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    rowLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 },
    rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
    swatchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
    swatch: { width: 36, height: 36, borderRadius: 10, borderWidth: 2 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

const TERM_DAYS = [7, 14, 21, 30];
const ACCENT_COLORS = ['#f26a2a', '#2563eb', '#16a34a', '#64748b', '#141310'];
const FONTS = [
  { value: 'inter', label: 'Inter' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'georgia', label: 'Georgia' },
];
const HEADER_STYLES = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'classic', label: 'Classic' },
];

function makeInitialsSvg(businessName: string, accentColor: string): string {
  const words = businessName.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (businessName.slice(0, 2)).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" rx="16" fill="${accentColor}"/><text x="100" y="68" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function InvoiceSettingsScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [generating, setGenerating] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.orange} />
        </View>
      </SafeAreaView>
    );
  }

  const save = (patch: object) => {
    update.mutate(patch as any, {
      onError: () => showAlert('Error', 'Could not save. Please try again.'),
    });
  };

  const terms = settings?.paymentTermsDays ?? 14;
  const gst = settings?.includeGST ?? true;
  const accent = settings?.quoteAccentColor ?? '#f26a2a';
  const font = settings?.quoteFontFamily ?? 'inter';
  const headerStyle = settings?.quoteHeaderStyle ?? 'gradient';
  const logoUrl = settings?.logoUrl ?? '';

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Allow access to your photo library to pick a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 2],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const ext = result.assets[0].mimeType?.split('/')[1] ?? 'jpeg';
      save({ logoUrl: `data:image/${ext};base64,${result.assets[0].base64}` });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Invoice & Quote Settings</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Payment terms */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Payment</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Payment terms</Text>
                <Text style={s.rowSub}>Days until invoice is due</Text>
              </View>
            </View>
            <View style={s.chipsRow}>
              {TERM_DAYS.map(d => {
                const active = terms === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => save({ paymentTermsDays: d })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{d} days</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[s.row, s.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Include GST</Text>
                <Text style={s.rowSub}>Add 10% GST to all quotes and invoices</Text>
              </View>
              <Switch
                value={gst}
                onValueChange={(v) => save({ includeGST: v })}
                trackColor={{ false: c.lineSoft, true: c.orange }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Logo */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Business logo</Text>
          <View style={s.card}>
            <View style={[s.row, { gap: 14 }]}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={s.logoPreview} />
              ) : (
                <TouchableOpacity style={s.logoPlaceholder} onPress={pickLogo} activeOpacity={0.7}>
                  <ImageIcon size={22} color={c.muted} strokeWidth={1.8} />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1, gap: 8 }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center' }}
                  onPress={pickLogo}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink }}>{logoUrl ? 'Replace logo' : 'Pick from camera roll'}</Text>
                </TouchableOpacity>
                {!logoUrl ? (
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onPress={() => save({ logoUrl: makeInitialsSvg(settings?.businessName ?? '', accent) })}
                    activeOpacity={0.7}
                  >
                    <Type size={14} color={c.ink} strokeWidth={2} />
                    <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink }}>Use initials</Text>
                  </TouchableOpacity>
                ) : null}
                {!logoUrl ? (
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: generating ? c.paperDeep : c.orange, borderWidth: 1, borderColor: generating ? c.lineSoft : c.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: generating ? 0.7 : 1 }}
                    onPress={async () => {
                      if (generating) return;
                      setGenerating(true);
                      try {
                        const biz = settings?.businessName ?? 'my business';
                        const trade = settings?.tradeType ?? 'trade';
                        const prompt = `Minimal professional logo mark for '${biz}', a ${trade} trade business. Simple bold icon, no text, clean vector style, white background, suitable for printing on business documents and invoices.`;
                        const res = await apiRequest('POST', '/api/generate-image', { prompt, size: '256x256' });
                        const data = res.ok ? await res.json().catch(() => null) : null;
                        if (data?.b64_json) {
                          save({ logoUrl: `data:image/png;base64,${data.b64_json}` });
                        } else {
                          showAlert('Logo generation unavailable', 'Try picking from your camera roll instead.');
                        }
                      } catch {
                        showAlert('Logo generation unavailable', 'Try picking from your camera roll instead.');
                      } finally {
                        setGenerating(false);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {generating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Sparkles size={14} color="#fff" strokeWidth={2} />
                    )}
                    <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: generating ? c.ink : '#fff' }}>
                      {generating ? 'Generating…' : 'Generate with AI'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {logoUrl ? (
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => save({ logoUrl: '' })}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: c.muted }}>Remove logo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <View style={[s.row, s.rowDivider, { paddingTop: 10, paddingBottom: 10 }]}>
              <Text style={[s.rowSub, { marginRight: 8 }]}>Or paste URL</Text>
              <TextInput
                style={s.urlInput}
                value={logoUrl.startsWith('data:') ? '' : logoUrl}
                onChangeText={(v) => save({ logoUrl: v })}
                placeholder="https://..."
                placeholderTextColor={c.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {logoUrl && !logoUrl.startsWith('data:') ? (
                <TouchableOpacity onPress={() => save({ logoUrl: '' })} activeOpacity={0.7} style={{ padding: 4 }}>
                  <X size={14} color={c.muted} strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Text style={s.hint}>Appears on all PDFs. Crop to a wide (4:2) aspect ratio for best results.</Text>
        </View>

        {/* Accent colour */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Branding colour</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <Text style={s.rowLabel}>Accent colour</Text>
            </View>
            <View style={s.swatchRow}>
              {ACCENT_COLORS.map(col => (
                <TouchableOpacity
                  key={col}
                  style={[s.swatch, { backgroundColor: col, borderColor: accent === col ? col : 'transparent' }]}
                  onPress={() => save({ quoteAccentColor: col })}
                  activeOpacity={0.7}
                >
                  {accent === col && (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Font */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Quote font</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <Text style={s.rowLabel}>Font family</Text>
            </View>
            <View style={s.chipsRow}>
              {FONTS.map(f => {
                const active = font === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => save({ quoteFontFamily: f.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Header style */}
        <View style={s.group}>
          <Text style={s.groupLabel}>Quote header style</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 10 }]}>
              <Text style={s.rowLabel}>Layout</Text>
            </View>
            <View style={s.chipsRow}>
              {HEADER_STYLES.map(hs => {
                const active = headerStyle === hs.value;
                return (
                  <TouchableOpacity
                    key={hs.value}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => save({ quoteHeaderStyle: hs.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{hs.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Text style={s.hint}>Changes apply to new quotes and invoices going forward.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
