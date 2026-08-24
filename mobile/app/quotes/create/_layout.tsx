import { Stack } from 'expo-router';
import { QuoteDraftProvider } from '@/hooks/use-quote-draft';

// The provider wraps the whole flow so all steps share one in-progress quote,
// and it's torn down when the flow is left.
export default function QuoteCreateLayout() {
  return (
    <QuoteDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="job" />
        <Stack.Screen name="items" />
        <Stack.Screen name="review" />
      </Stack>
    </QuoteDraftProvider>
  );
}
