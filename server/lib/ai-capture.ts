/**
 * Capturing AI quote generations (the ai_generations table): what was asked and
 * what came back, so it can later be compared with what the tradie actually sent.
 *
 * Capture is a side record. It must never cost the tradie a quote: a failed write
 * is logged and the generation is returned as normal, just without an id.
 */

const MAX_DRAFT_KEY = 100;

/**
 * The request as worth keeping: the description and the pricing settings it was
 * priced under, plus any clarify answers. Built from an allowlist, so an image
 * (imageBase64) or anything else the phone sends is never stored.
 */
export function generationInput(body: Record<string, unknown> | null | undefined): string {
  const b = body ?? {};
  const pick = (k: string) => (b[k] === undefined ? undefined : b[k]);
  return JSON.stringify({
    description: pick('description'),
    tradeType: pick('tradeType'),
    chargeOutRate: pick('labourRate'),
    markupPercent: pick('markupPercent'),
    markupLabour: pick('markupLabour'),
    labourCostRate: pick('labourCostRate'),
    callOutFee: pick('callOutFee'),
    includeGST: pick('includeGST'),
    targetPrice: pick('targetPrice'),
    clarifyAnswers: Array.isArray(b.clarifyAnswers) ? b.clarifyAnswers : undefined,
    hadImage: typeof b.imageBase64 === 'string' && b.imageBase64.length > 0,
  });
}

/** A usable draft key from the phone, or null. */
export function cleanDraftKey(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX_DRAFT_KEY) : null;
}

/** A positive integer generation id from a save body, or null. */
export function cleanGenerationId(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Run the insert; return the new row's id, or null if it failed for any reason.
 * Never throws.
 */
export async function captureGeneration(
  insert: () => Promise<{ id: number } | undefined>,
  log: (msg: string, err: unknown) => void = (m, e) => console.error(m, e),
): Promise<number | null> {
  try {
    const row = await insert();
    return row?.id ?? null;
  } catch (err) {
    log('[ai capture] could not record the generation (the quote was still returned):', err);
    return null;
  }
}
