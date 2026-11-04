import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import type React from 'react';
import { useState, useMemo, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenGradient, GradientHeader, RimGroup, fieldStyles, useGradientScroll, useKeepAboveKeyboard } from '@/components/Rim';
import { useCreateCustomer } from '@/hooks/use-customers';


export default function CustomerNewScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const f = useMemo(() => fieldStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useGradientScroll();
  const scrollRef = useRef<ScrollView>(null);
  // The fields near the bottom scroll up clear of the keyboard (as in AI quoting).
  const lowInput = useKeepAboveKeyboard(scrollRef);
  const { mutate: createCustomer, isPending } = useCreateCustomer();

  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes]     = useState('');
  const [error, setError]     = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) { setError('Customer name is required'); return; }
    setError(null);
    createCustomer(
      {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (newCustomer: any) => router.replace(`/customers/${newCustomer.id}` as any),
        onError: (err: any) => setError(err?.message || 'Could not save customer. Check your connection and try again.'),
      }
    );
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    props: Partial<React.ComponentProps<typeof TextInput>> = {},
    first = false,
  ) => (
    <View style={[f.row, !first && f.divider]}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader eyebrow="New customer" title={name.trim() || 'Add a customer'} />

        <Animated.ScrollView
          {...scrollProps}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <RimGroup title="Contact">
            <View style={[f.row, error ? { backgroundColor: c.redSoft } : null]}>
              <Text style={[f.label, error ? { color: c.red } : null]}>Full name (required)</Text>
              <TextInput
                style={f.input}
                placeholder="e.g. Sarah Johnson"
                placeholderTextColor={c.muted}
                value={name}
                onChangeText={v => { setName(v); if (error) setError(null); }}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Full name"
              />
              {error ? <Text style={s.error}>{error}</Text> : null}
            </View>
            {field('Phone', phone, setPhone, { placeholder: '0412 345 678', keyboardType: 'phone-pad' })}
            {field('Email', email, setEmail, { placeholder: 'email@example.com', keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false })}
          </RimGroup>

          <RimGroup title="Site address">
            {field('Address', address, setAddress, { placeholder: 'Street, suburb', ...lowInput }, true)}
          </RimGroup>

          <RimGroup title="Notes" hint="Only you see these.">
            {field('Notes', notes, setNotes, {
              placeholder: 'Gate codes, preferences, parking…',
              multiline: true,
              style: [f.input, { minHeight: 72, textAlignVertical: 'top' }],
              ...lowInput,
            }, true)}
          </RimGroup>
        </Animated.ScrollView>

        {/* Save bar */}
        <View style={[s.saveBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Pressable
            style={({ pressed }) => [s.saveBtn, (pressed || isPending) && { opacity: 0.85 }]}
            onPress={handleSave}
            disabled={isPending}
            accessibilityRole="button"
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText} numberOfLines={1}>Add customer</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  error: { fontFamily: 'HostGrotesk_600SemiBold', fontSize: 12.5, color: c.red, marginTop: 6 },
  saveBar: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: c.paper,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: c.lineSoft,
  },
  saveBtn: {
    backgroundColor: c.orange, borderRadius: 18, height: 54,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, fontFamily: 'HostGrotesk_800ExtraBold', color: '#fff' },
});
