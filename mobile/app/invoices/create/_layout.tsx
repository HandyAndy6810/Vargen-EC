import { Stack } from 'expo-router';
import { InvoiceDraftProvider } from '@/hooks/use-invoice-draft';
import { useTheme } from '@/hooks/use-theme';

// Mirrors the quote flow: the provider wraps every step so they share one
// in-progress invoice, and the two editing surfaces are real iOS sheets.
export default function InvoiceCreateLayout() {
  // The sheet container behind every screen in this stack. Without it React
  // Navigation falls back to its own light theme (rgb(242,242,242)), which showed
  // as a light block under the dark formSheet sheets wherever their content
  // stopped short — under the home indicator, or with the keyboard open.
  const { colors } = useTheme();
  return (
    <InvoiceDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.paper } }}>
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
