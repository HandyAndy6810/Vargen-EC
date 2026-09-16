/**
 * A last line of defence against an AI-invented price.
 *
 * The model has no source of truth for what anything costs — it reproduces
 * plausible-looking numbers from training data that is global, dated, and not
 * Australian trade supply. That is how a 5L bucket of paint came back at $20 when
 * it is nearer $150. The tradie's own price book is the real fix; this is what
 * catches the absurd cases in the meantime, and it works on day one with no data.
 *
 * DESIGN RULE, and the important one: these are ABSURDITY bands, not price guidance.
 * They are deliberately far too wide to be useful as an estimate. Their whole job is
 * to catch a figure that is wrong by an order of magnitude and say so. A band that
 * fires on ordinary variation is worse than no band at all, because a tradie who
 * sees warnings on every quote stops reading warnings. When in doubt, widen it or
 * leave the item out.
 *
 * Nothing here blocks a save. A tradie quoting a genuinely odd job is right and this
 * file is wrong, so the only outcome is a visible note on Review.
 */

export type PriceBand = {
  id: string;
  /** Used in the message: "paint is usually $8–$70 per litre". */
  label: string;
  match: RegExp;
  /** Guards against a near-miss, e.g. a paint BRUSH matching /paint/. */
  exclude?: RegExp;
  /**
   * When set, the band is per this base unit and the line's price is divided by the
   * pack size read out of its description — so a "5L" tin is judged per litre.
   */
  perBase?: 'L' | 'kg' | 'm' | 'm2';
  /** Only applies when the line's unit is one of these. Omit to apply to any unit. */
  units?: string[];
  min: number;
  max: number;
};

/**
 * Bands worth having are ones where being an order of magnitude out is obvious and
 * common. Adding more is cheap — but re-read the design rule first.
 */
export const PRICE_BANDS: PriceBand[] = [
  {
    id: 'labour-hourly',
    label: 'trade labour',
    match: /\b(labour|labor|install|installation|fit|fitting|fix|removal|remove|strip|demolition|demo|make good|clean ?up|cleanup|prep|preparation)\b/,
    units: ['hr', 'hrs', 'hour', 'hours'],
    min: 35,
    max: 250,
  },
  {
    id: 'paint',
    label: 'paint',
    match: /\b(paint|primer|undercoat|sealer|enamel)\b/,
    exclude: /\b(brush|roller|tray|tape|drop ?sheet|scraper|stirrer|thinner|remover|strip)\b/,
    perBase: 'L',
    min: 8,
    max: 70,
  },
  {
    id: 'tiles',
    label: 'floor or wall tiles',
    match: /\btiles?\b/,
    exclude: /\b(adhesive|grout|spacer|trim|cutter|remove|removal|lay|laying)\b/,
    units: ['m2', 'm²', 'sqm', 'sq m'],
    min: 15,
    max: 400,
  },
  {
    id: 'timber-flooring',
    label: 'timber flooring',
    match: /\b(floorboard|flooring|hardwood|laminate)\b/,
    exclude: /\b(remove|removal|underlay|adhesive|lay|laying|sand|polish)\b/,
    units: ['m2', 'm²', 'sqm', 'sq m'],
    min: 25,
    max: 400,
  },
  {
    id: 'copper-pipe',
    label: 'copper pipe',
    match: /\bcopper\b.*\b(pipe|tube|tubing)\b|\b(pipe|tube)\b.*\bcopper\b/,
    perBase: 'm',
    min: 8,
    max: 90,
  },
  {
    id: 'downlight',
    label: 'a downlight',
    match: /\b(downlight|down light|led light fitting)\b/,
    exclude: /\b(remove|removal|install only)\b/,
    units: ['ea', 'each', 'unit', 'units', ''],
    min: 8,
    max: 200,
  },
  {
    id: 'power-point',
    label: 'a power point',
    match: /\b(gpo|power ?point|powerpoint|socket outlet)\b/,
    units: ['ea', 'each', 'unit', 'units', ''],
    min: 4,
    max: 120,
  },
  {
    id: 'plasterboard',
    label: 'plasterboard',
    match: /\b(plasterboard|gyprock|villaboard|plaster sheet)\b/,
    exclude: /\b(screw|adhesive|stopping|cornice|tape|patch)\b/,
    units: ['ea', 'each', 'sheet', 'sheets'],
    min: 12,
    max: 120,
  },
  {
    id: 'waterproof-membrane',
    label: 'waterproofing',
    match: /\b(waterproof|membrane|ardex|mapei)\b/,
    units: ['m2', 'm²', 'sqm', 'sq m'],
    min: 15,
    max: 150,
  },
  {
    id: 'skip-bin',
    label: 'a skip bin',
    match: /\b(skip ?bin|skip|tip fee|waste removal|rubbish removal|disposal)\b/,
    units: ['ea', 'each', 'lot', 'job', ''],
    min: 60,
    max: 1200,
  },
];

