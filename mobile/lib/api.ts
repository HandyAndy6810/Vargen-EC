import Constants from "expo-constants";

// In development the Metro host is reused; for physical devices and all
// production builds, EXPO_PUBLIC_API_URL must be set in .env / EAS env.
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (!__DEV__) {
    // A production build without a configured API URL must fail loudly —
    // the old fallback silently sent session cookies to http://localhost
    throw new Error("EXPO_PUBLIC_API_URL is not set in this production build");
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0] ?? "localhost";
  return `http://${localhost}:5000`;
}

export const API_BASE_URL = getBaseUrl();

const REQUEST_TIMEOUT_MS = 15_000;

// Debounce the 401 logout — several queries can fail at once when a session dies
let handlingSessionExpiry = false;

export async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    return body.message || body.error || res.statusText || 'Something went wrong';
  } catch {
    return res.statusText || 'Something went wrong';
  }
}

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
    if (
      res.status === 401 &&
      !handlingSessionExpiry &&
      !path.startsWith("/api/auth") &&
      !path.startsWith("/api/login") &&
      !path.startsWith("/api/register") &&
      !path.startsWith("/api/dev-login")
    ) {
      // Session expired mid-app: clear the cached user and bounce to login
      // once, instead of every screen erroring forever.
      // Dynamic imports avoid the api ↔ queryClient module cycle.
      handlingSessionExpiry = true;
      try {
        const { clearCachedUser } = await import("./auth-cache");
        const { queryClient } = await import("./queryClient");
        const { router } = await import("expo-router");
        await clearCachedUser();
        queryClient.setQueryData(["/api/auth/user"], null);
        router.replace("/(auth)/login" as any);
      } finally {
        setTimeout(() => { handlingSessionExpiry = false; }, 3000);
      }
    }
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
