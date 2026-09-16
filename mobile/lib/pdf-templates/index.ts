import { type UserSettings } from '@/hooks/use-settings';
import { type PdfDocumentData, type Ctx, buildCtx } from './shared';
import { buildClassic } from './classic';
import { buildLedger } from './ledger';
import { buildEditorial } from './editorial';
import { buildBold } from './bold';
import { buildModern } from './modern';
import { buildSlate } from './slate';

export type { PdfDocumentData } from './shared';

export type QuoteTemplate = {
  id: string;
  name: string;
  /** One line, shown under the name on the picker. Say who it suits, not how it looks. */
  blurb: string;
  build: (ctx: Ctx) => string;
};

/**
 * Every style a tradie can send. Order is the order they appear in settings, and
 * `classic` is first because it is the default: the safe, expected-looking document
 * that never looks wrong in front of a customer.
 *
 * To add another, write a builder that takes a Ctx and returns a full HTML page via
 * `page()` from ./shared, then add it to this list. Nothing else needs to change —
 * the settings picker, the previews and the PDF export all read from here.
 */
export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'The standard business quote. Plain, familiar, never looks out of place.',
    build: buildClassic,
  },
  {
    id: 'ledger',
    name: 'Ledger',
    blurb: 'Clean and bookkeeping-like. Suits billing other businesses.',
    build: buildLedger,
  },
  {
    id: 'modern',
    name: 'Modern',
    blurb: 'Colour band across the top with your logo. The app’s original style.',
    build: buildModern,
  },
  {
    id: 'bold',
    name: 'Bold',
    blurb: 'Big friendly heading and a logo badge. Good for homeowners.',
    build: buildBold,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    blurb: 'Typographic and high contrast. For trades selling on craft.',
    build: buildEditorial,
  },
  {
    id: 'slate',
    name: 'Slate',
    blurb: 'Formal serif with a colour rail. For larger, considered jobs.',
    build: buildSlate,
  },
];

export const DEFAULT_TEMPLATE_ID = 'classic';

export function getTemplate(id?: string): QuoteTemplate {
  return QUOTE_TEMPLATES.find(t => t.id === id)
    ?? QUOTE_TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID)!;
}

/** Render a document in whichever style the tradie has chosen. */
export function buildDocument(data: PdfDocumentData, settings: Partial<UserSettings>): string {
  const ctx = buildCtx(data, settings);
  return getTemplate((settings as UserSettings)?.quoteTemplate).build(ctx);
}

/** Render a document in one specific style, ignoring the setting. Used by the picker. */
export function buildDocumentWith(
  templateId: string,
  data: PdfDocumentData,
  settings: Partial<UserSettings>,
): string {
  return getTemplate(templateId).build(buildCtx(data, settings));
}

/** A4 at 96dpi, in CSS pixels — 210mm wide by 297mm tall. */
export const A4_PX = { width: 793.7, height: 1122.5 } as const;

/**
 * Shrink a rendered page so it can sit in a card as a live thumbnail.
 *
 * Scaling the real HTML rather than drawing a mock-up means a thumbnail can never
 * drift from what actually gets sent — change a template and its preview changes
 * with it. `page()` always emits exactly one `</style>`, so appending the override
 * there lands it last and wins.
 */
export function thumbnailHtml(html: string, scale: number): string {
  const override = `
  html, body { width: ${A4_PX.width}px; overflow: hidden; }
  body { transform: scale(${scale}); transform-origin: 0 0; }
  `;
  return html.replace('</style>', `${override}</style>`);
}

/**
 * A believable job for the style previews. Real enough that each template is judged
 * on how it handles actual content — a long description that wraps, a fractional
 * labour quantity, a GST line — rather than on placeholder text.
 */
export function sampleDocument(type: 'quote' | 'invoice' = 'quote'): PdfDocumentData {
  const subtotal = 2480;
  const gst = 248;
  return {
    documentType: type,
    documentNumber: type === 'invoice' ? 'INV-0042' : 'Q-0042',
    createdAt: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    dueDate: new Date(Date.now() + 14 * 864e5).toISOString(),
    status: 'sent',
    jobTitle: 'Bathroom renovation — waterproofing and tiling',
    summary:
      'Strip existing floor and wall tiles, make good the substrate, apply two-coat '
      + 'waterproof membrane to AS 3740, then supply and lay 300x600 porcelain tiles to '
      + 'floor and walls. Includes silicone sealing and site clean-up on completion.',
    customerName: 'Sarah Whitfield',
    customerAddress: '14 Beaumont Street, Hamilton NSW 2303',
    customerPhone: '0412 345 678',
    customerEmail: 'sarah.whitfield@example.com',
    items: [
      { description: 'Waterproof membrane, two coats to AS 3740', quantity: 18, unit: 'm²', unitPrice: 42 },
      { description: '300x600 porcelain floor and wall tiles', quantity: 26, unit: 'm²', unitPrice: 38 },
      { description: 'Tile adhesive, grout and silicone', quantity: 1, unit: 'lot', unitPrice: 180 },
      { description: 'Labour — strip out, prepare, waterproof and tile', quantity: 16, unit: 'hr', unitPrice: 55 },
      { description: 'Waste removal and tip fees', quantity: 1, unit: 'lot', unitPrice: 140 },
    ],
    notes:
      'Price assumes the existing substrate is sound. Any rot or movement found once the '
      + 'old tiles are off will be quoted separately before work continues.',
    subtotal,
    gstAmount: gst,
    totalAmount: subtotal + gst,
    includeGST: true,
  };
}
