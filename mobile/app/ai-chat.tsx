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
  Switch,
  Linking,
  Share,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useRef, useEffect, useMemo } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Send, Edit2, Bookmark, Search, ChevronDown, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useCustomers } from '@/hooks/use-customers';
import { MarginSlider } from '@/components/MarginSlider';
import { ActionSheetModal, type SheetAction } from '@/components/ActionSheetModal';
import { showAlert, showConfirm } from '@/lib/dialogs';
import type { Customer } from '@shared/mobile-types';


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
  const { colors: c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: c.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.33, shadowRadius: 12 }}>
      <Sparkles size={size * 0.55} color="#fff" strokeWidth={2} />
    </View>
  );
}

const TRADE_TYPES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Landscaping',
  'HVAC', 'Tiling', 'Roofing', 'Concreting', 'Bricklaying',
  'Plastering', 'Glazing', 'Flooring', 'Cabinet Making', 'General',
];

export default function AiChatScreen() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams<{ description?: string }>();
  const navigation = useNavigation();
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

  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState('');
  const [jobTitleOverride, setJobTitleOverride] = useState('');
  const [jobType, setJobType] = useState(tradeType);
  const [expiryDays, setExpiryDays] = useState(30);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  });
  // Machine-readable companion — the display string above is user-editable
  // free text, which breaks overdue detection the moment it's touched
  const [expiryDateISO, setExpiryDateISO] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );
  const pickExpiryDays = (days: number) => {
    setExpiryDays(days);
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setExpiryDate(d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }));
    setExpiryDateISO(d.toISOString());
  };
  const [internalNotes, setInternalNotes] = useState('');

  // Fetch user settings to prefill trade type + labour rate
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/settings');
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (userSettings) {
      if (userSettings.tradeType) {
        setTradeType(userSettings.tradeType);
        // jobType was seeded from the pre-settings default; follow the real trade
        setJobType(prev => prev === 'Plumbing' ? userSettings.tradeType : prev);
      }
      if (userSettings.labourRate) setLabourRate(String(userSettings.labourRate));
    }
  }, [userSettings]);

  const [editableItems, setEditableItems] = useState<{ description: string; qty: string; unit: string; rate: string }[]>([]);
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string>('draft');
  const [showSendSheet, setShowSendSheet] = useState(false);

  // Intercept swipe-down dismiss on modal — show "Leave without saving?" when there's unsaved work
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove' as any, (e: any) => {
      const hasWork = description.trim() || firstName.trim() || phone.trim();
      if (!hasWork || savedQuoteId) return;
      e.preventDefault();
      showConfirm({
        title: 'Leave without saving?',
        message: 'Your quote details will be lost.',
        confirmLabel: 'Leave',
        destructive: true,
        onConfirm: () => navigation.dispatch(e.data.action),
      });
    });
    return unsub;
  }, [navigation, description, firstName, phone, savedQuoteId]);

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
            priceEstimate: priceEstimate ? parseFloat(priceEstimate) : undefined,
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
      const msg = err.message === 'Failed to fetch' || err.message.includes('NetworkError')
        ? "Couldn't reach the AI service — check your connection and try again."
        : err.message || "Something went wrong. Please try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!aiResult) {
        // Pre-generation save: capture what the tradie has typed as a bare draft
        const res = await apiRequest('POST', '/api/quotes', {
          totalAmount: '0',
          status: 'draft',
          jobTitle: jobTitleOverride || description.trim().slice(0, 60) || undefined,
          customerName: customerName.trim() || undefined,
          customerId: customerType === 'existing' && selectedCustomer ? selectedCustomer.id : undefined,
          content: JSON.stringify({
            jobTitle: jobTitleOverride || description.trim().slice(0, 60),
            notes: description.trim(),
            jobType,
            expiryDate,
            expiryDateISO,
            internalNotes,
            customerName: customerName.trim() || undefined,
            customerPhone: customerType === 'new' ? phone.trim() || undefined : overridePhone || selectedCustomer?.phone || undefined,
            customerEmail: customerType === 'new' ? email.trim() || undefined : overrideEmail || selectedCustomer?.email || undefined,
            customerAddress: customerAddress || undefined,
            billingAddress: customerType === 'new' && !billingSameAsSite ? billingAddress.trim() || undefined : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || 'Failed to save draft');
        }
        return res.json();
      }
      const subtotal = editableItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
      const gst = subtotal * 0.1;
      const total = subtotal + gst;
      const res = await apiRequest('POST', '/api/quotes', {
        totalAmount: String(total),
        status,
        jobTitle: (jobTitleOverride || aiResult.jobTitle) || undefined,
        customerName: customerName.trim() || undefined,
        customerId: customerType === 'existing' && selectedCustomer ? selectedCustomer.id : undefined,
        content: JSON.stringify({
          ...aiResult,
          // Override with slider-adjusted figures so saved content matches what the user sees
          subtotal,
          gstAmount: gst,
          totalAmount: total,
          items: editableItems.map(it => ({
            description: it.description,
            quantity: parseFloat(it.qty) || 0,
            unit: it.unit,
            unitPrice: parseFloat(it.rate) || 0,
          })),
          jobTitle: jobTitleOverride || aiResult.jobTitle,
          jobType,
          expiryDate,
          expiryDateISO,
          internalNotes,
          customerName: customerName.trim() || undefined,
          customerPhone: customerType === 'new' ? phone.trim() || undefined : overridePhone || selectedCustomer?.phone || undefined,
          customerEmail: customerType === 'new' ? email.trim() || undefined : overrideEmail || selectedCustomer?.email || undefined,
          customerAddress: customerAddress || undefined,
          billingAddress: customerType === 'new' && !billingSameAsSite ? billingAddress.trim() || undefined : undefined,
          customerNotes: customerType === 'new' ? custNotes.trim() || undefined : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to save quote');
      }
      const quote = await res.json();
      // Set immediately so a retry after an item failure updates this quote
      // instead of creating a duplicate
      setSavedQuoteId(quote.id);
      const failedItems: string[] = [];
      for (const item of editableItems) {
        try {
          await apiRequest('POST', `/api/quotes/${quote.id}/items`, {
            description: item.description,
            quantity: parseFloat(item.qty) || 1,
            price: String(Math.round((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0) * 100) / 100),
          });
        } catch {
          failedItems.push(item.description || 'unnamed item');
        }
      }
      if (failedItems.length) {
        showAlert('Some items did not save', `Open the quote and re-add: ${failedItems.join(', ')}`);
      }
      return quote;
    },
    onSuccess: (quote, status) => {
      setSavedQuoteId(quote.id);
      setQuoteStatus(status as string);
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/quotes/${quote.id}` as any);
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

  // Send-to-customer channel picker (ActionSheet — Alert caps at 3 buttons on
  // Android and is a no-op on web). Quote is only flagged "sent" once a channel
  // with a valid destination is actually chosen.
  const liveSubtotal = useMemo(
    () => editableItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0),
    [editableItems]
  );
  const sendTotal = liveSubtotal * 1.1;
  const sendEmail = customerType === 'existing' ? (overrideEmail || selectedCustomer?.email || '') : email;
  const sendPhone = customerType === 'existing' ? (overridePhone || selectedCustomer?.phone || '') : phone;
  const sendName  = customerType === 'existing' ? (selectedCustomer?.name || '') : `${firstName} ${lastName}`.trim();

  const markAsSent = async (afterSend?: () => void) => {
    if (savedQuoteId) {
      // Quote already saved — just PATCH it to "sent", don't create a duplicate
      await apiRequest('PATCH', `/api/quotes/${savedQuoteId}`, { status: 'sent' });
      setQuoteStatus('sent');
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      afterSend?.();
    } else {
      saveMutation.mutate('sent', { onSuccess: afterSend ? () => afterSend() : undefined });
    }
  };

  const sendActions: SheetAction[] = [
    {
      label: 'Email customer',
      onPress: () => {
        if (!sendEmail) { showAlert('No email on file', 'Add an email address for this customer first.'); return; }
        markAsSent();
        Linking.openURL(`mailto:${sendEmail}?subject=Your quote&body=Hi ${sendName || 'there'},\n\nPlease find your quote attached.\n\nTotal: $${sendTotal.toFixed(2)}\n\nThanks`);
      },
    },
    {
      label: 'Send SMS',
      onPress: () => {
        if (!sendPhone) { showAlert('No phone on file', 'Add a phone number for this customer first.'); return; }
        markAsSent();
        Linking.openURL(`sms:${sendPhone}`);
      },
    },
    {
      label: 'Share link',
      onPress: () => markAsSent(() => Share.share({ message: `Quote — $${sendTotal.toFixed(2)} (inc. GST)` })),
    },
  ];

  const goBack = () => {
    if (step === 'draft' && !savedQuoteId) {
      showConfirm({
        title: 'Discard draft?',
        message: 'Your generated quote will be lost.',
        confirmLabel: 'Discard',
        destructive: true,
        onConfirm: () => { setStep('prompt'); setAiResult(null); setError(null); },
      });
    } else if (step === 'draft') {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={goBack} style={s.navBtn}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.1} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.topBarEyebrow}>{stepLabel}</Text>
            <Text style={s.topBarTitle}>{stepTitle}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Generating overlay */}
        {generateMutation.isPending && (
          <View style={s.generatingOverlay}>
            <AiAvatar size={72} />
            <Text style={s.generatingTitle}>Generating your quote…</Text>
            <Text style={s.generatingSubtitle}>
              Checking current trade pricing{'\n'}and building your line items
            </Text>
            <ActivityIndicator color={c.orange} style={{ marginTop: 24 }} />
          </View>
        )}

        {/* STEP: PROMPT */}
        {step === 'prompt' && !generateMutation.isPending && (
          <>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingBottom: 180 }}
            >
              {/* Mini hero */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <AiAvatar size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.heroHeadingSmall, { fontSize: 22, letterSpacing: -0.6 }]}>New AI quote</Text>
                  <Text style={s.heroSubSmall}>Fill in the details below — I'll build the rest.</Text>
                </View>
              </View>

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Describe the job — top of form */}
              <Text style={s.formLabel}>Describe the job</Text>
              <TextInput
                style={s.descInput}
                placeholder="e.g. Replace hot water system at Smith's place, Rheem 315L same location…"
                placeholderTextColor={c.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Customer */}
              <Text style={s.formLabel}>Customer</Text>
              <View style={s.formCard}>

                {/* Toggle — sits flush on top of the card fields */}
                <View style={s.customerToggleRow}>
                  {(['new', 'existing'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setCustomerType(t); setShowDropdown(false); }}
                      activeOpacity={0.7}
                      style={[s.custTypeBtn, customerType === t && s.custTypeBtnActive]}
                    >
                      <Text style={[s.custTypeBtnText, customerType === t && s.custTypeBtnTextActive]}>
                        {t === 'new' ? 'New customer' : 'Existing customer'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {customerType === 'new' ? (
                  <>
                    {/* First + last name */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="First name *"
                        placeholderTextColor={c.muted}
                        value={firstName}
                        onChangeText={setFirstName}
                        returnKeyType="next"
                      />
                      <View style={{ width: 1, backgroundColor: c.lineSoft, alignSelf: 'stretch' }} />
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="Last name"
                        placeholderTextColor={c.muted}
                        value={lastName}
                        onChangeText={setLastName}
                        returnKeyType="next"
                      />
                    </View>
                    {/* Business name */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="Business name (optional)"
                        placeholderTextColor={c.muted}
                        value={businessName}
                        onChangeText={setBusinessName}
                        returnKeyType="next"
                      />
                    </View>
                    {/* Phone */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                      <Text style={s.formRowLabel}>Phone <Text style={{ color: c.orange }}>*</Text></Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="04xx xxx xxx"
                        placeholderTextColor={c.muted}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                      />
                    </View>
                    {/* Email */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                      <Text style={s.formRowLabel}>Email</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="email@example.com"
                        placeholderTextColor={c.muted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                      />
                    </View>
                    {/* Site address */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start', paddingTop: 12 }]}>
                      <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Site address</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="Job site address"
                        placeholderTextColor={c.muted}
                        value={siteAddress}
                        onChangeText={setSiteAddress}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>
                    {/* Billing same as site toggle */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                      <Text style={s.formRowLabel}>Billing same as site</Text>
                      <Switch
                        value={billingSameAsSite}
                        onValueChange={setBillingSameAsSite}
                        trackColor={{ false: c.lineMid, true: c.orange }}
                        thumbColor="#fff"
                      />
                    </View>
                    {!billingSameAsSite && (
                      <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start', paddingTop: 12 }]}>
                        <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Billing address</Text>
                        <TextInput
                          style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                          placeholder="Billing address"
                          placeholderTextColor={c.muted}
                          value={billingAddress}
                          onChangeText={setBillingAddress}
                          multiline
                          numberOfLines={2}
                          textAlignVertical="top"
                        />
                      </View>
                    )}
                    {/* Notes */}
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start', paddingTop: 12 }]}>
                      <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Notes</Text>
                      <TextInput
                        style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                        placeholder="Access notes, special instructions…"
                        placeholderTextColor={c.muted}
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
                    <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, gap: 8 }]}>
                      <Search size={16} color={c.muted} strokeWidth={2} />
                      <TextInput
                        style={[s.formInput, { flex: 1 }]}
                        placeholder="Search by name, phone or email…"
                        placeholderTextColor={c.muted}
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
                      <View style={{ borderTopWidth: 1, borderTopColor: c.lineSoft }}>
                        {filteredCustomers.slice(0, 5).map((cust, i) => (
                          <TouchableOpacity
                            key={cust.id}
                            activeOpacity={0.7}
                            style={[s.dropdownRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}
                            onPress={() => {
                              setSelectedCustomer(cust);
                              setCustSearch(cust.name);
                              setOverridePhone(cust.phone ?? '');
                              setOverrideEmail(cust.email ?? '');
                              setOverrideAddress(cust.address ?? '');
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={s.dropdownName}>{cust.name}</Text>
                            {(cust.phone || cust.email) && (
                              <Text style={s.dropdownSub}>{[cust.phone, cust.email].filter(Boolean).join(' · ')}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {/* Selected customer — editable fields */}
                    {selectedCustomer && !showDropdown && (
                      <>
                        <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                          <Text style={s.formRowLabel}>Phone</Text>
                          <TextInput
                            style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                            value={overridePhone}
                            onChangeText={setOverridePhone}
                            placeholder="—"
                            placeholderTextColor={c.muted}
                            keyboardType="phone-pad"
                          />
                        </View>
                        <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                          <Text style={s.formRowLabel}>Email</Text>
                          <TextInput
                            style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                            value={overrideEmail}
                            onChangeText={setOverrideEmail}
                            placeholder="—"
                            placeholderTextColor={c.muted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>
                        <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start', paddingTop: 12 }]}>
                          <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Address</Text>
                          <TextInput
                            style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                            value={overrideAddress}
                            onChangeText={setOverrideAddress}
                            placeholder="—"
                            placeholderTextColor={c.muted}
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

              {/* Pricing settings */}
              <Text style={s.formLabel}>Pricing settings</Text>
              <View style={s.formCard}>
                {/* Trade type dropdown */}
                <TouchableOpacity
                  style={s.formRow}
                  activeOpacity={0.7}
                  onPress={() => { Keyboard.dismiss(); setShowTradeDropdown(true); }}
                >
                  <Text style={s.formRowLabel}>Trade type</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Manrope_700Bold', color: c.ink }}>{tradeType}</Text>
                    <ChevronDown size={14} color={c.muted} strokeWidth={2.2} />
                  </View>
                </TouchableOpacity>
                {/* Labour rate + hours in one row */}
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, gap: 0 }]}>
                  <Text style={s.formRowLabel}>Labour</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={s.labourBubble}>
                      <Text style={s.labourBubbleLabel}>$/hr</Text>
                      <TextInput
                        style={s.labourBubbleInput}
                        value={labourRate}
                        onChangeText={setLabourRate}
                        keyboardType="numeric"
                        selectTextOnFocus
                        returnKeyType="next"
                      />
                    </View>
                    <View style={s.labourBubble}>
                      <Text style={s.labourBubbleLabel}>hrs</Text>
                      <TextInput
                        style={s.labourBubbleInput}
                        value={labourHours}
                        onChangeText={setLabourHours}
                        keyboardType="numeric"
                        placeholder="est."
                        placeholderTextColor={c.muted}
                        selectTextOnFocus
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                </View>
                {/* Callout fee */}
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                  <Text style={s.formRowLabel}>Callout fee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {calloutFeeEnabled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 13, color: c.mutedHi, fontFamily: 'Manrope_700Bold' }}>$</Text>
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
                      trackColor={{ false: c.lineMid, true: c.orange }}
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
                    placeholder="AI can fill this in"
                    placeholderTextColor={c.muted}
                    value={jobTitleOverride}
                    onChangeText={setJobTitleOverride}
                    returnKeyType="next"
                  />
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 12 }]}>
                  <Text style={[s.formRowLabel, { marginBottom: 10 }]}>Expiry</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[7, 14, 30, 60, 90].map((days) => (
                      <TouchableOpacity
                        key={days}
                        activeOpacity={0.75}
                        onPress={() => { pickExpiryDays(days); Haptics.selectionAsync(); }}
                        style={[s.expiryChip, expiryDays === days && s.expiryChipActive]}
                      >
                        <Text style={[s.expiryChipText, expiryDays === days && s.expiryChipTextActive]}>{days} days</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_600SemiBold', marginTop: 8 }}>
                    Expires {expiryDate}
                  </Text>
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formRowLabel}>Price estimate</Text>
                    <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_500Medium', marginTop: 2 }}>Optional — helps AI target the right figure</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: c.mutedHi, fontFamily: 'Manrope_700Bold' }}>$</Text>
                    <TextInput
                      style={[s.formRowInput, { width: 90, textAlign: 'right' }]}
                      value={priceEstimate}
                      onChangeText={setPriceEstimate}
                      keyboardType="numeric"
                      placeholder="e.g. 1500"
                      placeholderTextColor={c.muted}
                      selectTextOnFocus
                      returnKeyType="done"
                    />
                  </View>
                </View>
                <View style={[s.formRow, { borderTopWidth: 1, borderTopColor: c.lineSoft, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <Text style={[s.formRowLabel, { paddingTop: 2 }]}>Internal notes</Text>
                  <TextInput
                    style={[s.formInput, { flex: 1, textAlign: 'right' }]}
                    placeholder="Not shown to customer…"
                    placeholderTextColor={c.muted}
                    value={internalNotes}
                    onChangeText={setInternalNotes}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Bottom action bar — pinned to safe area */}
            <View style={s.promptFooter}>
              <TouchableOpacity
                style={[s.saveDraftBtn, saveMutation.isPending && { opacity: 0.6 }]}
                onPress={() => saveMutation.mutate('draft')}
                disabled={saveMutation.isPending || !description.trim()}
                activeOpacity={0.82}
              >
                {saveMutation.isPending
                  ? <ActivityIndicator color={c.orange} size="small" />
                  : <Text style={s.saveDraftBtnText}>Save draft</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.generateBtn, { flex: 1 }, !description.trim() && { opacity: 0.5 }]}
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
            <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 220 }}>
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
                      placeholderTextColor={c.muted}
                      multiline
                    />
                    {customerName.trim() ? (
                      <Text style={s.quoteMeta}>For {customerName.trim()}</Text>
                    ) : null}
                  </View>
                  <View style={[s.statusPill, savedQuoteId != null ? { backgroundColor: STATUS_COLORS[quoteStatus]?.bg ?? c.paperDeep } : null]}>
                    <Text style={[s.statusPillText, savedQuoteId != null ? { color: STATUS_COLORS[quoteStatus]?.text ?? c.mutedHi } : null]}>
                      {savedQuoteId ? quoteStatus.toUpperCase() : 'DRAFT'}
                    </Text>
                  </View>
                </View>

                {/* Job type + expiry row */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <View style={{ flex: 1, backgroundColor: c.paperDeep, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Type</Text>
                    <TextInput
                      style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink }}
                      value={jobType}
                      onChangeText={setJobType}
                      placeholder="Job type"
                      placeholderTextColor={c.muted}
                    />
                  </View>
                  <View style={{ flex: 1, backgroundColor: c.paperDeep, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Expires</Text>
                    <TextInput
                      style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: c.ink }}
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="dd mmm yyyy"
                      placeholderTextColor={c.muted}
                    />
                  </View>
                </View>

                {/* Summary */}
                {aiResult.summary ? (
                  <View style={s.summaryBox}>
                    <Text style={s.summaryText}>{aiResult.summary}</Text>
                  </View>
                ) : null}

                {/* Live margin slider */}
                {(() => {
                  const markupPercent = userSettings?.markupPercent ?? 30;
                  const cost = liveSubtotal > 0 ? liveSubtotal / (1 + markupPercent / 100) : 0;
                  return (
                    <MarginSlider
                      cost={cost}
                      price={liveSubtotal}
                      onPriceChange={(newSubtotal) => {
                        if (liveSubtotal <= 0) return;
                        const scale = newSubtotal / liveSubtotal;
                        setEditableItems(prev => prev.map(it => {
                          const rate = parseFloat(it.rate) || 0;
                          return { ...it, rate: (rate * scale).toFixed(2) };
                        }));
                      }}
                    />
                  );
                })()}

                {/* Editable line items */}
                <View style={{ marginBottom: 12 }}>
                  {editableItems.map((item, i) => {
                    const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                    return (
                      <View key={i} style={[s.editLineRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.lineSoft }]}>
                        <TextInput
                          style={s.editLineDesc}
                          value={item.description}
                          onChangeText={(v) => setEditableItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: v } : it))}
                          placeholder="Item description"
                          placeholderTextColor={c.muted}
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
                            placeholderTextColor={c.muted}
                          />
                          <Text style={{ fontSize: 11, color: c.muted, fontFamily: 'Manrope_600SemiBold' }}>@</Text>
                          <Text style={{ fontSize: 11, color: c.mutedHi, fontFamily: 'Manrope_700Bold' }}>$</Text>
                          <TextInput
                            style={[s.editLineMeta, { width: 72, flexShrink: 0 }]}
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
                            <Text style={{ fontSize: 16, color: c.muted, paddingLeft: 4 }}>×</Text>
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
                  const subtotal = liveSubtotal;
                  const gst = subtotal * 0.1;
                  const total = subtotal + gst;
                  return (
                    <View style={{ borderTopWidth: 1, borderTopColor: c.lineSoft, paddingTop: 12 }}>
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
                <Sparkles size={16} color={c.orangeDeep} strokeWidth={2} />
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
                  placeholderTextColor={c.muted}
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
                    <Edit2 size={16} color={c.ink} strokeWidth={2} />
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
                onPress={() => setShowSendSheet(true)}
                disabled={saveMutation.isPending}
              >
                <Send size={17} color="#fff" strokeWidth={2} />
                <Text style={s.sendBtnText}>Send to customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.templateBtn}
                onPress={() => showAlert('Save as template', 'Quote templates are coming soon.')}
              >
                <Bookmark size={15} color={c.mutedHi} strokeWidth={2} />
                <Text style={s.templateBtnText}>Save as template</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <ActionSheetModal
        visible={showSendSheet}
        title={`Send quote — $${sendTotal.toFixed(2)} inc. GST`}
        actions={sendActions}
        onClose={() => setShowSendSheet(false)}
      />

      {/* Trade type dropdown modal */}
      <Modal visible={showTradeDropdown} transparent animationType="slide" onRequestClose={() => setShowTradeDropdown(false)}>
        <TouchableWithoutFeedback onPress={() => setShowTradeDropdown(false)}>
          <View style={s.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: c.ink }}>Trade type</Text>
            <TouchableOpacity onPress={() => setShowTradeDropdown(false)}>
              <X size={20} color={c.mutedHi} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32 }}>
            {TRADE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                activeOpacity={0.7}
                style={[s.modalOption, tradeType === t && s.modalOptionActive]}
                onPress={() => {
                  setTradeType(t);
                  setJobType(t);
                  setShowTradeDropdown(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[s.modalOptionText, tradeType === t && s.modalOptionTextActive]}>{t}</Text>
                {tradeType === t && <View style={s.modalOptionTick} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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

const makeStyles = (c: Colors) => StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.lineSoft,
  },
  topBarEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.paper,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  generatingTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.5,
    marginTop: 16,
    textAlign: 'center',
  },
  generatingSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroHeadingSmall: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.4,
  },
  heroSubSmall: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  formLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.lineSoft,
    overflow: 'hidden',
    marginBottom: 18,
  },
  customerToggleRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.lineSoft,
  },
  custTypeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: c.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  custTypeBtnActive: {
    backgroundColor: c.orange,
    borderColor: c.orangeDeep,
  },
  custTypeBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.mutedHi,
  },
  custTypeBtnTextActive: {
    color: '#fff',
  },
  formInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: c.ink,
  },
  descInput: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.lineMid,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: c.ink,
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
    color: c.ink,
    flex: 1,
  },
  formRowInput: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
    textAlign: 'right',
  },
  generateBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: c.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: c.orange,
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
    backgroundColor: c.redSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: c.red,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 2,
    color: c.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  promptFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
    backgroundColor: c.paper,
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
  },
  saveDraftBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  saveDraftBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
    backgroundColor: c.paper,
    shadowColor: '#141310',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
    gap: 8,
  },
  quotePaper: {
    backgroundColor: c.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.lineSoft,
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
    backgroundColor: `${c.orange}1f`,
  },
  quoteMeta: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.lineMid,
    backgroundColor: c.paperDeep,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.mutedHi,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryBox: {
    backgroundColor: c.paperDeep,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 12.5,
    fontFamily: 'Manrope_500Medium',
    color: c.mutedHi,
    lineHeight: 19,
  },
  lineTotal: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
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
    color: c.mutedHi,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: c.mutedHi,
  },
  grandLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: 0.2,
  },
  grandTotal: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orange,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: c.orangeSoft,
    borderWidth: 1,
    borderColor: 'rgba(242,106,42,0.25)',
    marginBottom: 14,
  },
  aiBadgeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: c.orangeDeep,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: c.paperDeep,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  notesLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: c.mutedHi,
    lineHeight: 19,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  breakdownCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.lineSoft,
  },
  breakdownCardLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  breakdownCardValue: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.4,
  },
  breakdownCardSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  tweakBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineMid,
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
    color: c.ink,
  },
  saveBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: c.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: c.orange,
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
    backgroundColor: c.paperDeep,
  },
  dropdownName: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
  },
  dropdownSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: c.muted,
    marginTop: 2,
  },
  templateBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  templateBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.mutedHi,
  },
  quoteTitleInput: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.5,
    marginTop: 2,
    padding: 0,
  },
  editLineRow: {
    paddingVertical: 10,
  },
  editLineDesc: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
    padding: 0,
  },
  editLineMeta: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
    borderBottomWidth: 1,
    borderBottomColor: c.lineMid,
    minWidth: 36,
    paddingVertical: 0,
    textAlign: 'center',
  },
  addItemBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: c.lineSoft,
    marginTop: 4,
  },
  addItemBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orangeDeep,
  },
  internalNotesBox: {
    backgroundColor: c.paperDeep,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.lineMid,
  },
  internalNotesInput: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: c.ink,
    marginTop: 8,
    padding: 0,
    minHeight: 60,
  },
  statusManageBox: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.lineSoft,
    marginBottom: 14,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.2,
  },
  sendBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  sendBtnText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.lineMid,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 2,
  },
  modalOptionActive: {
    backgroundColor: c.orangeSoft,
  },
  modalOptionText: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: c.ink,
  },
  modalOptionTextActive: {
    fontFamily: 'Manrope_800ExtraBold',
    color: c.orangeDeep,
  },
  modalOptionTick: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.orange,
  },
  labourBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.paperDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.lineMid,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  labourBubbleLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: c.muted,
  },
  labourBubbleInput: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: c.ink,
    minWidth: 44,
    textAlign: 'center',
  },
  expiryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.paperDeep,
    borderWidth: 1,
    borderColor: c.lineMid,
  },
  expiryChipActive: {
    backgroundColor: c.orange,
    borderColor: c.orangeDeep,
  },
  expiryChipText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: c.mutedHi,
  },
  expiryChipTextActive: {
    color: '#fff',
  },
});