const UNIT_ALIASES: Record<string, string> = {
  'm²': 'm2', 'sqm': 'm2', 'sq m': 'm2', 'square metre': 'm2', 'square meter': 'm2',
  hrs: 'hr', hour: 'hr', hours: 'hr', each: 'ea', unit: 'ea', units: 'ea', pc: 'ea', pcs: 'ea',
  litre: 'l', litres: 'l', liter: 'l', liters: 'l',
};

function normUnit(unit: unknown): string {
  const u = String(unit ?? '').trim().toLowerCase();
  return UNIT_ALIASES[u] ?? u;
}

function normDesc(d: unknown): string {
  return String(d ?? '').toLowerCase().replace(/[‑–—]/g, '-').replace(/\s+/g, ' ').trim();
}

/**
 * Read a pack size out of a description: "5L bucket" → 5 litres, "20kg bag" → 20kg,
 * "2.7m length" → 2.7m. Returns null when there is nothing to find, in which case a
 * per-base band simply does not apply — guessing a pack size would be exactly the
 * kind of invention this file exists to catch.
 */
export function packSizeOf(description: unknown, base: 'L' | 'kg' | 'm' | 'm2'): number | null {
  const d = normDesc(description);
  const patterns: Record<string, RegExp> = {
    L: /(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|litre|litres|liter|liters)\b/,
    kg: /(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|kilogram|kilograms)\b/,
    m: /(\d+(?:\.\d+)?)\s*(?:m|metre|metres|meter|meters)\b(?!\s*2|²)/,
    m2: /(\d+(?:\.\d+)?)\s*(?:m2|m²|sqm|square metres?)\b/,
  };
  const m = d.match(patterns[base]);
  if (!m) return null;
  const size = parseFloat(m[1]);
  return Number.isFinite(size) && size > 0 ? size : null;
}

export type PriceFlag = {
  bandId: string;
  /** A whole sentence, ready to show. Written for a tradie, not a developer. */
  message: string;
  /** 'low' matters far more than 'high' — it is the one that loses them money. */
  direction: 'low' | 'high';
};

const fmt = (n: number) =>
  n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;

/**
 * Check one line against the bands. Returns null when nothing looks wrong, which is
 * the overwhelmingly common case — most lines match no band at all, and a line that
 * matches one is usually inside it.
 */
export function checkLinePrice(input: {
  description: unknown;
  unitPrice: unknown;
  unit?: unknown;
}): PriceFlag | null {
  const price = Number(input.unitPrice);
  if (!Number.isFinite(price) || price <= 0) return null;

  const desc = normDesc(input.description);
  if (!desc) return null;
  const unit = normUnit(input.unit);

  for (const band of PRICE_BANDS) {
    if (!band.match.test(desc)) continue;
    if (band.exclude?.test(desc)) continue;
    if (band.units && !band.units.map(normUnit).includes(unit)) continue;

    let value = price;
    let per = '';

    if (band.perBase) {
      const size = packSizeOf(desc, band.perBase);
      if (size === null) continue; // No pack size to divide by — do not guess.
      value = price / size;
      per = ` per ${band.perBase === 'm2' ? 'm²' : band.perBase.toLowerCase()}`;
    } else if (unit) {
      per = ` per ${input.unit}`;
    }

    if (value < band.min) {
      return {
        bandId: band.id,
        direction: 'low',
        message:
          `That works out at about ${fmt(value)}${per}. ${band.label} is usually ` +
          `${fmt(band.min)}–${fmt(band.max)}${per}, so this looks too low — check it before you send.`,
      };
    }
    if (value > band.max) {
      return {
        bandId: band.id,
        direction: 'high',
        message:
          `That works out at about ${fmt(value)}${per}. ${band.label} is usually ` +
          `${fmt(band.min)}–${fmt(band.max)}${per}, so this looks high — worth a second look.`,
      };
    }
    return null; // Matched a band and sat inside it.
  }

  return null;
}
