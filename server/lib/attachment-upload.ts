/**
 * What may be kept as an attachment (docs/pricing-design.md, step 5): a photo
 * (JPEG, PNG or WebP; the phone re-encodes everything else to JPEG first) or a
 * PDF, up to MAX_ATTACHMENT_BYTES, on exactly one of the tradie's receipts,
 * jobs or quotes. The type comes from the bytes, never from the label.
 */
import { sniffImage } from "./image-type";

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export type AttachmentParent = { receiptId: number } | { jobId: number } | { quoteId: number };

export type ParsedUpload =
  | { ok: true; mimeType: string; fileName: string | null; data: Buffer; parent: AttachmentParent }
  | { ok: false; status: number; message: string };

const posInt = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
};

/** Strip a data URI prefix; null when it isn't base64 at all. */
function base64Body(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  const body = raw.includes(";base64,") ? raw.split(";base64,")[1] : raw;
  return /^[A-Za-z0-9+/=\s]+$/.test(body.slice(0, 200)) ? body.replace(/\s/g, "") : null;
}

export function parseUpload(body: any): ParsedUpload {
  const ids = [["receiptId", posInt(body?.receiptId)], ["jobId", posInt(body?.jobId)], ["quoteId", posInt(body?.quoteId)]] as const;
  const set = ids.filter(([, v]) => v != null);
  if (set.length !== 1) return { ok: false, status: 400, message: "Attach it to one receipt, job or quote." };
  const parent = { [set[0][0]]: set[0][1] } as AttachmentParent;

  const b64 = base64Body(body?.data);
  if (!b64) return { ok: false, status: 400, message: "No file data." };
  // Size before decoding: 4 base64 chars per 3 bytes.
  if (Math.floor((b64.length * 3) / 4) > MAX_ATTACHMENT_BYTES + 3) {
    return { ok: false, status: 413, message: "That file is too big to keep (8 MB at most)." };
  }
  const data = Buffer.from(b64, "base64");
  if (!data.length) return { ok: false, status: 400, message: "No file data." };
  if (data.length > MAX_ATTACHMENT_BYTES) return { ok: false, status: 413, message: "That file is too big to keep (8 MB at most)." };

  let mimeType: string | null = null;
  if (data.subarray(0, 5).toString("latin1") === "%PDF-") mimeType = "application/pdf";
  else {
    const kind = sniffImage(b64.slice(0, 64));
    if (kind === "jpeg") mimeType = "image/jpeg";
    else if (kind === "png") mimeType = "image/png";
    else if (kind === "webp") mimeType = "image/webp";
  }
  if (!mimeType) return { ok: false, status: 415, message: "Vargen can't use this kind of file." };

  const rawName = typeof body?.fileName === "string" ? body.fileName : "";
  // A display name only: no path parts, no control characters.
  const fileName = rawName.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 120) || null;
  return { ok: true, mimeType, fileName, data, parent };
}
