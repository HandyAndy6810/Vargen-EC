import { Alert } from "react-native";

// Simple toast-compatible interface matching the web app's useToast API.
// Upgrade to a library like react-native-toast-message when needed.
export function toast({
  title,
  description,
  variant,
}: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) {
  if (variant === "destructive") {
    Alert.alert(`\u26A0\uFE0F ${title}`, description);
  } else {
    Alert.alert(`\u2705 ${title}`, description);
  }
}

// Drop-in replacement for the web's useToast hook.
export function useToast() {
  return { toast };
}
