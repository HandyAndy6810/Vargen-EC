import { Stack } from 'expo-router';
import { QuoteDraftProvider } from '@/hooks/use-quote-draft';

// The provider wraps the whole flow so all steps share one in-progress quote,
// and it's torn down when the flow is left.
export default function QuoteCreateLayout() {
  return (
    <QuoteDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="describe" />
        <Stack.Screen name="review" />
        {/* Kept registered so any lingering deep link still resolves; the flow
            itself is Describe → Review, with everything edited on Review. */}
        <Stack.Screen name="customer" />
        <Stack.Screen name="job" />
        <Stack.Screen name="items" />
      </Stack>
    </QuoteDraftProvider>
  );
}
