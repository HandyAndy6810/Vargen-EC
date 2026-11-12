import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { drainOutbox, type OutboxEntry } from '@shared/outbox';
import type { ContactCard } from '@shared/share-intake';
import { apiRequest } from './api';
import { isNetworkError } from './connectivity';
import { queryClient } from './queryClient';
import { addCustomerNote, keepFile, saveContact, saveReceiptFromFile } from './share-actions';
import { forgetFiles } from './share-files';
import type { LocalFile } from './share-handoff';
import { syncOutbox as syncQuoteOutbox } from './quote-outbox';

/**
 * Shares the tradie chose what to do with while there was no signal (Share to
 * Vargen, step 5). Each entry is ONE thing to do with ONE file (or one message
 * or contact), so a retry after a dropped signal never repeats what already
 * went. The draining rules are the quote outbox's (shared/outbox.ts): in order,
 * stop when offline, only the account that queued it sends it. The files were
 * copied into the app's own folder (lib/share-files) and are deleted once used.
 */

export type ShareJob =
  | { action: 'expense'; file: LocalFile; jobId: number | null }
  | { action: 'job_photo'; file: LocalFile; jobId: number }
  | { action: 'quote_photo'; file: LocalFile; quoteId: number }
  /** A photo for a quote saved offline: found by the quote's clientId once it has synced. */
  | { action: 'quote_photo_by_client'; file: LocalFile; quoteClientId: string }
  | { action: 'save_customer'; contact: ContactCard }
  | { action: 'customer_note'; customerId: number; text: string; at: number };

const KEY = '@vargen_share_outbox';
let entries: OutboxEntry[] = [];
let loaded = false;
let syncing: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function persist(next: OutboxEntry[]) {
  entries = next;
  emit();
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch { /* keep in memory */ }
}

async function load() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    entries = Array.isArray(parsed) ? parsed : [];
  } catch { entries = []; }
  loaded = true;
  emit();
}

const currentUserId = () => (queryClient.getQueryData(['/api/auth/user']) as { id?: string } | null | undefined)?.id;
const newId = () => `share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function queueShare(jobs: ShareJob[]): Promise<void> {
  await load();
  const uid = currentUserId();
  await persist([...entries, ...jobs.map((body) => ({ clientId: newId(), body: body as unknown as Record<string, unknown>, createdAt: Date.now(), attempts: 0, userId: uid }))]);
}

async function run(job: ShareJob): Promise<void> {
  switch (job.action) {
    case 'expense': await saveReceiptFromFile(job.file, job.jobId); break;
    case 'job_photo': await keepFile({ jobId: job.jobId }, job.file); break;
    case 'quote_photo': await keepFile({ quoteId: job.quoteId }, job.file); break;
    case 'quote_photo_by_client': {
      const res = await apiRequest('GET', '/api/quotes');
      const list = res.ok ? await res.json() : [];
      const quote = Array.isArray(list) ? list.find((q: any) => q?.clientId === job.quoteClientId) : null;
      if (!quote) throw new Error('The quote has not synced yet');
      await keepFile({ quoteId: quote.id }, job.file);
      break;
    }
    case 'save_customer': await saveContact(job.contact); break;
    case 'customer_note': await addCustomerNote(job.customerId, job.text, new Date(job.at)); break;
  }
  if ('file' in job) await forgetFiles([job.file]);
}

/** Do what's waiting, in order: after the quote outbox, so a photo's quote exists first. */
export function syncShareOutbox(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    await load();
    const uid = currentUserId();
    if (!uid) return;
    const mine = entries.filter((e) => e.userId === uid);
    if (!mine.length) return;
    await syncQuoteOutbox().catch(() => {});
    const others = entries.filter((e) => e.userId !== uid);
    await drainOutbox(mine, async (entry) => {
      try {
        await run(entry.body as unknown as ShareJob);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, offline: isNetworkError(err), error: String(err?.message || err) };
      }
    }, (remaining) => persist([...others, ...remaining]));
  })().finally(() => { syncing = null; });
  return syncing;
}

/** Logout: the account's waiting shares go with it. */
export async function clearShareOutbox(): Promise<void> {
  await load();
  const files = entries.flatMap((e) => ('file' in (e.body as any) ? [(e.body as any).file as LocalFile] : []));
  await forgetFiles(files);
  await persist([]);
}

/** For screens: how many of this account's shares are waiting. */
export function useShareOutboxCount(): number {
  const all = useSyncExternalStore(
    (cb) => { listeners.add(cb); if (!loaded) load(); return () => listeners.delete(cb); },
    () => entries,
    () => entries,
  );
  const uid = currentUserId();
  return all.filter((e) => e.userId === uid).length;
}
