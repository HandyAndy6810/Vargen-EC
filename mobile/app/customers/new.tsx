import { View, Text, ScrollView, Animated, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Press } from '@/components/Press';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { router } from 'expo-router';
import { useState, useMemo, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenGradient, GradientHeader, useGradientScroll } from '@/components/Rim';
import { CustomerForm, emptyCustomerForm, formToCustomer, customerFormProblem, type CustomerFormValue } from '@/components/CustomerForm';
import { useCreateCustomer } from '@/hooks/use-customers';


export default function CustomerNewScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useGradientScroll();
  const scrollRef = useRef<ScrollView>(null);
  // The fields near the bottom scroll up clear of the keyboard (as in AI quoting).
  const { mutate: createCustomer, isPending } = useCreateCustomer();

  const [form, setForm] = useState<CustomerFormValue>(emptyCustomerForm);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const problem = customerFormProblem(form);
    if (problem) { setError(problem); return; }
    setError(null);
    createCustomer(formToCustomer(form) as any, {
      onSuccess: (newCustomer: any) => router.replace(`/customers/${newCustomer.id}` as any),
      onError: (err: any) => setError(err?.message || 'Could not save customer. Check your connection and try again.'),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader eyebrow="New customer" title={form.name.trim() || 'Add a customer'} />

        <Animated.ScrollView
          {...scrollProps}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <CustomerForm
            value={form}
            onChange={(v) => { setForm(v); if (error) setError(null); }}
            scrollRef={scrollRef}
            nameError={error && !form.name.trim() ? error : null}
          />
          {error && form.name.trim() ? <Text style={[s.error, { paddingHorizontal: 24, paddingTop: 12 }]}>{error}</Text> : null}
        </Animated.ScrollView>

        {/* Save bar */}
        <View style={[s.saveBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Press
            style={[s.saveBtn, isPending && { opacity: 0.85 }]}
            pressedStyle={{ opacity: 0.85 }}
            onPress={handleSave}
            disabled={isPending}
            accessibilityRole="button"
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText} numberOfLines={1}>Add customer</Text>}
          </Press>
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
