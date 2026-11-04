import {
  View,
  Text,
  ScrollView,
  Animated,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useState, useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { Sparkles, Send, Mail, BookOpen } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useSettings } from '@/hooks/use-settings';
import { useSendMessage } from '@/hooks/use-messages';
import { apiRequest } from '@/lib/api';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { queryClient } from '@/lib/queryClient';


const TEMPLATES = [
  {
    id: 'quote_followup',
    label: 'Quote follow-up',
    emoji: '📋',
    body: "Hi [Name], just following up on that quote I sent over. Happy to answer any questions! Cheers, [Business]",
  },
  {
    id: 'invoice_reminder',
    label: 'Invoice reminder',
    emoji: '💰',
    body: "Hi [Name], just a reminder that your invoice is due. Let me know if you have any questions. Thanks, [Business]",
  },
  {
    // Separate from the plain reminder: this one is for money that is genuinely
    // late. Direct about the amount and the date, without being aggressive — the
    // point is to get paid and keep the customer.
    id: 'invoice_overdue',
    label: 'Overdue invoice',
    emoji: '⏰',
    body: "Hi [Name], just following up — invoice [Number] for [Amount] was due on [Due] and is still showing as unpaid. If it's already on its way, ignore this. Otherwise, could you let me know when I can expect it? Thanks, [Business]",
  },
  {
    id: 'job_complete',
    label: 'Job complete',
    emoji: '✅',
    body: "Hi [Name], great working with you today! All done. Give me a call if anything comes up. [Business]",
  },
  {
    id: 'appointment_reminder',
    label: 'Appointment reminder',
    emoji: '📅',
    body: "Hi [Name], just a reminder I'll be at your place tomorrow. See you then! [Business]",
  },
  {
    id: 'general',
    label: 'General check-in',
    emoji: '👋',
    body: "Hi [Name], just checking in — hope everything is going well! [Business]",
  },
];

