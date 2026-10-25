import { Stack } from 'expo-router';
import { QuoteDraftProvider } from '@/hooks/use-quote-draft';
import { useTheme } from '@/hooks/use-theme';

// The provider wraps the whole flow so all steps share one in-progress quote,
// and it's torn down when the flow is left.
export default function QuoteCreateLayout() {
  // The sheet container behind every screen in this stack. Without it React
  // Navigation falls back to its own light theme (rgb(242,242,242)), which showed
  // as a light block under the dark formSheet sheets wherever their content
  // stopped short — under the home indicator, or with the keyboard open.
  const { colors } = useTheme();
  return (
    <QuoteDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="describe" />
        <Stack.Screen name="clarify" />
        <Stack.Screen name="review" />

        {/* Real iOS sheets rather than hand-built ones. The system gives us the
            grabber, drag-to-resize between the detents, the rubber-banding at the
            edges and correct keyboard behaviour — all of which had to be
            approximated before, and one of those approximations is what put the
            line editor up under the status bar with its fields overlapping. */}
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
        {/* Kept registered so any lingering deep link still resolves; the flow
            itself is Describe → Review, with everything edited on Review. */}
        <Stack.Screen name="job" />
        <Stack.Screen name="items" />
      </Stack>
    </QuoteDraftProvider>
  );
}
