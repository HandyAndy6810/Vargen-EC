import Constants from "expo-constants";
import { Platform } from "react-native";

// In development: iOS simulator uses localhost, Android emulator uses 10.0.2.2
// For physical devices, set EXPO_PUBLIC_API_URL in .env
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0] ?? "localhost";

  if (Platform.OS === "android") {
    return `http://${localhost}:5000`;
  }

  return `http://${localhost}:5000`;
}

export const API_BASE_URL = getBaseUrl();

const REQUEST_TIMEOUT_MS = 15_000;

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out — check your connection and try again.");
    }
    // Network failure (offline, DNS, etc.)
    throw new Error("Network error — check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}
