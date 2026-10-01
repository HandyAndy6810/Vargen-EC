/**
 * What an image really is, from its first bytes — not from the label it came
 * with. The app labelled every receipt photo "image/jpeg", but an iPhone saves
 * HEIC by default, so the AI provider got HEIC bytes called JPEG and rejected
 * them as "invalid image data". Builds with the fix re-encode to JPEG before
 * upload; this keeps older builds and the web pages from failing silently.
 */
export type ImageKind = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'unknown';

/** Formats the vision models accept inline. */
const MIME: Partial<Record<ImageKind, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function sniffImage(base64: string): ImageKind {
  let b: Buffer;
  try {
    b = Buffer.from(base64.slice(0, 64), 'base64');
  } catch {
    return 'unknown';
  }
  if (b.length < 12) return 'unknown';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'gif';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(b.toString('latin1', 8, 12))) {
    return 'heic';
  }
  return 'unknown';
}

/** The data URI to send, labelled by what the bytes are, or null if unsupported. */
export function imageDataUri(base64: string): { uri: string; kind: ImageKind } | { uri: null; kind: ImageKind } {
  const kind = sniffImage(base64);
  const mime = MIME[kind];
  return mime ? { uri: `data:${mime};base64,${base64}`, kind } : { uri: null, kind };
}
