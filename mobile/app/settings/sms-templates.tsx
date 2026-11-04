import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Sparkles } from 'lucide-react-native';
import { ScreenGradient, GradientHeader, useGradientScroll, heroSecondary, wellFill } from '@/components/Rim';
import { rimTile } from '@/theme/rim';
import { useTheme, type Colors } from '@/hooks/use-theme';

const TEMPLATES = [
  {
    name: 'Quote follow-up',
    trigger: 'Sent 3 days after quote delivered',
    preview: "Hi [Name], just checking in on the quote we sent through. Happy to answer any questions — let us know if you'd like to go ahead.",
  },
  {
    name: 'Overdue invoice',
    trigger: 'Sent 7 days after invoice due',
    preview: "Hi [Name], a friendly reminder that invoice #[Number] for $[Amount] is now overdue. Please let us know if you have any questions.",
  },
  {
    name: 'Job complete',
    trigger: 'Sent when job is marked complete',
    preview: "Hi [Name], thanks for having us! Your job is complete. If you're happy with the work, a quick Google review would mean a lot — [Link].",
  },
];

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    group: { paddingHorizontal: 20, paddingTop: 22 },
    groupLabel: { fontSize: 13, fontFamily: 'HostGrotesk_600SemiBold', color: heroSecondary(isDark), marginBottom: 8, marginLeft: 2 },
    card: { ...rimTile(c, isDark), overflow: 'hidden' },
    templateCard: { paddingHorizontal: 14, paddingVertical: 14 },
    divider: { borderTopWidth: 1, borderTopColor: c.lineSoft },
    templateName: { fontSize: 14, fontFamily: 'HostGrotesk_800ExtraBold', color: c.ink },
    templateTrigger: { fontSize: 11, fontFamily: 'HostGrotesk_500Medium', color: c.orange, marginTop: 2, marginBottom: 8 },
    templatePreview: { fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.mutedHi, lineHeight: 20, backgroundColor: wellFill(isDark), borderRadius: 10, padding: 12 },
    banner: { flexDirection: 'row', gap: 10, backgroundColor: c.orangeSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: `${c.orange}33`, marginHorizontal: 20, marginTop: 22 },
    bannerText: { flex: 1, fontSize: 12, fontFamily: 'HostGrotesk_500Medium', color: c.orangeDeep, lineHeight: 18 },
    comingSoonBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.orangeSoft, marginTop: 8 },
    comingSoonText: { fontSize: 10, fontFamily: 'HostGrotesk_800ExtraBold', color: c.orangeDeep, letterSpacing: 0.5, textTransform: 'uppercase' },
  });
}

export default function SmsTemplatesScreen() {
  const { colors: c, isDark } = useTheme();
  const { scrollY, scrollProps } = useGradientScroll();
  const s = makeStyles(c, isDark);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={[]}>
      <ScreenGradient intensity="soft" scrollY={scrollY} />
      <GradientHeader eyebrow="AI & Automations" title="SMS Templates" />

      <Animated.ScrollView {...scrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={s.banner}>
          <Sparkles size={16} color={c.orange} strokeWidth={2.1} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bannerText}>
              These are your default message templates. They are sent automatically when reminders are enabled.
            </Text>
            <View style={s.comingSoonBadge}>
              <Text style={s.comingSoonText}>Custom templates — coming soon</Text>
            </View>
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.groupLabel}>Default templates</Text>
          <View style={s.card}>
            {TEMPLATES.map((t, i) => (
              <View key={t.name} style={[s.templateCard, i > 0 && s.divider]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <MessageSquare size={14} color={c.orange} strokeWidth={2.2} />
                  <Text style={s.templateName}>{t.name}</Text>
                </View>
                <Text style={s.templateTrigger}>{t.trigger}</Text>
                <Text style={s.templatePreview}>{t.preview}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
