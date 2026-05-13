import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Phone, MessageSquare, FileText, Trash2 } from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { useCustomer } from '@/hooks/use-customers';
import { useCustomerMessages, useSendMessage, useDeleteMessage } from '@/hooks/use-messages';
import * as Haptics from 'expo-haptics';

const ORANGE     = '#f26a2a';
const INK        = '#141310';
const PAPER      = '#f7f4ee';
const PAPER_DEEP = '#efe9dd';
const CARD       = '#ffffff';
const MUTED      = 'rgba(20,19,16,0.55)';
const LINE_SOFT  = 'rgba(20,19,16,0.08)';
const LINE_MID   = 'rgba(20,19,16,0.14)';
const BLUE       = '#1f6feb';
const BLUE_SOFT  = '#eaf2ff';
const GREEN      = '#2a9d4c';

type Channel = 'note' | 'sms' | 'email';

const CHANNEL_META: Record<Channel, { label: string; color: string; bg: string }> = {
  note:  { label: 'Note',  color: MUTED, bg: PAPER_DEEP },
  sms:   { label: 'SMS',   color: BLUE,  bg: BLUE_SOFT  },
  email: { label: 'Email', color: GREEN, bg: '#e5f6eb'   },
};

function msgDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, "'Today' · h:mm a");
  if (isYesterday(d)) return format(d, "'Yesterday' · h:mm a");
  return format(d, 'd MMM · h:mm a');
}

export default function CustomerMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = id ? Number(id) : 0;

  const { data: customer } = useCustomer(customerId) as any;
  const { data: messages = [] } = useCustomerMessages(customerId);
  const sendMsg = useSendMessage(customerId);
  const deleteMsg = useDeleteMessage(customerId);

  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<Channel>('note');
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const listRef = useRef<FlatList>(null);

  const name = customer?.name || 'Customer';

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMsg.mutate(
      { body: trimmed, direction, channel },
      {
        onSuccess: () => {
          setBody('');
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        },
        onError: (err: any) => Alert.alert('Error', err.message),
      }
    );
  };

  const handleDelete = (msgId: number) => {
    Alert.alert('Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMsg.mutate(msgId) },
    ]);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOut = item.direction === 'out';
    const ch = CHANNEL_META[item.channel as Channel] || CHANNEL_META.note;
    return (
      <View style={[s.msgRow, isOut ? s.msgRowOut : s.msgRowIn]}>
        <TouchableOpacity
          onLongPress={() => handleDelete(item.id)}
          activeOpacity={0.85}
          style={[s.bubble, isOut ? s.bubbleOut : s.bubbleIn]}
        >
          <View style={[s.channelPill, { backgroundColor: ch.bg }]}>
            <Text style={[s.channelPillText, { color: ch.color }]}>{ch.label}</Text>
          </View>
          <Text style={[s.bubbleText, isOut && { color: '#fff' }]}>{item.body}</Text>
          <Text style={[s.bubbleTime, isOut && { color: 'rgba(255,255,255,0.6)' }]}>
            {msgDateLabel(item.createdAt)} · {isOut ? 'You' : name}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={18} color={INK} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Messages</Text>
            <Text style={s.title} numberOfLines={1}>{name}</Text>
          </View>
          {customer?.phone && (
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => {
              import('react-native').then(({ Linking }) => Linking.openURL(`tel:${customer.phone}`));
            }}>
              <Phone size={18} color={INK} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.empty}>
              <MessageSquare size={36} color={MUTED} strokeWidth={1.5} />
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>Log a call, note a conversation, or send an SMS below</Text>
            </View>
          }
        />

        {/* Composer */}
        <View style={s.composer}>
          {/* Channel + direction toggles */}
          <View style={s.toggleRow}>
            <View style={s.channelRow}>
              {(['note', 'sms', 'email'] as Channel[]).map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[s.channelBtn, channel === ch && { backgroundColor: INK }]}
                  onPress={() => { Haptics.selectionAsync(); setChannel(ch); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.channelBtnText, channel === ch && { color: '#fff' }]}>
                    {CHANNEL_META[ch].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s.dirBtn, direction === 'in' && { backgroundColor: BLUE }]}
              onPress={() => { Haptics.selectionAsync(); setDirection(d => d === 'out' ? 'in' : 'out'); }}
              activeOpacity={0.75}
            >
              <Text style={[s.dirBtnText, direction === 'in' && { color: '#fff' }]}>
                {direction === 'out' ? '↑ Sent' : '↓ Received'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Text input */}
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={body}
              onChangeText={setBody}
              placeholder={
                channel === 'sms'   ? 'Type an SMS message…' :
                channel === 'email' ? 'Type an email…' :
                'Add a note…'
              }
              placeholderTextColor={MUTED}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, !body.trim() && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!body.trim() || sendMsg.isPending}
              activeOpacity={0.8}
            >
              <Send size={18} color="#fff" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: LINE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1 },
  title:   { fontSize: 17, fontFamily: 'Manrope_800ExtraBold', color: INK, letterSpacing: -0.4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: INK },
  emptySub:   { fontSize: 13, fontFamily: 'Manrope_500Medium', color: MUTED, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  msgRow:    { marginBottom: 10 },
  msgRowOut: { alignItems: 'flex-end' },
  msgRowIn:  { alignItems: 'flex-start' },
  bubble:    { maxWidth: '80%', borderRadius: 18, padding: 12, gap: 4 },
  bubbleOut: { backgroundColor: INK, borderBottomRightRadius: 4 },
  bubbleIn:  { backgroundColor: CARD, borderWidth: 1, borderColor: LINE_MID, borderBottomLeftRadius: 4 },
  channelPill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  channelPillText: { fontSize: 9, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { fontSize: 14, fontFamily: 'Manrope_500Medium', color: INK, lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontFamily: 'Manrope_500Medium', color: MUTED, marginTop: 2 },
  composer: {
    borderTopWidth: 1, borderTopColor: LINE_SOFT,
    backgroundColor: 'rgba(247,244,238,0.96)', padding: 12,
    shadowColor: INK, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  channelRow: { flexDirection: 'row', gap: 6 },
  channelBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    backgroundColor: PAPER_DEEP, borderWidth: 1, borderColor: LINE_MID,
  },
  channelBtnText: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: MUTED },
  dirBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    backgroundColor: PAPER_DEEP, borderWidth: 1, borderColor: LINE_MID,
  },
  dirBtnText: { fontSize: 11, fontFamily: 'Manrope_700Bold', color: MUTED },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, backgroundColor: CARD, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10, paddingTop: 10,
    fontSize: 14, fontFamily: 'Manrope_500Medium', color: INK,
    borderWidth: 1, borderColor: LINE_MID, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
});