export default function ComposeScreen() {
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const { scrollY, scrollProps } = useGradientScroll();
  const {
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    context,
    quoteId,
    dayIndex,
    invoiceNumber,
    amount,
    due,
  } = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    context?: string;
    quoteId?: string;
    dayIndex?: string;
    invoiceNumber?: string;
    amount?: string;
    due?: string;
  }>();

  const { data: settings } = useSettings();
  const sendMessage = useSendMessage(Number(customerId) || 0);

  const name     = customerName || 'Customer';
  const phone    = customerPhone || '';
  const email    = customerEmail || '';

  const [body, setBody]                     = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(context || null);
  const [aiLoading, setAiLoading]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);

  // Fill the placeholders. The invoice ones come through as params from the
  // outreach list; anything not supplied is dropped rather than left showing a
  // bracketed token in a message about to go to a customer.
  const personalise = (tmplBody: string, bizName: string) =>
    tmplBody
      .replace(/\[Name\]/g, name.split(' ')[0])
      .replace(/\[Business\]/g, bizName)
      .replace(/\s*\[Number\]/g, invoiceNumber ? ` ${invoiceNumber}` : '')
      .replace(/\s*for \[Amount\]/g, amount ? ` for ${amount}` : '')
      .replace(/\s*on \[Due\]/g, due ? ` on ${due}` : '');

  // Load context template once settings are available
  useEffect(() => {
    if (!context || !settings || body) return;
    const tmpl = TEMPLATES.find(t => t.id === context);
    if (tmpl) {
      setBody(personalise(tmpl.body, settings.businessName || 'Your tradie'));
    }
  }, [settings]);

  const loadTemplate = (tmpl: typeof TEMPLATES[0]) => {
    const bizName = settings?.businessName || 'Your tradie';
    setBody(personalise(tmpl.body, bizName));
    setSelectedTemplate(tmpl.id);
  };

  const draftWithAI = async () => {
    setAiLoading(true);
    try {
      const res = await apiRequest('POST', '/api/messages/draft', {
        customerName: name,
        context: selectedTemplate,
      });
      if (res.ok) {
        const { message } = await res.json();
        setBody(message);
      } else {
        showAlert('AI unavailable', 'Could not generate a draft. Try a template instead.');
      }
    } catch {
      showAlert('AI unavailable', 'Check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const markFollowUpSent = async () => {
    if (!quoteId) return;
    try {
      await apiRequest('POST', `/api/follow-ups/${quoteId}/mark-sent`, { dayIndex: Number(dayIndex) });
      queryClient.invalidateQueries({ queryKey: ['/api/follow-ups/due'] });
    } catch { /* non-blocking */ }
  };

  // Opening Messages or Mail doesn't mean it went — so ask, once, and on "yes"
  // record it in the customer's contact log and tick off the follow-up if this
  // was one. Before, only follow-ups asked, and nothing sent from here ever
  // reached the contact log, so the log stayed empty unless you retyped it.
  const confirmSent = (channel: 'sms' | 'email') => {
    const canLog = Number(customerId) > 0;
    if (!canLog && !quoteId) return;
    showConfirm({
      title: 'Did you send it?',
      message: quoteId
        ? `Mark this follow-up as done${canLog ? ` and add it to ${name.split(' ')[0]}'s contact log` : ''}.`
        : `Add it to ${name.split(' ')[0]}'s contact log.`,
      confirmLabel: 'Yes, sent',
      onConfirm: async () => {
        if (canLog) {
          try { await sendMessage.mutateAsync({ body: body.trim(), channel, direction: 'out', quoteId: quoteId ? Number(quoteId) : undefined }); }
          catch { /* the message went; failing to log it shouldn't block the follow-up */ }
        }
        await markFollowUpSent();
      },
    });
  };

  const sendSMS = () => {
    if (!phone) {
      showAlert('No phone number', 'This customer has no phone number on file.');
      return;
    }
    if (!body.trim()) {
      showAlert('Nothing to send', 'Write a message first.');
      return;
    }
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${phone}${sep}body=${encodeURIComponent(body)}`).then(() => {
      confirmSent('sms');
    }).catch(() =>
      showAlert('Cannot open Messages', 'Make sure a SIM is installed.')
    );
  };

  const sendEmail = () => {
    if (!email) {
      showAlert('No email address', 'This customer has no email address on file.');
      return;
    }
    if (!body.trim()) {
      showAlert('Nothing to send', 'Write a message first.');
      return;
    }
    const bizName = settings?.businessName || 'Your tradie';
    const subject = encodeURIComponent(`Message from ${bizName}`);
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`).then(() => {
      confirmSent('email');
    }).catch(() =>
      showAlert('Cannot open Mail', 'No mail app found.')
    );
  };

  const logNote = async () => {
    if (!body.trim()) {
      showAlert('Nothing to log', 'Write a message first.');
      return;
    }
    if (!customerId) {
      showAlert('No customer', 'Cannot log a note without a customer.');
      return;
    }
    setIsSaving(true);
    try {
      await sendMessage.mutateAsync({ body: body.trim(), channel: 'note', direction: 'out' });
      await markFollowUpSent();
      router.back();
    } catch {
      showAlert('Could not save', 'Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const charCount = body.length;
  const smsPages = charCount > 0 ? Math.ceil(charCount / 160) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader eyebrow="Message" title={name} />

        <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Template cards — horizontal scroll */}
          <Text style={[s.sectionEyebrow, { paddingHorizontal: 22, color: heroSecondary(isDark) }]}>Templates</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}
          >
            {TEMPLATES.map((tmpl) => {
              const active = selectedTemplate === tmpl.id;
              return (
                <TouchableOpacity
                  key={tmpl.id}
                  onPress={() => loadTemplate(tmpl)}
                  activeOpacity={0.7}
                  style={[s.templateCard, active && s.templateCardActive]}
                >
                  <Text style={s.templateEmoji}>{tmpl.emoji}</Text>
                  <Text style={[s.templateLabel, active && { color: c.orangeDeep }]}>{tmpl.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* AI Draft button */}
          <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
            <TouchableOpacity
              style={s.aiBtn}
              activeOpacity={0.8}
              onPress={draftWithAI}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Sparkles size={16} color="#fff" strokeWidth={2} />
              )}
              <Text style={s.aiBtnText}>{aiLoading ? 'Drafting…' : 'Draft with AI'}</Text>
            </TouchableOpacity>
          </View>

          {/* Composer */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={s.sectionEyebrow}>Your message</Text>
              {charCount > 0 && (
                <Text style={{ fontSize: 11, fontFamily: 'HostGrotesk_600SemiBold', color: charCount > 160 ? c.red : c.muted }}>
                  {charCount} chars{smsPages > 1 ? ` · ${smsPages} SMS` : ''}
                </Text>
              )}
            </View>
            <View style={s.composerWrap}>
              <TextInput
                style={s.composerInput}
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholder="Tap a template above, draft with AI, or write your own…"
                placeholderTextColor={c.muted}
              />
            </View>
          </View>

          {/* Send actions */}
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {phone ? (
                <TouchableOpacity style={[s.sendBtn, { flex: 1, backgroundColor: c.orange }]} activeOpacity={0.8} onPress={sendSMS}>
                  <Send size={16} color="#fff" strokeWidth={2} />
                  <Text style={s.sendBtnText}>Send SMS</Text>
                </TouchableOpacity>
              ) : null}
              {email ? (
                <TouchableOpacity style={[s.sendBtn, { flex: 1, backgroundColor: c.fillStrong }]} activeOpacity={0.8} onPress={sendEmail}>
                  <Mail size={16} color={c.paper} strokeWidth={2} />
                  <Text style={[s.sendBtnText, { color: c.paper }]}>Send email</Text>
                </TouchableOpacity>
              ) : null}
              {!phone && !email && (
                <View style={[s.sendBtn, s.tile, { flex: 1 }]}>
                  <Text style={{ fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: c.muted }}>No contact info on file</Text>
                </View>
              )}
            </View>

            {/* Log note (always visible if customerId present) */}
            {customerId ? (
              <TouchableOpacity style={s.logBtn} activeOpacity={0.7} onPress={logNote} disabled={isSaving}>
                {isSaving
                  ? <ActivityIndicator size="small" color={c.mutedHi} />
                  : <>
                      <BookOpen size={15} color={c.mutedHi} strokeWidth={2} />
                      <Text style={s.logBtnText}>Log as note (no send)</Text>
                    </>
                }
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  tile: { ...rimTile(c, isDark) },
  sectionEyebrow: {
    fontSize: 13,
    fontFamily: 'HostGrotesk_600SemiBold',
    color: c.mutedHi,
    marginBottom: 8,
    marginLeft: 2,
  },
  templateCard: {
    ...rimTile(c, isDark),
    width: 112,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  templateCardActive: {
    borderColor: c.orange,
    borderTopColor: c.orange,
    backgroundColor: c.orangeSoft,
  },
  templateEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  templateLabel: {
    fontSize: 11,
    fontFamily: 'HostGrotesk_700Bold',
    color: c.mutedHi,
    textAlign: 'center',
    lineHeight: 15,
  },
  aiBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: c.fillStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiBtnText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: c.paper,
  },
  composerWrap: {
    ...rimTile(c, isDark),
    overflow: 'hidden',
  },
  composerInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: 'HostGrotesk_500Medium',
    color: c.ink,
    minHeight: 160,
    lineHeight: 22,
  },
  sendBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendBtnText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk_800ExtraBold',
    color: '#fff',
  },
  logBtn: {
    ...rimTile(c, isDark),
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logBtnText: {
    fontSize: 13,
    fontFamily: 'HostGrotesk_700Bold',
    color: c.mutedHi,
  },
});
