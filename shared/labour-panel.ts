/**
 * The Labour card on quote Review (mobile/app/quotes/create/review.tsx):
 * Hours × rate = hourly labour, with flat labour lines (a call-out fee, a lump
 * sum priced "each") shown separately.
 *
 * Two bugs lived here before (docs/pricing-design.md → "Maths bugs to fix now"):
 *  - Hours added up the quantity of EVERY labour line, so a $150 call-out fee
 *    (qty 1, unit "ea") read as an extra hour.
 *  - The rate came from labour[0], the first labour line, which could be that
 *    flat fee: the card showed $150/hr, and typing a rate wrote it over the fee.
 *
 * Only lines whose unit is hours are hourly. Pure, no imports, tested in
 * labour-panel.test.ts.
 */

export type PanelLine = {
  name: string;
  qty: string;
  price: string;
  unit?: string;
  cost?: string;
  category?: 'labour' | 'material';
};

/** The units that mean "per hour". Shared with the server's labour-rate rule. */
export const HOURLY_UNITS = ['hr', 'hrs', 'hour', 'hours'] as const;

export function isHourlyUnit(unit: unknown): boolean {
  return (HOURLY_UNITS as readonly string[]).includes(String(unit ?? '').trim().toLowerCase());
}

export const isHourlyLabour = (l: PanelLine) => l.category === 'labour' && isHourlyUnit(l.unit);
export const isFlatLabour = (l: PanelLine) => l.category === 'labour' && !isHourlyUnit(l.unit);

const n = (v: unknown) => {
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};

/**
 * What the card shows. `rateField` is 'price' (the charge-out rate, what the
 * customer pays) or 'cost' (when "Mark up labour too" is on). The rate is the
 * hourly lines' rate (the first hourly line with one; the panel keeps them all
 * equal), else the rate from settings.
 */
export function labourPanel<L extends PanelLine>(
  lines: L[],
  opts: { rateField: 'price' | 'cost'; settingsRate?: number | null },
): { hourly: L[]; flat: L[]; hours: number; rate: number } {
  const hourly = lines.filter(isHourlyLabour);
  const flat = lines.filter(isFlatLabour);
  const hours = Math.round(hourly.reduce((sum, l) => sum + n(l.qty), 0) * 100) / 100;
  const withRate = hourly.find((l) => n(l[opts.rateField]) > 0);
  const fallback = typeof opts.settingsRate === 'number' && Number.isFinite(opts.settingsRate) ? opts.settingsRate : 0;
  return { hourly, flat, hours, rate: withRate ? n(withRate[opts.rateField]) : fallback };
}

/** Typing a rate sets it on the hourly lines only. Flat lines keep their price. */
export function applyLabourRate<L extends PanelLine>(lines: L[], rateField: 'price' | 'cost', raw: string): L[] {
  const rate = parseFloat(raw);
  const value = Number.isFinite(rate) ? String(rate) : '';
  return lines.map((l) => (isHourlyLabour(l) ? { ...l, [rateField]: value } : l));
}

/**
 * Typing hours scales the hourly lines in proportion, so the split between them
 * holds. Flat lines are untouched. With no hourly hours yet, the hours go on the
 * first hourly line; with no hourly line at all, `makeLine` adds one (at `rate`).
 */
export function applyLabourHours<L extends PanelLine>(
  lines: L[],
  raw: string,
  opts: { rate: number; rateField: 'price' | 'cost'; makeLine: (hours: string, rate: string) => L },
): L[] {
  const next = parseFloat(raw);
  if (!Number.isFinite(next) || next < 0) return lines;
  const hourly = lines.filter(isHourlyLabour);
  if (!hourly.length) {
    return next > 0 ? [...lines, opts.makeLine(String(next), String(opts.rate))] : lines;
  }
  const current = hourly.reduce((sum, l) => sum + n(l.qty), 0);
  if (current <= 0) {
    const first = hourly[0];
    return lines.map((l) => (l === first ? { ...l, qty: String(next) } : l));
  }
  return lines.map((l) => {
    if (!isHourlyLabour(l)) return l;
    const share = n(l.qty) / current;
    return { ...l, qty: String(Math.round(next * share * 100) / 100) };
  });
}
