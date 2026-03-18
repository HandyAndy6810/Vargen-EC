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
    // Android emulator needs host machine IP
    return `http://${localhost}:5000`;
  }

  return `http://${localhost}:5000`;
}

export const API_BASE_URL = getBaseUrl();

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: data ? JSON.stringify(data) : undefined,
  });
  return res;
}
