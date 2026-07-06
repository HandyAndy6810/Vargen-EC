import {
  View,
  Text,
  ScrollView,
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
import { ChevronLeft, Sparkles, Send, Mail, BookOpen } from 'lucide-react-native';
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
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const {
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    context,
    quoteId,
    dayIndex,
  } = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    context?: string;
    quoteId?: string;
    dayIndex?: string;
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

  // Personalise [Name] / [Business] placeholders
  const personalise = (tmplBody: string, bizName: string) =>
    tmplBody
      .replace(/\[Name\]/g, name.split(' ')[0])
      .replace(/\[Business\]/g, bizName);

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

  const confirmFollowUpSent = () => {
    if (!quoteId) return;
    showConfirm({
      title: 'Did you send it?',
      message: 'Mark this follow-up as done so it stops nagging you.',
      confirmLabel: 'Yes, sent',
      onConfirm: () => { markFollowUpSent(); },
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
      // The composer opening doesn't mean the message went out — confirm before
      // ticking off the follow-up, otherwise cancelled sends get marked done.
      confirmFollowUpSent();
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
      confirmFollowUpSent();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ChevronLeft size={18} color={c.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Message</Text>
            <Text style={s.title} numberOfLines={1}>{name}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Template cards — horizontal scroll */}
          <Text style={[s.sectionEyebrow, { paddingHorizontal: 20 }]}>Templates</Text>
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
                <Text style={{ fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: charCount > 160 ? '#d23b3b' : c.muted }}>
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
                <TouchableOpacity style={[s.sendBtn, { flex: 1, backgroundColor: c.green }]} activeOpacity={0.8} onPress={sendSMS}>
                  <Send size={16} color="#fff" strokeWidth={2} />
                  <Text style={s.sendBtnText}>Send SMS</Text>
                </TouchableOpacity>
              ) : null}
              {email ? (
                <TouchableOpacity style={[s.sendBtn, { flex: 1, backgroundColor: c.blue }]} activeOpacity={0.8} onPress={sendEmail}>
                  <Mail size={16} color="#fff" strokeWidth={2} />
                  <Text style={s.sendBtnText}>Send Email</Text>
                </TouchableOpacity>
              ) : null}
              {!phone && !email && (
                <View style={[s.sendBtn, { flex: 1, backgroundColor: c.paperDeep, borderWidth: 1, borderColor: c.lineMid }]}>
                  <Text style={{ fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: c.muted }}>No contact info on file</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.ink,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    color: c.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  templateCard: {
    width: 110,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.lineSoft,
    alignItems: 'center',
    gap: 6,
  },
  templateCardActive: {
    borderColor: c.orange,
    backgroundColor: c.orangeSoft,
  },
  templateEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  templateLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: c.mutedHi,
    textAlign: 'center',
    lineHeight: 15,
  },
  aiBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: c.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  composerWrap: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.lineSoft,
    overflow: 'hidden',
  },
  composerInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  logBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: c.paperDeep,
    borderWidth: 1,
    borderColor: c.lineMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: c.mutedHi,
  },
});
