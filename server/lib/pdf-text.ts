/**
 * The text of a PDF supplier invoice or receipt (Share to Vargen, step 5).
 * The receipt reader is a vision model and can't open a PDF, but a supplier's
 * PDF invoice almost always carries its text, which the chat model reads with
 * the same instructions. A scan saved as a PDF (pictures only, no text) gives
 * an empty string: the caller says so plainly rather than guessing.
 */
import { extractText, getDocumentProxy } from "unpdf";

/** The most pages read: an invoice is a page or two; this bounds a huge file. */
const MAX_PAGES = 5;
const MAX_CHARS = 12_000;

export async function pdfText(data: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  try {
    const pages = Math.min(pdf.numPages, MAX_PAGES);
    const parts: string[] = [];
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    }
    return parts.join("\n").replace(/[ \t]+/g, " ").trim().slice(0, MAX_CHARS);
  } finally {
    await pdf.destroy?.();
  }
}
