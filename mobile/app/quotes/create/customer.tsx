import { useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { makeQuoteStyles } from '@/lib/quote-step-styles';
import { QuoteStepScaffold } from '@/components/QuoteStepScaffold';
import { useQuoteDraft } from '@/hooks/use-quote-draft';

export default function CustomerStep() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeQuoteStyles(c), [c]);
  const d = useQuoteDraft();

  const canNext = !!d.customer.trim() || !!d.selectedCustomer;

  return (
    <QuoteStepScaffold
      stepIndex={0}
      title="Who's it for?"
      footerLabel="Next"
      onNext={() => router.push('/quotes/create/job')}
      nextDisabled={!canNext}
    >
      <Text style={[s.sectionEyebrow, { marginTop: 8 }]}>Customer</Text>
      <View style={[s.fieldGroup, { padding: 16 }]}>
        {d.selectedCustomer ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.paperDeep, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: c.orange }}>{d.selectedCustomer.name?.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink, flex: 1 }} numberOfLines={1}>{d.selectedCustomer.name}</Text>
            </View>
            <TouchableOpacity onPress={() => { d.setCustomerId(null); d.setCustomer(''); d.setCustSearch(''); }} activeOpacity={0.7}>
              <X size={18} color={c.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={[s.fieldInput, { fontSize: 16 }]}
              placeholder="Search or type a name…"
              placeholderTextColor={c.muted}
              value={d.custSearch || d.customer}
              onChangeText={v => { d.setCustSearch(v); d.setCustomer(v); d.setCustomerId(null); d.setShowCustList(true); }}
              onFocus={() => d.setShowCustList(true)}
              autoFocus
            />
            {d.showCustList && d.filteredCustomers.length > 0 && (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
                {d.filteredCustomers.map((cust: any) => (
                  <TouchableOpacity
                    key={cust.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }}
                    activeOpacity={0.7}
                    onPress={() => { d.setCustomerId(cust.id); d.setCustomer(cust.name); d.setCustSearch(''); d.setShowCustList(false); }}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: c.orange }}>{cust.name?.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink }}>{cust.name}</Text>
                      {cust.phone && <Text style={{ fontSize: 11, fontFamily: 'Manrope_500Medium', color: c.muted }}>{cust.phone}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </View>
      <Text style={{ fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, lineHeight: 17 }}>
        Pick an existing customer to link their contact details, or type a new name — you can add their details later.
      </Text>
    </QuoteStepScaffold>
  );
}
