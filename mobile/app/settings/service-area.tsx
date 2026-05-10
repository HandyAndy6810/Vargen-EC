import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';

type ServiceArea = { suburb: string; state: string; radius: number };

const RADII = [5, 10, 15, 25, 50];
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center' },
    titleWrap: { flex: 1 },
    eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: c.ink, letterSpacing: -0.4 },
    saveBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.lineSoft, overflow: 'hidden' },
    row: { paddingHorizontal: 14, paddingVertical: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    label: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    input: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: c.ink, padding: 0 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    chipLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
    stateChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    hint: { fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 },
  });
}

export default function ServiceAreaScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [area, setArea] = useState<ServiceArea>({ suburb: '', state: 'NSW', radius: 15 });

  useEffect(() => {
    if (settings?.serviceArea) {
      try { setArea(JSON.parse(settings.serviceArea)); } catch { /* use default */ }
    }
  }, [settings]);

  const saveArea = (next: ServiceArea) => {
    setArea(next);
    update.mutate({ serviceArea: JSON.stringify(next) }, {
      onError: () => Alert.alert('Error', 'Could not save. Please try again.'),
    });
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({ serviceArea: JSON.stringify(area) });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
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
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.eyebrow}>Business</Text>
          <Text style={s.title}>Service Area</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Location</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.label}>Suburb / City</Text>
              <TextInput
                style={s.input}
                value={area.suburb}
                onChangeText={(v) => setArea(a => ({ ...a, suburb: v }))}
                placeholder="e.g. Inner West Sydney"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={[s.row, s.rowDivider, { paddingBottom: 8 }]}>
              <Text style={s.label}>State</Text>
            </View>
            <View style={s.stateChipsRow}>
              {STATES.map(st => {
                const active = area.state === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => saveArea({ ...area, state: st })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{st}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Travel radius</Text>
          <View style={s.card}>
            <View style={[s.row, { paddingBottom: 8 }]}>
              <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink }}>How far will you travel?</Text>
            </View>
            <View style={s.chipsRow}>
              {RADII.map(r => {
                const active = area.radius === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.chip, { backgroundColor: active ? c.orange : c.paperDeep, borderColor: active ? c.orange : c.lineSoft }]}
                    onPress={() => saveArea({ ...area, radius: r })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipLabel, { color: active ? '#fff' : c.ink }]}>{r} km</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Text style={s.hint}>Your service area is shown on your customer portal and used for job scheduling.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
