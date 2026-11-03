/**
 * What an AI quote is priced with. The SAVED settings are the source of truth;
 * the request body is only a fallback, for an account with no settings row.
 *
 * The app used to send these from its cached copy of settings, and the server
 * trusted them, so a change could miss the next quote. The AI quoting screen also
 * reset typed values before they were saved. One place, read from the database,
 * means the next quote always uses what was last saved. The resolved values go
 * back to the app with the quote (`pricing`) so the phone prices with the same
 * numbers.
 */

type Saved = {
  tradeType?: string | null;
  labourRate?: number | null;
  markupPercent?: number | null;
  markupLabour?: boolean | null;
  labourCostRate?: number | null;
  callOutFee?: number | null;
  callOutFeeEnabled?: boolean | null;
  includeGST?: boolean | null;
} | null | undefined;

export type PricingInputs = {
  tradeType: string | null;
  /** The charge-out rate, $/hr, or null to let the AI choose. */
  labourRate: number | null;
  markupPercent: number;
  markupLabour: boolean;
  labourCostRate: number | null;
  /** 0 when the call-out fee is switched off. */
  callOutFee: number;
  includeGST: boolean;
};

const pos = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

export function resolvePricingInputs(saved: Saved, body: Record<string, unknown> | null | undefined): PricingInputs {
  const b = body ?? {};
  if (saved) {
    return {
      tradeType: saved.tradeType || null,
      labourRate: pos(saved.labourRate),
      markupPercent: typeof saved.markupPercent === 'number' && saved.markupPercent >= 0 ? saved.markupPercent : 0,
      markupLabour: saved.markupLabour === true,
      labourCostRate: pos(saved.labourCostRate),
      callOutFee: saved.callOutFeeEnabled ? (pos(saved.callOutFee) ?? 0) : 0,
      includeGST: saved.includeGST !== false,
    };
  }
  return {
    tradeType: typeof b.tradeType === 'string' && b.tradeType ? b.tradeType : null,
    labourRate: pos(b.labourRate),
    markupPercent: typeof b.markupPercent === 'number' && b.markupPercent >= 0 ? b.markupPercent : 0,
    markupLabour: b.markupLabour === true,
    labourCostRate: pos(b.labourCostRate),
    // No saved switch to honour: only a fee the app explicitly sent.
    callOutFee: pos(b.callOutFee) ?? 0,
    includeGST: b.includeGST === true,
  };
}

const CALL_OUT = /\b(call[\s-]?out|travel fee|site visit fee|attendance fee)\b/i;

/**
 * Exactly one call-out line at the saved fee, or none when it's off. The prompt
 * asks for this, but a model can skip it, add two, or pick its own price; the
 * tradie's setting shouldn't depend on that. Inserted with no cost (a fee, not
 * marked up) at the top of the materials.
 */
export function enforceCallOut<T extends { description?: unknown }>(items: T[], fee: number): (T | Record<string, unknown>)[] {
  const rest = items.filter((it) => !CALL_OUT.test(String(it?.description ?? '')));
  if (!(fee > 0)) return rest;
  return [
    ...rest,
    { description: 'Call-out fee', quantity: 1, unit: 'each', category: 'material', unitPrice: fee, unitCost: 0, costUnknown: true, noMarkup: false },
  ];
}
