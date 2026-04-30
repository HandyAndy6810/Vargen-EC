import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useState, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Send, Edit2, Bookmark, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useCustomers } from '@/hooks/use-customers';
import type { Customer } from '@shared/mobile-types';

const ORANGE      = '#f26a2a';
const ORANGE_DEEP = '#d94d0e';
const ORANGE_SOFT = '#ffe6d3';
const INK         = '#141310';
const PAPER       = '#f7f4ee';
const PAPER_DEEP  = '#efe9dd';
const CARD        = '#ffffff';
const BLACK       = '#0f0e0b';
const MUTED       = 'rgba(20,19,16,0.55)';
const MUTED_HI    = 'rgba(20,19,16,0.72)';
const LINE_SOFT   = 'rgba(20,19,16,0.08)';
const LINE_MID    = 'rgba(20,19,16,0.14)';
const GREEN       = '#2a9d4c';
const RED_SOFT    = '#fde5e5';
const RED         = '#d23b3b';

type Step = 'prompt' | 'draft';

interface AiItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface AiQuoteResult {
  jobTitle: string;
  summary: string;
  items: AiItem[];
  notes: string;
  estimatedHours: number;
  totalLabour: number;
  totalMaterials: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

function AiAvatar({ size = 32 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.33, shadowRadius: 12 }}>
      <Sparkles size={size * 0.55} color="#fff" strokeWidth={2} />
    </View>
  );
}

const QUICK_SUGGESTIONS = [
  'Replace hot water system — Rheem 315L, same location',
  'Fix leaking tap — kitchen mixer, supply new cartridge',
  'Clear blocked drain — high pressure water jetting',
  'Install new toilet suite — supply and fit Caroma',
  'Replace bathroom basin tap — supply Caroma Liano, fit',
  'Fix burst pipe — cut section, rejoin, pressure test',
  'Install outdoor tap — tee off mains, 15m max',
  'Service gas hot water unit — annual service + report',
];

