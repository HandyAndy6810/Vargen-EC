import { Stack } from 'expo-router';
import { InvoiceDraftProvider } from '@/hooks/use-invoice-draft';

export default function InvoiceCreateLayout() {
  return (
    <InvoiceDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="quote-pick" />
        <Stack.Screen name="from-quote" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="job" />
        <Stack.Screen name="items" />
        <Stack.Screen name="review" />
      </Stack>
    </InvoiceDraftProvider>
  );
}
