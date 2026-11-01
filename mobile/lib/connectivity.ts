import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Whether the server can be reached, learned from the requests themselves rather
 * than a native network module (none is installed, and adding one means a build).
 *
 * - A request that fails with a network error or a timeout marks the app offline.
 * - Any response at all, even an error status, marks it online.
 * - While offline, a light probe runs every PROBE_MS and whenever the app comes
 *   back to the foreground, so reconnection is noticed without the tradie doing
 *   anything.
 *
 * This drives React Query's onlineManager: offline, queries pause and screens keep
 * showing the copy on the phone; back online, they refetch (refetchOnReconnect)
 * and the quote outbox syncs.
 */

const PROBE_MS = 20_000;
const PROBE_TIMEOUT_MS = 8_000;

let baseUrl = '';
let probeTimer: ReturnType<typeof setInterval> | null = null;

/**
 * The failure apiRequest and fetch produce when there's no connection, as opposed
 * to an answer the server gave. Shared with use-auth, which keeps the tradie signed
 * in on the cached user in exactly this case.
 */
export function isNetworkError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? '').toLowerCase();
  return (
    msg.includes('network error') ||
    msg.includes('network request failed') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    (err as any)?.name === 'AbortError'
  );
}

export function markOnline(): void {
  if (!onlineManager.isOnline()) onlineManager.setOnline(true);
  stopProbe();
}

export function markOffline(): void {
  if (onlineManager.isOnline()) onlineManager.setOnline(false);
  startProbe();
}

async function probe(): Promise<void> {
  if (!baseUrl) return;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Any HTTP answer, a 401 included, means the server is reachable.
    await fetch(`${baseUrl}/api/auth/user`, { credentials: 'include', signal: controller.signal });
    markOnline();
  } catch {
    // Still offline; the interval tries again.
  } finally {
    clearTimeout(t);
  }
}

function startProbe(): void {
  if (probeTimer) return;
  probeTimer = setInterval(probe, PROBE_MS);
}

function stopProbe(): void {
  if (probeTimer) clearInterval(probeTimer);
  probeTimer = null;
}

/**
 * Called once from api.ts. Takes over onlineManager's event source: React
 * Native has no browser "online" events, so the default listener would never fire.
 */
export function initConnectivity(apiBaseUrl: string): void {
  baseUrl = apiBaseUrl;
  onlineManager.setEventListener(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !onlineManager.isOnline()) probe();
    });
    return () => sub.remove();
  });
}

/** For screens: re-renders when the app goes offline or comes back. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
