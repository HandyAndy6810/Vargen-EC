import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { A4_PRINT } from '@/lib/quote-pdf';

/**
 * Strip anything a file system, an email client or a Windows machine would object
 * to, and keep it short enough to stay readable in a share sheet.
 */
function safeName(s: string): string {
  return String(s)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')   // punctuation, slashes, accents
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/**
 * A filename the customer can recognise in their downloads folder six weeks later:
 * `Quote-0025-Whitfield.pdf`. The document number alone would be meaningless to
 * them, and the customer name alone would collide across jobs.
 */
export function documentFilename(doc: {
  documentType?: 'quote' | 'invoice';
  documentNumber?: string;
  customerName?: string;
  jobTitle?: string;
}): string {
  const kind = doc.documentType === 'invoice' ? 'Invoice' : 'Quote';
  const number = safeName(doc.documentNumber || '');
  // Surname where there is one — a first name is rarely the distinguishing part.
  const who = safeName((doc.customerName || '').split(/\s+/).slice(-1)[0] || '');
  const fallback = safeName(doc.jobTitle || '');
  const parts = [kind, number, who || fallback].filter(Boolean);
  return parts.join('-') || kind;
}

/**
 * Render a document and hand it to the OS share sheet under a meaningful name.
 *
 * expo-print writes to a cache file with a random name, which is what the customer
 * then receives — an attachment called something like `a1b2c3.pdf`. It is renamed
 * by moving it before sharing.
 *
 * The rename is best-effort on purpose: if it fails for any reason the original
 * file is shared instead. A tradie trying to send a quote should never be stopped
 * by a filename.
 */
export async function sharePdf(html: string, filename: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, ...A4_PRINT });

  let target = uri;
  try {
    const dir = FileSystem.cacheDirectory;
    if (dir) {
      const dest = `${dir}${safeName(filename) || 'document'}.pdf`;
      // A previous share of the same document would otherwise block the move.
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: dest });
      target = dest;
    }
  } catch {
    // Keep the original. A worse filename beats no document.
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("This device can't open the share sheet.");
  }
  await Sharing.shareAsync(target, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
