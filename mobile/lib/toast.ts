import { Alert, Platform } from "react-native";

export interface ToastPayload {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

// The Snackbar host (components/Snackbar.tsx, mounted in the root layout)
// registers itself here. When mounted, toasts are non-blocking slide-ups;
// if it hasn't mounted yet we fall back to a blocking alert so nothing is lost.
let listener: ((t: ToastPayload) => void) | null = null;

export function setToastListener(l: ((t: ToastPayload) => void) | null) {
  listener = l;
}

export function toast(t: ToastPayload) {
  if (listener) {
    listener(t);
    return;
  }
  // Fallback — Snackbar not mounted (e.g. very early in boot)
  if (Platform.OS === "web") {
    window.alert([t.title, t.description].filter(Boolean).join("\n"));
  } else {
    Alert.alert(t.title, t.description);
  }
}

// Drop-in replacement for the web's useToast hook.
export function useToast() {
  return { toast };
}
