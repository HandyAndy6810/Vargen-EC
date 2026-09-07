import { Stack } from 'expo-router';
import { InvoiceDraftProvider } from '@/hooks/use-invoice-draft';

// Mirrors the quote flow: the provider wraps every step so they share one
// in-progress invoice, and the two editing surfaces are real iOS sheets.
export default function InvoiceCreateLayout() {
  return (
    <InvoiceDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="describe" />
        <Stack.Screen name="quote-pick" />
        <Stack.Screen name="review" />

        <Stack.Screen
          name="line"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6, 0.95],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            sheetExpandsWhenScrolledToEdge: false,
          }}
        />
        <Stack.Screen
          name="send"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.65, 0.95],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            sheetExpandsWhenScrolledToEdge: false,
          }}
        />
      </Stack>
    </InvoiceDraftProvider>
  );
}
