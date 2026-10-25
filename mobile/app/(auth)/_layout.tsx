import { Stack } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

export default function AuthLayout() {
  // Themed like the root stack, so nothing behind a screen falls back to
  // React Navigation's light default in dark mode.
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
