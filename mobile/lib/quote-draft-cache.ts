import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LineItem } from '@/hooks/use-quote-draft';

/** Quotes and invoices each keep their own unfinished draft. */
export type DraftKind = 'quote' | 'invoice';

/**
 * A quote in progress, kept on the device so a phone call, a flat battery or an
 * accidental back-swipe doesn't cost the tradie the description they just typed.
 * Only unsaved NEW quotes are cached — an existing quote already has a copy on
 * the server, so restoring one would only risk clobbering it.
 */
export type CachedQuoteDraft = {
  savedAt: number;
  /** Invoices carry a few fields quotes don't; they ride along unread by quotes. */
  quoteId?: number;
  dueDateISO?: string;
  paymentTermsDays?: number;
  customer: string;
  customerId: number | null;
  jobTitle: string;
  summary: string;
  schedDate: string;
  expiryDate: string;
  notes: string;
  lines: LineItem[];
  markupPct: number;
  assumptions: string[];
  roundUp: boolean;
};

const KEY_BY_KIND: Record<DraftKind, string> = {
  quote: '@vargen_quote_draft',
  invoice: '@vargen_invoice_draft',
};
/** Anything older than a week is stale enough that offering it back is just noise. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function loadQuoteDraft(kind: DraftKind = 'quote'): Promise<CachedQuoteDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BY_KIND[kind]);
    if (!raw) return null;
    const d = JSON.parse(raw) as CachedQuoteDraft;
    if (!d || typeof d.savedAt !== 'number' || Date.now() - d.savedAt > MAX_AGE_MS) {
      await clearQuoteDraft(kind);
      return null;
    }
    // Guard against a shape written by an older build.
    if (!Array.isArray(d.lines)) return null;
    return d;
  } catch {
    return null;
  }
}

export async function saveQuoteDraft(
  d: Omit<CachedQuoteDraft, 'savedAt'>,
  kind: DraftKind = 'quote',
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_BY_KIND[kind], JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {}
}

export async function clearQuoteDraft(kind: DraftKind = 'quote'): Promise<void> {
  try { await AsyncStorage.removeItem(KEY_BY_KIND[kind]); } catch {}
}

/** "just now" / "20 minutes ago" / "yesterday" — plain words, no library. */
export function describeAge(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