export default function AiChatScreen() {
  const params = useLocalSearchParams<{ description?: string }>();
  const [step, setStep] = useState<Step>('prompt');
  const [description, setDescription] = useState(params.description ?? '');
  const [customerType, setCustomerType] = useState<'new' | 'existing'>('new');

  // New customer fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [billingSameAsSite, setBillingSameAsSite] = useState(true);
  const [billingAddress, setBillingAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Existing customer search
  const [custSearch, setCustSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overrideAddress, setOverrideAddress] = useState('');

  const [tradeType, setTradeType] = useState('Plumbing');
  const [labourRate, setLabourRate] = useState('90');
  const [labourHours, setLabourHours] = useState('');
  const [calloutFeeEnabled, setCalloutFeeEnabled] = useState(false);
  const [calloutFeeAmount, setCalloutFeeAmount] = useState('120');
  const [aiResult, setAiResult] = useState<AiQuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [jobTitleOverride, setJobTitleOverride] = useState('');
  const [jobType, setJobType] = useState(tradeType);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  });
  const [internalNotes, setInternalNotes] = useState('');
  const [editableItems, setEditableItems] = useState<{ description: string; qty: string; unit: string; rate: string }[]>([]);
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string>('draft');

  const { data: allCustomers = [] } = useCustomers();
  const customers = allCustomers as Customer[];
  const filteredCustomers = custSearch.trim().length > 0
    ? customers.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.phone ?? '').includes(custSearch) ||
        (c.email ?? '').toLowerCase().includes(custSearch.toLowerCase())
      )
    : [];

  const customerName = customerType === 'new'
    ? [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    : selectedCustomer?.name ?? custSearch.trim();

  const customerAddress = customerType === 'new'
    ? siteAddress.trim()
    : overrideAddress || selectedCustomer?.address || '';

  const generateMutation = useMutation({
    mutationFn: async ({ description, customerName }: { description: string; customerName: string }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      try {
        const res = await fetch(`${API_BASE_URL}/api/quotes/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            description,
            customerName: customerName.trim() || undefined,
            tradeType: tradeType.trim() || undefined,
            labourRate: labourRate ? parseFloat(labourRate) : undefined,
            callOutFee: calloutFeeEnabled && calloutFeeAmount ? parseFloat(calloutFeeAmount) : 0,
            includeGST: true,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || 'AI generation failed');
        }
        return res.json() as Promise<AiQuoteResult>;
      } finally {
        clearTimeout(timer);
      }
    },
    onSuccess: (data) => {
      setAiResult(data);
      setStep('draft');
      setError(null);
      setEditableItems(data.items.map(item => ({
        description: item.description,
        qty: String(item.quantity),
        unit: item.unit || 'ea',
        rate: String(item.unitPrice),
      })));
      if (!jobTitleOverride) setJobTitleOverride(data.jobTitle);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      setError(err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!aiResult) throw new Error('No quote to save');
      const subtotal = editableItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
      const gst = subtotal * 0.1;
      const total = subtotal + gst;
      const res = await apiRequest('POST', '/api/quotes', {
        totalAmount: String(total),
        status,
        content: JSON.stringify({
          ...aiResult,
          jobTitle: jobTitleOverride || aiResult.jobTitle,
          jobType,
          expiryDate,
          internalNotes,
          customerName: customerName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to save quote');
      }
      const quote = await res.json();
      for (const item of editableItems) {
        await apiRequest('POST', `/api/quotes/${quote.id}/items`, {
          description: item.description,
          quantity: parseFloat(item.qty) || 1,
          price: String(Math.round((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0) * 100) / 100),
        });
      }
      return quote;
    },
    onSuccess: (quote, status) => {
      setSavedQuoteId(quote.id);
      setQuoteStatus(status as string);
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Don't navigate — show status management UI
    },
    onError: (err: Error) => {
      setError(err.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSend = (prefill?: string) => {
    const baseDesc = prefill ?? description;
    if (!baseDesc.trim()) return;
    if (prefill) setDescription(prefill);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const addressContext = customerAddress ? `\nSite address: ${customerAddress}` : '';
    const businessContext = customerType === 'new' && businessName.trim() ? ` (${businessName.trim()})` : '';
    const labourContext = labourHours.trim() ? `\nEstimated labour: ${labourHours} hours` : '';
    const desc = `${baseDesc.trim()}${addressContext}${labourContext}`;
    generateMutation.mutate({ description: desc, customerName: customerName + businessContext });
  };

  const goBack = () => {
    if (step === 'draft') {
      setStep('prompt');
      setAiResult(null);
      setError(null);
    } else {
      router.back();
    }
  };

  const stepLabel = step === 'prompt' ? 'AI · Describe the job' : 'AI · Review draft';
  const stepTitle = step === 'prompt' ? 'New AI quote' : 'Draft quote';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={goBack} style={s.navBtn}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.1} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.topBarEyebrow}>{stepLabel}</Text>
            <Text style={s.topBarTitle}>{stepTitle}</Text>
          </View>
          <View style={s.navBtn} />
        </View>

        {/* Generating overlay */}
        {generateMutation.isPending && (
          <View style={s.generatingOverlay}>
            <AiAvatar size={72} />
            <Text style={s.generatingTitle}>Generating your quote…</Text>
            <Text style={s.generatingSubtitle}>
              Checking current trade pricing{'\n'}and building your line items
            </Text>
            <ActivityIndicator color={ORANGE} style={{ marginTop: 24 }} />
          </View>
        )}

        {/* STEP: PROMPT */}
        {step === 'prompt' && !generateMutation.isPending && (
          <>
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
              {/* Mini hero */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <AiAvatar size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.heroHeadingSmall}>New AI quote</Text>
                  <Text style={s.heroSubSmall}>Fill in the details — I'll build the quote.</Text>
                </View>
              </View>

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Customer */}
              <Text style={s.formLabel}>Customer</Text>
              <View style={s.formCard}>

                {/* Toggle */}
                <View style={s.customerToggleRow}>
                  {(['new', 'existing'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setCustomerType(t); setShowDropdown(false); }}
                      activeOpacity={0.7}
                      style={[s.custTypeBtn, customerType === t && s.custTypeBtnActive]}
                    >
                      <Text style={[s.custTypeBtnText, customerType === t && s.custTypeBtnTextActive]}>
                        {t === 'new' ? 'New customer' : 'Existing'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {customerType === 'new' ? (
                  <>
                    {/* First + last name */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="First name"
                        placeholderTextColor={MUTED}
                        value={firstName}
                        onChangeText={setFirstName}
                        returnKeyType="next"
                      />
                      <View style={{ width: 1, backgroundColor: LINE_SOFT, alignSelf: 'stretch' }} />
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="Last name"
                        placeholderTextColor={MUTED}
                        value={lastName}
                        onChangeText={setLastName}
                        returnKeyType="next"
                      />
                    </View>
                    {/* Business name */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="Business name (optional)"
                        placeholderTextColor={MUTED}
                        value={businessName}
                        onChangeText={setBusinessName}
                        returnKeyType="next"
                      />
                    </View>
                    {/* Phone */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                      <Text style={s.formRowLabel}>Phone</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="04xx xxx xxx"
                        placeholderTextColor={MUTED}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                      />
                    </View>
                    {/* Email */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                      <Text style={s.formRowLabel}>Email</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="email@example.com"
                        placeholderTextColor={MUTED}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                      />
                    </View>
                    {/* Site address */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT, alignItems: 'flex-start', paddingTop: 12 }]}>
                      <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Site address</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="Job site address"
                        placeholderTextColor={MUTED}
                        value={siteAddress}
                        onChangeText={setSiteAddress}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>
                    {/* Billing same as site toggle */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                      <Text style={s.formRowLabel}>Billing same as site</Text>
                      <Switch
                        value={billingSameAsSite}
                        onValueChange={setBillingSameAsSite}
                        trackColor={{ false: LINE_MID, true: ORANGE }}
                        thumbColor="#fff"
                      />
                    </View>
                    {!billingSameAsSite && (
                      <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT, alignItems: 'flex-start', paddingTop: 12 }]}>
                        <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Billing address</Text>
                        <TextInput
                          style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                          placeholder="Billing address"
                          placeholderTextColor={MUTED}
                          value={billingAddress}
                          onChangeText={setBillingAddress}
                          multiline
                          numberOfLines={2}
                          textAlignVertical="top"
                        />
                      </View>
                    )}
                    {/* Notes */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT, alignItems: 'flex-start', paddingTop: 12 }]}>
                      <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Notes</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="Access notes, special instructions…"
                        placeholderTextColor={MUTED}
                        value={custNotes}
                        onChangeText={setCustNotes}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    {/* Search */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT, gap: 8 }]}>
                      <Search size={16} color={MUTED} strokeWidth={2} />
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="Search by name, phone or email…"
                        placeholderTextColor={MUTED}
                        value={custSearch}
                        onChangeText={(v) => {
                          setCustSearch(v);
                          setSelectedCustomer(null);
                          setShowDropdown(true);
                        }}
                        autoCapitalize="none"
                        returnKeyType="search"
                      />
                    </View>
                    {/* Dropdown results */}
                    {showDropdown && filteredCustomers.length > 0 && (
                      <View style={{ borderTopWidth: 1, borderTopColor: LINE_SOFT }}>
                        {filteredCustomers.slice(0, 5).map((c, i) => (
                          <TouchableOpacity
                            key={c.id}
                            activeOpacity={0.7}
                            style={[s.dropdownRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}
                            onPress={() => {
                              setSelectedCustomer(c);
                              setCustSearch(c.name);
                              setOverridePhone(c.phone ?? '');
                              setOverrideEmail(c.email ?? '');
                              setOverrideAddress(c.address ?? '');
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={s.dropdownName}>{c.name}</Text>
                            {(c.phone || c.email) && (
                              <Text style={s.dropdownSub}>{[c.phone, c.email].filter(Boolean).join(' · ')}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {/* Selected customer — editable fields */}
                    {selectedCustomer && !showDropdown && (
                      <>
                        <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                          <Text style={s.formRowLabel}>Phone</Text>
                          <TextInput
                            style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                            value={overridePhone}
                            onChangeText={setOverridePhone}
                            placeholder="—"
                            placeholderTextColor={MUTED}
                            keyboardType="phone-pad"
                          />
                        </View>
                        <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                          <Text style={s.formRowLabel}>Email</Text>
                          <TextInput
                            style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                            value={overrideEmail}
                            onChangeText={setOverrideEmail}
                            placeholder="—"
                            placeholderTextColor={MUTED}
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>
                        <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT, alignItems: 'flex-start', paddingTop: 12 }]}>
                          <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Address</Text>
                          <TextInput
                            style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                            value={overrideAddress}
                            onChangeText={setOverrideAddress}
                            placeholder="—"
                            placeholderTextColor={MUTED}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                          />
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>

              {/* Job description */}
              <Text style={s.formLabel}>Describe the job</Text>
              <TextInput
                style={s.descInput}
                placeholder="e.g. Replace hot water system at Smith's place, Rheem 315L same location…"
                placeholderTextColor={MUTED}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Pricing settings */}
              <Text style={s.formLabel}>Pricing settings</Text>
              <View style={s.formCard}>
                {/* Trade type */}
                <View style={s.formRow}>
                  <Text style={s.formRowLabel}>Trade type</Text>
                  <TextInput
                    style={s.formRowInput}
                    value={tradeType}
                    onChangeText={setTradeType}
                    placeholder="e.g. Plumbing"
                    placeholderTextColor={MUTED}
                    returnKeyType="next"
                  />
                </View>
                {/* Labour rate + hours side by side */}
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                  <Text style={s.formRowLabel}>Labour rate</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: MUTED_HI, fontFamily: 'Manrope_700Bold' }}>$</Text>
                    <TextInput
                      style={[s.formRowInput, { width: 60 }]}
                      value={labourRate}
                      onChangeText={setLabourRate}
                      keyboardType="numeric"
                      selectTextOnFocus
                      returnKeyType="next"
                    />
                    <Text style={{ fontSize: 12, color: MUTED, fontFamily: 'Manrope_600SemiBold' }}>/hr</Text>
                  </View>
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                  <Text style={s.formRowLabel}>Labour hours</Text>
                  <TextInput
                    style={[s.formRowInput, { width: 60 }]}
                    value={labourHours}
                    onChangeText={setLabourHours}
                    keyboardType="numeric"
                    placeholder="est."
                    placeholderTextColor={MUTED}
                    selectTextOnFocus
                    returnKeyType="next"
                  />
                </View>
                {/* Callout fee */}
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                  <Text style={s.formRowLabel}>Callout fee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {calloutFeeEnabled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 13, color: MUTED_HI, fontFamily: 'Manrope_700Bold' }}>$</Text>
                        <TextInput
                          style={[s.formRowInput, { width: 60 }]}
                          value={calloutFeeAmount}
                          onChangeText={setCalloutFeeAmount}
                          keyboardType="numeric"
                          selectTextOnFocus
                        />
                      </View>
                    )}
                    <Switch
                      value={calloutFeeEnabled}
                      onValueChange={setCalloutFeeEnabled}
                      trackColor={{ false: LINE_MID, true: ORANGE }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>

              {/* Build the quote */}
              <Text style={s.formLabel}>Build the quote</Text>
              <View style={s.formCard}>
                <View style={s.formRow}>
                  <Text style={s.formRowLabel}>Job title</Text>
                  <TextInput
                    style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                    placeholder="AI will fill this in"
                    placeholderTextColor={MUTED}
                    value={jobTitleOverride}
                    onChangeText={setJobTitleOverride}
                    returnKeyType="next"
                  />
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                  <Text style={s.formRowLabel}>Job type</Text>
                  <TextInput
                    style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                    placeholder="e.g. Plumbing"
                    placeholderTextColor={MUTED}
                    value={jobType}
                    onChangeText={setJobType}
                    returnKeyType="next"
                  />
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                  <Text style={s.formRowLabel}>Expiry</Text>
                  <TextInput
                    style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="30 days"
                    placeholderTextColor={MUTED}
                    returnKeyType="next"
                  />
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: LINE_SOFT, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Internal notes</Text>
                  <TextInput
                    style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                    placeholder="Not shown to customer…"
                    placeholderTextColor={MUTED}
                    value={internalNotes}
                    onChangeText={setInternalNotes}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Quick suggestions */}
              <Text style={s.formLabel}>Quick suggestions</Text>
              <View style={{ gap: 8 }}>
                {QUICK_SUGGESTIONS.map((sug, i) => (
                  <TouchableOpacity key={i} onPress={() => setDescription(sug)} activeOpacity={0.7}
                    style={s.suggestionRow}>
                    <Sparkles size={15} color={ORANGE} strokeWidth={2} />
                    <Text style={s.suggestionText}>{sug}</Text>
                    <Text style={{ fontSize: 14, color: MUTED }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Generate button */}
            <View style={s.composerWrap}>
              <TouchableOpacity
                style={[s.generateBtn, !description.trim() && { opacity: 0.5 }]}
                onPress={() => handleSend()}
                disabled={!description.trim()}
                activeOpacity={0.85}
              >
                <Sparkles size={18} color="#fff" strokeWidth={2} />
                <Text style={s.generateBtnText}>Generate quote</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP: DRAFT */}
        {step === 'draft' && aiResult && !generateMutation.isPending && (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 220 }}>
              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Quote header */}
              <View style={s.quotePaper}>
                <View style={s.quotePaperGlow} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <Text style={s.eyebrow}>Quote · {savedQuoteId ? quoteStatus.charAt(0).toUpperCase() + quoteStatus.slice(1) : 'Draft'}</Text>
                    <TextInput
                      style={s.quoteTitleInput}
                      value={jobTitleOverride}
                      onChangeText={setJobTitleOverride}
                      placeholder="Job title…"
                      placeholderTextColor={MUTED}
                    />
                    {customerName.trim() ? (
                      <Text style={s.quoteMeta}>For {customerName.trim()}</Text>
                    ) : null}
                  </View>
                  <View style={[s.statusPill, savedQuoteId && { backgroundColor: STATUS_COLORS[quoteStatus]?.bg ?? PAPER_DEEP }]}>
                    <Text style={[s.statusPillText, savedQuoteId && { color: STATUS_COLORS[quoteStatus]?.text ?? MUTED_HI }]}>
                      {savedQuoteId ? quoteStatus.toUpperCase() : 'DRAFT'}
                    </Text>
                  </View>
                </View>

                {/* Job type + expiry row */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <View style={{ flex: 1, backgroundColor: PAPER_DEEP, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Type</Text>
                    <TextInput
                      style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: INK }}
                      value={jobType}
                      onChangeText={setJobType}
                      placeholder="Job type"
                      placeholderTextColor={MUTED}
                    />
                  </View>
                  <View style={{ flex: 1, backgroundColor: PAPER_DEEP, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Expires</Text>
                    <TextInput
                      style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: INK }}
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="dd mmm yyyy"
                      placeholderTextColor={MUTED}
                    />
                  </View>
                </View>

                {/* Summary */}
                {aiResult.summary ? (
                  <View style={s.summaryBox}>
                    <Text style={s.summaryText}>{aiResult.summary}</Text>
                  </View>
                ) : null}

                {/* Editable line items */}
                <View style={{ marginBottom: 12 }}>
                  {editableItems.map((item, i) => {
                    const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                    return (
                      <View key={i} style={[s.editLineRow, i > 0 && { borderTopWidth: 1, borderTopColor: LINE_SOFT }]}>
                        <TextInput
                          style={s.editLineDesc}
                          value={item.description}
                          onChangeText={(v) => setEditableItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: v } : it))}
                          placeholder="Item description"
                          placeholderTextColor={MUTED}
                          multiline
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <TextInput
                            style={s.editLineMeta}
                            value={item.qty}
                            onChangeText={(v) => setEditableItems(prev => prev.map((it, idx) => idx === i ? { ...it, qty: v } : it))}
                            keyboardType="numeric"
                            selectTextOnFocus
                          />
                          <TextInput
                            style={[s.editLineMeta, { minWidth: 44 }]}
                            value={item.unit}
                            onChangeText={(v) => setEditableItems(prev => prev.map((it, idx) => idx === i ? { ...it, unit: v } : it))}
                            placeholder="ea"
                            placeholderTextColor={MUTED}
                          />
                          <Text style={{ fontSize: 11, color: MUTED, fontFamily: 'Manrope_600SemiBold' }}>@</Text>
                          <Text style={{ fontSize: 11, color: MUTED_HI, fontFamily: 'Manrope_700Bold' }}>$</Text>
                          <TextInput
                            style={s.editLineMeta}
                            value={item.rate}
                            onChangeText={(v) => setEditableItems(prev => prev.map((it, idx) => idx === i ? { ...it, rate: v } : it))}
                            keyboardType="numeric"
                            selectTextOnFocus
                          />
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={s.lineTotal}>${lineTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setEditableItems(prev => prev.filter((_, idx) => idx !== i))}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={{ fontSize: 16, color: MUTED, paddingLeft: 4 }}>×</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  <TouchableOpacity
                    style={s.addItemBtn}
                    activeOpacity={0.7}
                    onPress={() => setEditableItems(prev => [...prev, { description: '', qty: '1', unit: 'ea', rate: '' }])}
                  >
                    <Text style={s.addItemBtnText}>+ Add line item</Text>
                  </TouchableOpacity>
                </View>

                {/* Computed totals */}
                {(() => {
                  const subtotal = editableItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
                  const gst = subtotal * 0.1;
                  const total = subtotal + gst;
                  return (
                    <View style={{ borderTopWidth: 1, borderTopColor: LINE_SOFT, paddingTop: 12 }}>
                      <View style={s.totalRow}>
                        <Text style={s.totalLabel}>Subtotal</Text>
                        <Text style={s.totalValue}>${subtotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={s.totalRow}>
                        <Text style={s.totalLabel}>GST (10%)</Text>
                        <Text style={s.totalValue}>${gst.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={[s.totalRow, { marginTop: 6 }]}>
                        <Text style={s.grandLabel}>TOTAL</Text>
                        <Text style={s.grandTotal}>${total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* AI badge */}
              <View style={s.aiBadge}>
                <Sparkles size={16} color={ORANGE_DEEP} strokeWidth={2} />
                <Text style={s.aiBadgeText}>
                  Priced to current Australian trade rates.{' '}
                  <Text style={{ fontFamily: 'Manrope_800ExtraBold' }}>Review before sending.</Text>
                </Text>
              </View>

              {/* Customer-facing notes */}
              {aiResult.notes ? (
                <View style={s.notesBox}>
                  <Text style={s.notesLabel}>Inclusions & notes</Text>
                  <Text style={s.notesText}>{aiResult.notes}</Text>
                </View>
              ) : null}

              {/* Internal notes */}
              <View style={s.internalNotesBox}>
                <Text style={s.notesLabel}>Internal notes (not shown to customer)</Text>
                <TextInput
                  style={s.internalNotesInput}
                  placeholder="Add internal notes…"
                  placeholderTextColor={MUTED}
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Labour / materials breakdown */}
              <View style={s.breakdownRow}>
                <View style={[s.breakdownCard, { flex: 1 }]}>
                  <Text style={s.breakdownCardLabel}>Labour</Text>
                  <Text style={s.breakdownCardValue}>
                    ${aiResult.totalLabour.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                  {aiResult.estimatedHours > 0 && (
                    <Text style={s.breakdownCardSub}>{aiResult.estimatedHours}h est.</Text>
                  )}
                </View>
                <View style={[s.breakdownCard, { flex: 1 }]}>
                  <Text style={s.breakdownCardLabel}>Materials</Text>
                  <Text style={s.breakdownCardValue}>
                    ${aiResult.totalMaterials.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>

              {/* Quote status management — shown after save */}
              {savedQuoteId && (
                <View style={s.statusManageBox}>
                  <Text style={s.notesLabel}>Quote status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {(Object.entries(STATUS_COLORS) as [string, { bg: string; text: string; label: string }][]).map(([status, cfg]) => (
                      <TouchableOpacity
                        key={status}
                        activeOpacity={0.75}
                        onPress={async () => {
                          try {
                            await apiRequest('PATCH', `/api/quotes/${savedQuoteId}`, { status });
                            setQuoteStatus(status);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                        }}
                        style={[s.statusChip, { backgroundColor: cfg.bg, borderColor: quoteStatus === status ? cfg.text : 'transparent', borderWidth: 2 }]}
                      >
                        <Text style={[s.statusChipText, { color: cfg.text }]}>{cfg.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom actions */}
            <View style={[s.composerWrap, { gap: 8 }]}>
              {!savedQuoteId ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={s.tweakBtn}
                    onPress={() => { setStep('prompt'); setAiResult(null); setError(null); }}
                  >
                    <Edit2 size={16} color={INK} strokeWidth={2} />
                    <Text style={s.tweakBtnText}>Redo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
                    onPress={() => saveMutation.mutate('draft')}
                    disabled={saveMutation.isPending}
                    activeOpacity={0.88}
                  >
                    {saveMutation.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Text style={s.saveBtnText}>Save draft</Text><Text style={{ fontSize: 16, color: '#fff' }}>›</Text></>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={() => router.replace('/(tabs)/quotes' as any)}
                  activeOpacity={0.88}
                >
                  <Text style={s.saveBtnText}>View all quotes</Text>
                  <Text style={{ fontSize: 16, color: '#fff' }}>›</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.sendBtn}
                activeOpacity={0.85}
                onPress={() => {
                  const subtotal = editableItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
                  const total = subtotal * 1.1;
                  Alert.alert('Send quote', `Total: $${total.toFixed(2)}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: '📧 Email customer', onPress: () => saveMutation.mutate('sent') },
                    { text: '📱 Send SMS', onPress: () => saveMutation.mutate('sent') },
                    { text: '🔗 Copy link', onPress: () => saveMutation.mutate('sent') },
                    { text: '📄 Create PDF', onPress: () => saveMutation.mutate('sent') },
                  ]);
                }}
                disabled={saveMutation.isPending}
              >
                <Send size={17} color="#fff" strokeWidth={2} />
                <Text style={s.sendBtnText}>Send to customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.templateBtn}
                onPress={() => Alert.alert('Save as template', 'Quote templates are coming soon.', [{ text: 'Got it' }])}
              >
                <Bookmark size={15} color={MUTED_HI} strokeWidth={2} />
                <Text style={s.templateBtnText}>Save as template</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft:    { bg: '#f0f0ee', text: '#6b6b60', label: 'Draft' },
  sent:     { bg: '#e8f0fe', text: '#1a56db', label: 'Sent' },
  viewed:   { bg: '#fef3c7', text: '#92400e', label: 'Viewed' },
  accepted: { bg: '#d1fae5', text: '#065f46', label: 'Accepted' },
  declined: { bg: '#fde5e5', text: '#b91c1c', label: 'Declined' },
  expired:  { bg: '#f3f4f6', text: '#9ca3af', label: 'Expired' },
};

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE_SOFT,
  },
  topBarEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PAPER,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  generatingTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 16,
    textAlign: 'center',
  },
  generatingSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroHeading: {
    fontSize: 30,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -1,
    lineHeight: 34,
    marginTop: 18,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
    marginTop: 10,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  heroHeadingSmall: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
  },
  heroSubSmall: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  formLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    overflow: 'hidden',
    marginBottom: 18,
  },
  customerToggleRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
    paddingBottom: 0,
  },
  custTypeBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custTypeBtnActive: {
    backgroundColor: ORANGE,
  },
  custTypeBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
  },
  custTypeBtnTextActive: {
    color: '#fff',
  },
  formInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  descInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE_MID,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
    minHeight: 96,
    marginBottom: 18,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  formRowLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    flex: 1,
  },
  formRowInput: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    textAlign: 'right',
  },
  generateBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  generateBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  errorBox: {
    backgroundColor: RED_SOFT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: RED,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  customerInput: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    color: INK,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 2,
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  suggestionRow: {
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: INK,
  },
  composerWrap: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    borderRadius: 26,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: INK,
    paddingVertical: 10,
    maxHeight: 100,
  },
  composerSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotePaper: {
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: LINE_SOFT,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    marginBottom: 14,
  },
  quotePaperGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${ORANGE}1f`,
  },
  quoteTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  quoteMeta: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE_MID,
    backgroundColor: PAPER_DEEP,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED_HI,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryBox: {
    backgroundColor: PAPER_DEEP,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 12.5,
    fontFamily: 'Manrope_500Medium',
    color: MUTED_HI,
    lineHeight: 19,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 8,
  },
  lineDesc: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: INK,
    lineHeight: 18,
  },
  lineMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    minWidth: 70,
    textAlign: 'right',
    flexShrink: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: MUTED_HI,
  },
  grandLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: 0.2,
  },
  grandTotal: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: ORANGE,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: 'rgba(242,106,42,0.25)',
    marginBottom: 14,
  },
  aiBadgeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: ORANGE_DEEP,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: PAPER_DEEP,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  notesLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED_HI,
    lineHeight: 19,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  breakdownCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE_SOFT,
  },
  breakdownCardLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  breakdownCardValue: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.4,
  },
  breakdownCardSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  tweakBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  tweakBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  saveBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: PAPER_DEEP,
  },
  dropdownName: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  dropdownSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 2,
  },
  templateBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE_MID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  templateBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: MUTED_HI,
  },
});
