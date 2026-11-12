/**
 * Share to Vargen (docs/pricing-design.md, step 5): what the share screen
 * (app/share.tsx) hands to the screen that does the work. Each is taken once.
 *
 *  - receipts: the files to read and add to expenses, in order (the receipt
 *    scan screen works through them one at a time; the tradie checks each).
 *  - quote: a message's text for Describe, and photos to keep with the quote
 *    once it's saved.
 *  - customer: a contact card's details for the new-customer form.
 *  - afterLogin: a share arrived while signed out; carry on after signing in.
 */
import type { ContactCard } from '@shared/share-intake';

/** A shared file, copied somewhere the app owns (lib/share-files). */
export type LocalFile = { uri: string; mimeType: string; fileName: string | null };

let receipts: { files: LocalFile[]; jobId: number | null } | null = null;
let quote: { text: string | null; photos: LocalFile[] } | null = null;
let customer: ContactCard | null = null;
let afterLogin = false;

export const setReceiptQueue = (files: LocalFile[], jobId: number | null) => { receipts = { files: [...files], jobId }; };
/** The next receipt file to read, and the job they're all linked to (or null). */
export function nextReceiptFile(): { file: LocalFile; jobId: number | null; left: number } | null {
  if (!receipts || !receipts.files.length) { receipts = null; return null; }
  const file = receipts.files.shift()!;
  return { file, jobId: receipts.jobId, left: receipts.files.length };
}
export const receiptsWaiting = () => receipts?.files.length ?? 0;

export const setQuotePrefill = (text: string | null, photos: LocalFile[]) => { quote = { text, photos }; };
/** Describe takes the text, once. */
export function takeQuoteText(): string | null {
  const t = quote?.text ?? null;
  if (quote) quote = { ...quote, text: null };
  return t;
}
/**
 * The quote draft takes the photos when it opens, so only THAT quote's save
 * keeps them (a quote the tradie abandons can't pass them to the next one).
 */
export function takeQuotePhotos(): LocalFile[] {
  const p = quote?.photos ?? [];
  if (quote) quote = { ...quote, photos: [] };
  return p;
}

export const setCustomerPrefill = (c: ContactCard) => { customer = c; };
export function takeCustomerPrefill(): ContactCard | null { const c = customer; customer = null; return c; }

export const setShareAfterLogin = (v: boolean) => { afterLogin = v; };
export const shareAfterLogin = () => afterLogin;
