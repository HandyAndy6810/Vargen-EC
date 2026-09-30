/**
 * Pull the JSON object out of a model's reply.
 *
 * Asked for JSON, models still wrap it: in ```json fences, in a sentence of
 * preamble, or — reasoning models — after a <think>…</think> block of working.
 * A plain JSON.parse of the whole reply fails on all of those, and the receipt
 * scanner used to treat that failure as an empty receipt: $0, no vendor, and
 * no sign anything had gone wrong.
 *
 * Returns the parsed object, or null when there isn't one to find.
 */
export function extractJsonObject(raw: unknown): Record<string, any> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  let text = raw
    // Reasoning, closed or cut off by the token limit.
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();

  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : null;
    } catch {
      return null;
    }
  };

  const whole = tryParse(text);
  if (whole) return whole;

  // Otherwise the outermost {...}: from the first opening brace to the last
  // closing one, which skips any prose either side.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  text = text.slice(start, end + 1);
  return tryParse(text);
}

/** A receipt total the scanner can trust: a finite, positive number of dollars. */
export function receiptTotal(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
