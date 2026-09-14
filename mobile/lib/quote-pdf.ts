import { type UserSettings } from '@/hooks/use-settings';
import { buildDocument, type PdfDocumentData } from '@/lib/pdf-templates';

export type { PdfDocumentData } from '@/lib/pdf-templates';

/**
 * A4 in PostScript points, which is what expo-print measures pages in.
 * 210mm x 297mm at 72dpi = 595.28 x 841.89.
 *
 * The CSS `@page { size: A4 }` in every template should be enough on its own, but
 * passing the size to printToFileAsync as well means a PDF comes out A4 even where
 * the print engine ignores the CSS and falls back to US Letter — which is the
 * default on a lot of systems and is both wider and shorter than A4.
 */
export const A4_PRINT = { width: 595.28, height: 841.89 } as const;

/**
 * Render a quote or invoice to HTML in whichever style the tradie has chosen in
 * Settings → Quote styling.
 *
 * The styles themselves live in `lib/pdf-templates/`. This stays as the single entry
 * point the rest of the app calls, so adding or changing a style never touches a
 * screen. See `lib/pdf-templates/index.ts` for the registry and how to add one.
 */
export function buildQuotePDF(data: PdfDocumentData, settings: Partial<UserSettings>): string {
  return buildDocument(data, settings);
}
