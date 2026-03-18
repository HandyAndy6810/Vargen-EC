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
    Alert.alert(title, description);
  } else {
    // For success toasts, a brief alert is enough for now.
    // Replace with a snackbar/toast library for a better UX.
    Alert.alert(title, description);
  }
}

// Drop-in replacement for the web's useToast hook.
export function useToast() {
  return { toast };
}
