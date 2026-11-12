import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { receiptImageDataUri } from './receipt-image';
import type { LocalFile } from './share-handoff';

/**
 * Shared files, kept where the app owns them (Share to Vargen, step 5).
 *
 * What a share hands over lives in places the app doesn't control (the iOS App
 * Group, Android's cache) and may be cleared. A share the tradie decides to keep
 * for later (no signal) must survive the app closing, so it's copied into the
 * app's documents folder first, and deleted once it's been used.
 */

const DIR = `${FileSystem.documentDirectory ?? ''}shared/`;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif', 'image/webp': 'webp',
  'application/pdf': 'pdf', 'text/vcard': 'vcf', 'text/x-vcard': 'vcf', 'text/plain': 'txt',
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Android hands some files over as plain paths; FileSystem wants file:// URIs. */
const asUri = (path: string) => (/^[a-z]+:\/\//i.test(path) ? path : `file://${path}`);

export async function keepSharedFile(file: { path: string; mimeType: string; fileName?: string | null }): Promise<LocalFile> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const ext = EXT[file.mimeType?.toLowerCase()] ?? (String(file.fileName ?? '').split('.').pop() || 'bin');
  const to = `${DIR}${uid()}.${ext.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin'}`;
  await FileSystem.copyAsync({ from: asUri(file.path), to });
  return { uri: to, mimeType: file.mimeType, fileName: file.fileName ?? null };
}

export async function forgetFiles(files: LocalFile[]): Promise<void> {
  await Promise.all(files.map((f) => (f.uri.startsWith(DIR) ? FileSystem.deleteAsync(f.uri, { idempotent: true }).catch(() => {}) : null)));
}

/** A photo as a JPEG data URI (re-encoded and shrunk, as the receipt scanner does). */
export async function photoDataUri(file: LocalFile): Promise<string> {
  // The scanner shrinks by the longest side, which it needs to know.
  const size = await new Promise<{ width: number; height: number }>((resolve) =>
    Image.getSize(file.uri, (width, height) => resolve({ width, height }), () => resolve({ width: 0, height: 0 })));
  return receiptImageDataUri({ uri: file.uri, ...size });
}

/** A PDF (or any file) as base64. */
export async function fileBase64(file: LocalFile): Promise<string> {
  return FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
}

/** A contact card's text. */
export async function fileText(file: LocalFile): Promise<string> {
  return FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
}

/** The data for an attachment upload: photos re-encoded to JPEG, PDFs as they are. */
export async function attachmentData(file: LocalFile): Promise<string> {
  return file.mimeType === 'application/pdf' ? fileBase64(file) : photoDataUri(file);
}
