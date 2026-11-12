import { apiRequest } from './api';
import { queryClient } from './queryClient';
import { attachmentData, fileBase64, photoDataUri } from './share-files';
import type { LocalFile } from './share-handoff';
import type { ContactCard } from '@shared/share-intake';

/**
 * The server side of each Share to Vargen choice (step 5), shared by the share
 * screen (online) and the share outbox (when the signal comes back). Every one
 * of these runs only after the tradie picked it: nothing is saved silently.
 */

async function ok(res: Response, what: string) {
  if (res.ok) return res.json().catch(() => ({}));
  const body = await res.json().catch(() => ({} as any));
  throw Object.assign(new Error(body?.message || `${what} failed`), { status: res.status });
}

/** Keep a photo or PDF with a receipt, job or quote. */
export async function keepFile(parent: { receiptId?: number; jobId?: number; quoteId?: number }, file: LocalFile) {
  const data = await attachmentData(file);
  await ok(await apiRequest('POST', '/api/attachments', { ...parent, data, fileName: file.fileName }), 'Saving the file');
  queryClient.invalidateQueries({ queryKey: ['/api/attachments'] });
}

/** Read a receipt or supplier invoice (photo or PDF) with the receipt reader. */
export async function scanReceiptFile(file: LocalFile): Promise<any> {
  const body = file.mimeType === 'application/pdf'
    ? { pdfBase64: await fileBase64(file) }
    : { imageBase64: await photoDataUri(file) };
  return ok(await apiRequest('POST', '/api/receipts/scan', body), 'Reading the receipt');
}

/**
 * Add a receipt to expenses without the review screen: for a share kept in the
 * outbox until the signal came back (the tradie chose "Add to expenses" then).
 * If it can't be read it's still saved, at $0 with a note to check it, so it's
 * never lost. Pricing (step 4) runs on the server when it's saved.
 */
export async function saveReceiptFromFile(file: LocalFile, jobId: number | null) {
  let scan: any = null;
  try { scan = await scanReceiptFile(file); } catch (e: any) { if (e?.status === 415) throw e; }
  const receipt = await ok(await apiRequest('POST', '/api/receipts', scan ? {
    vendor: scan.vendor || undefined, receiptDate: scan.date || undefined, totalAmount: scan.total || '0',
    category: scan.category || 'Materials', notes: [scan.notes, 'Added from Share to Vargen'].filter(Boolean).join(' · '),
    items: JSON.stringify(scan.items || []), pricesIncludeGst: scan.pricesIncludeGst ?? null,
    receiptDiscount: scan.receiptDiscount ?? null, jobId: jobId ?? undefined,
  } : {
    totalAmount: '0', category: 'Materials', jobId: jobId ?? undefined,
    notes: "Added from Share to Vargen. Couldn't read it: check the total.",
  }), 'Saving the receipt');
  await keepFile({ receiptId: receipt.id }, file);
  queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
  queryClient.invalidateQueries({ queryKey: ['/api/price-unsure'] });
  return receipt;
}

/** Save a contact card as a customer. */
export async function saveContact(card: ContactCard) {
  const created = await ok(await apiRequest('POST', '/api/customers', {
    name: card.name, phone: card.phone || '', email: card.email || '', address: card.address || '',
    companyName: card.company || null,
  }), 'Saving the customer');
  queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
  return created;
}

/** Add a message to a customer's notes, dated, under what's already there. */
export async function addCustomerNote(customerId: number, text: string, when = new Date()) {
  const current = await ok(await apiRequest('GET', `/api/customers/${customerId}`), 'Loading the customer');
  const stamp = when.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const notes = [String(current?.notes ?? '').trim(), `${stamp}: ${text.trim()}`].filter(Boolean).join('\n\n');
  await ok(await apiRequest('PATCH', `/api/customers/${customerId}`, { notes }), 'Saving the note');
  queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
}
