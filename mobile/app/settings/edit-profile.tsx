import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';

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
    readOnly: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: c.mutedHi },
  });
}

export default function EditProfileScreen() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { user } = useAuth() as any;
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState({ businessName: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (settings) {
      setForm({
        businessName: settings.businessName || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await update.mutateAsync(form);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
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
          <Text style={s.eyebrow}>Profile</Text>
          <Text style={s.title}>Edit Profile</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.group}>
          <Text style={s.groupLabel}>Your name</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.label}>First name</Text>
              <Text style={s.readOnly}>{user?.firstName || '—'}</Text>
            </View>
            <View style={[s.row, s.rowDivider]}>
              <Text style={s.label}>Last name</Text>
              <Text style={s.readOnly}>{user?.lastName || '—'}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 6, paddingHorizontal: 2 }}>
            To change your name, contact support.
          </Text>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Business contact</Text>
          <View style={s.card}>
            {[
              { key: 'businessName', label: 'Business name', placeholder: 'Your trading name' },
              { key: 'phone', label: 'Phone', placeholder: '0400 000 000', keyboardType: 'phone-pad' },
              { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address' },
              { key: 'address', label: 'Address', placeholder: '123 Street, Suburb NSW 2000' },
            ].map((field, i) => (
              <View key={field.key} style={[s.row, i > 0 && s.rowDivider]}>
                <Text style={s.label}>{field.label}</Text>
                <TextInput
                  style={s.input}
                  value={(form as any)[field.key]}
                  onChangeText={(v) => setForm(f => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={c.muted}
                  keyboardType={(field as any).keyboardType || 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
