import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, Sparkles, Bot } from 'lucide-react-native';

const BRAND      = '#ea580c';
const INK        = '#1c1917';
const MUTED      = '#78716c';
const PAPER      = '#faf9f7';
const PAPER_DEEP = '#f0ece4';
const CARD       = '#ffffff';
const LINE       = '#e7e5e4';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const SCRIPT: Record<string, string> = {
  default: "Hi! I'm your VGN-EC AI assistant. Tell me what kind of job you need to quote and I'll help you build it fast. Try something like: \"Rewire a 3-bed house in Marrickville\"",
  rewire:  "Great! For a full rewire of a 3-bedroom house I'd suggest:\n\n• Labour (2 sparks × 2 days): $2,400\n• Materials (switchboard, cable, outlets): $1,800\n• Sundries & consumables: $200\n\n**Total: $4,400 ex GST** ($4,840 inc GST)\n\nShall I create a quote draft for this?",
  yes:     "Done! I've drafted **Quote #QT-0041** for the Marrickville rewire. You can find it in your Quotes tab. Want me to adjust the margin or add any line items?",
};

function getReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('rewire') || lower.includes('3 bed') || lower.includes('house')) return SCRIPT.rewire;
  if (lower.match(/\b(yes|yeah|yep|sure|create|draft|do it)\b/)) return SCRIPT.yes;
  return "I can help you with that! Could you give me a bit more detail about the job — location, scope, and any special requirements?";
}

let msgId = 0;
function nextId() { return String(++msgId); }

export default function AiChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: 'assistant', text: SCRIPT.default },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: nextId(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const reply: Message = { id: nextId(), role: 'assistant', text: getReply(text) };
      setMessages((prev) => [...prev, reply]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, 700);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Sparkles size={18} color={BRAND} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>AI Quote Assistant</Text>
          <Text style={s.headerSub}>Powered by VGN-EC</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} activeOpacity={0.7}>
          <X size={18} color={INK} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleAssistant]}>
              {msg.role === 'assistant' && (
                <View style={s.botAvatar}>
                  <Bot size={14} color={BRAND} />
                </View>
              )}
              <View style={[s.bubbleContent, msg.role === 'user' ? s.bubbleContentUser : s.bubbleContentAssistant]}>
                <Text style={[s.bubbleText, msg.role === 'user' && { color: '#fff' }]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input row */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe the job..."
            placeholderTextColor={MUTED}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[s.sendBtn, !input.trim() && { opacity: 0.4 }]}
            onPress={send}
            disabled={!input.trim()}
            activeOpacity={0.8}
          >
            <Send size={18} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: CARD,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleUser: {
    justifyContent: 'flex-end',
  },
  bubbleAssistant: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubbleContent: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleContentUser: {
    backgroundColor: BRAND,
    borderBottomRightRadius: 4,
  },
  bubbleContentAssistant: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: INK,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: CARD,
  },
  input: {
    flex: 1,
    backgroundColor: PAPER_DEEP,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: INK,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
