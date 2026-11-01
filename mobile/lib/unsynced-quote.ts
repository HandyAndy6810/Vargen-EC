import { format } from 'date-fns';
import type { OutboxEntry } from '@shared/outbox';

/** An outbox entry, read back as a quote for display. Nothing here is from the server. */
export type UnsyncedQuote = {
  clientId: string;
  title: string;
  customerName: string;
  total: number;
  subtotal: number;
  gst: number;
  /** Stands in for a quote number until the server gives it one. */
  reference: string;
  savedAt: number;
  lastError?: string;
  attempts: number;
  content: any;
};

export function readUnsynced(entry: OutboxEntry): UnsyncedQuote {
  let content: any = {};
  try { content = JSON.parse(String(entry.body.content ?? '{}')); } catch { content = {}; }
  const total = Number(entry.body.totalAmount ?? content.totalAmount) || 0;
  return {
    clientId: entry.clientId,
    title: String(entry.body.jobTitle || content.jobTitle || 'Untitled quote'),
    customerName: String(content.customerName || ''),
    total,
    subtotal: Number(content.subtotal) || total,
    gst: Number(content.gstAmount) || 0,
    reference: `Unsynced · ${format(new Date(entry.createdAt), 'd MMM, h:mm a')}`,
    savedAt: entry.createdAt,
    lastError: entry.lastError,
    attempts: entry.attempts,
    content,
  };
}
