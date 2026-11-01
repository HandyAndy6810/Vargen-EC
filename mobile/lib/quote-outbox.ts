import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { drainOutbox, type OutboxEntry } from '@shared/outbox';
import { apiRequest } from './api';
import { isNetworkError } from './connectivity';
import { queryClient } from './queryClient';

export type { OutboxEntry } from '@shared/outbox';

/**
 * New quotes saved with no connection, waiting to reach the server. Each entry is
 * the exact POST /api/quotes body an online save would have sent (built by
 * buildQuoteBody in use-quote-draft), plus a clientId the server uses to make the
 * create safe to repeat. The draining rules live in shared/outbox.ts (tested).
 *
 * Synced on app start, when the app comes back to the foreground, when the
 * connection returns, and from the "Sync now" button on the quotes list.
 */

const KEY = '@vargen_quote_outbox';

let entries: OutboxEntry[] = [];
let loaded = false;
let syncing: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

async function persist(next: OutboxEntry[]) {
  entries = next;
  emit();
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch { /* keep in memory */ }
}

export async function loadOutbox(): Promise<OutboxEntry[]> {
  if (loaded) return entries;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    entries = Array.isArray(parsed) ? parsed : [];
  } catch {
    entries = [];
  }
  loaded = true;
  emit();
  return entries;
}

/** The signed-in account, from the auth query (seeded from the device's cached user). */
function currentUserId(): string | undefined {
  return (queryClient.getQueryData(['/api/auth/user']) as { id?: string } | null | undefined)?.id;
}

export async function addToOutbox(clientId: string, body: Record<string, unknown>): Promise<void> {
  await loadOutbox();
  // The same draft saved twice offline replaces its own entry rather than queueing two.
  const rest = entries.filter(e => e.clientId !== clientId);
  await persist([...rest, { clientId, body, createdAt: Date.now(), attempts: 0, userId: currentUserId() }]);
}

/** Send what's waiting, in order. Safe to call any time; concurrent calls share one run. */
export function syncOutbox(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    await loadOutbox();
    // A session that expired and came back as someone else must never send the
    // previous account's quotes under the new one.
    const uid = currentUserId();
    if (!uid) return;
    const mine = entries.filter(e => e.userId === uid);
    if (!mine.length) return;
    const others = entries.filter(e => e.userId !== uid);
    const result = await drainOutbox(mine, async (entry) => {
      try {
        const res = await apiRequest('POST', '/api/quotes', entry.body);
        if (res.ok) return { ok: true };
        const detail = await res.json().catch(() => ({} as any));
        return { ok: false, offline: false, error: `${res.status} ${detail?.message || res.statusText}` };
      } catch (err: any) {
        return { ok: false, offline: isNetworkError(err), error: String(err?.message || err) };
      }
    }, (remaining) => persist([...others, ...remaining]));
    if (result.synced > 0) queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
  })().finally(() => { syncing = null; });
  return syncing;
}

/** Logout: unsynced quotes belong to the account signing out, so they go too. */
export async function clearOutbox(): Promise<void> {
  await persist([]);
  try { await AsyncStorage.removeItem(KEY); } catch { /* nothing to remove */ }
}

/** For screens: the signed-in account's waiting entries, re-rendering as they change. */
export function useOutbox(): OutboxEntry[] {
  const all = useSyncExternalStore(
    (cb) => { listeners.add(cb); if (!loaded) loadOutbox(); return () => listeners.delete(cb); },
    () => entries,
    () => entries,
  );
  const uid = currentUserId();
  return all.filter(e => e.userId === uid);
}

/** The signed-in account's entries still waiting. */
export function outboxCount(): number {
  const uid = currentUserId();
  return entries.filter(e => e.userId === uid).length;
}
