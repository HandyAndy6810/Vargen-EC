import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Longest side, in pixels. Enough for the small print on a long receipt. */
const MAX_SIDE = 2048;

/**
 * Turn whatever the camera or photo library gave us into a JPEG the receipt
 * reader can read, as a data URI.
 *
 * iPhones save photos as HEIC by default, and the picker's base64 was sent
 * labelled as JPEG regardless — so the AI provider rejected it as "invalid
 * image data" and every scan failed. Re-encoding here makes it a real JPEG
 * whatever the phone stored, with no setting for the user to change. It also
 * shrinks a 12-megapixel photo to a sensible size, which uploads faster on a
 * weak signal and costs less to read. Never enlarges a smaller photo.
 */
export async function receiptImageDataUri(asset: { uri: string; width?: number; height?: number }): Promise<string> {
  const w = asset.width ?? 0;
  const h = asset.height ?? 0;
  const longest = Math.max(w, h);
  const actions = longest > MAX_SIDE
    ? [{ resize: h >= w ? { height: MAX_SIDE } : { width: MAX_SIDE } }]
    : [];
  const out = await manipulateAsync(asset.uri, actions, {
    compress: 0.75,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) throw new Error('Could not prepare the photo');
  return `data:image/jpeg;base64,${out.base64}`;
}
