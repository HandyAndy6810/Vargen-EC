import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, TextInput } from 'react-native';
import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, X, Sparkles, Type } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { apiRequest } from '@/lib/api';
import { showAlert } from '@/lib/dialogs';

function makeInitialsSvg(businessName: string, accentColor: string): string {
  const words = businessName.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (businessName.slice(0, 2)).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" rx="16" fill="${accentColor}"/><text x="100" y="68" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * The business logo, saved the moment it changes. It lives on its own rather
 * than in a screen's form so a form's Save button can never write back a stale
 * copy of it.
 */
export function LogoPicker() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [generating, setGenerating] = useState(false);

  const logoUrl = settings?.logoUrl ?? '';
  const accent = settings?.quoteAccentColor ?? '#f26a2a';

  const save = (logo: string) => {
    update.mutate({ logoUrl: logo } as any, {
      onError: () => showAlert('Error', 'Could not save the logo. Please try again.'),
    });
  };

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
      save(`data:image/${ext};base64,${result.assets[0].base64}`);
    }
  };

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const biz = settings?.businessName ?? 'my business';
      const trade = settings?.tradeType ?? 'trade';
      const prompt = `Minimal professional logo mark for '${biz}', a ${trade} trade business. Simple bold icon, no text, clean vector style, white background, suitable for printing on business documents and invoices.`;
      const res = await apiRequest('POST', '/api/generate-image', { prompt, size: '256x256' });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (data?.b64_json) save(`data:image/png;base64,${data.b64_json}`);
      else showAlert('Logo generation unavailable', 'Try picking from your camera roll instead.');
    } catch {
      showAlert('Logo generation unavailable', 'Try picking from your camera roll instead.');
    } finally {
      setGenerating(false);
    }
  };

  return (
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
          <TouchableOpacity style={s.btn} onPress={pickLogo} activeOpacity={0.7}>
            <Text style={s.btnText}>{logoUrl ? 'Replace logo' : 'Pick from camera roll'}</Text>
          </TouchableOpacity>
          {!logoUrl ? (
            <TouchableOpacity
              style={[s.btn, s.btnRow]}
              onPress={() => save(makeInitialsSvg(settings?.businessName ?? '', accent))}
              activeOpacity={0.7}
            >
              <Type size={14} color={c.ink} strokeWidth={2} />
              <Text style={s.btnText}>Use initials</Text>
            </TouchableOpacity>
          ) : null}
          {!logoUrl ? (
            <TouchableOpacity
              style={[s.btn, s.btnRow, generating ? { opacity: 0.7 } : { backgroundColor: c.orange, borderColor: c.orange }]}
              onPress={generate}
              activeOpacity={0.7}
            >
              {generating ? <ActivityIndicator size="small" color={c.ink} /> : <Sparkles size={14} color="#fff" strokeWidth={2} />}
              <Text style={[s.btnText, { color: generating ? c.ink : '#fff' }]}>
                {generating ? 'Generating…' : 'Generate with AI'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {logoUrl ? (
            <TouchableOpacity style={{ paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' }} onPress={() => save('')} activeOpacity={0.7}>
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
          onChangeText={save}
          placeholder="https://..."
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {logoUrl && !logoUrl.startsWith('data:') ? (
          <TouchableOpacity onPress={() => save('')} activeOpacity={0.7} style={{ padding: 4 }}>
            <X size={14} color={c.muted} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    rowSub: { fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted },
    logoPreview: { width: 72, height: 72, borderRadius: 12, resizeMode: 'contain' },
    logoPlaceholder: { width: 72, height: 72, borderRadius: 12, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    urlInput: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.ink, paddingVertical: 0 },
    btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center' },
    btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    btnText: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink },
  });
}
