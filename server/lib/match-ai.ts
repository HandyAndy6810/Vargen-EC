/**
 * The matching engine's one AI call (docs/pricing-design.md, step 4): all of a
 * receipt's (or a quote's) unmatched lines in one batch, choosing only from the
 * candidates given. The decisions are made in shared/matcher.ts; this only asks.
 *
 * It must never cost the tradie anything: a failure, a timeout or nonsense back
 * gives "no suggestion" for every line (receipt lines then wait in the "Not
 * sure" list; quote lines stay "estimate").
 */
import { matchPrompt, parseAiMatches, type AiSuggestion, type Candidate, type MatchInput } from "../../shared/matcher";

export type Complete = (system: string, user: string) => Promise<string>;

export const MATCH_TIMEOUT_MS = 12_000;

export async function aiMatchLines(
  complete: Complete,
  lines: MatchInput[],
  candidates: Candidate[],
  opts: { timeoutMs?: number; log?: (msg: string, err?: unknown) => void } = {},
): Promise<(AiSuggestion | undefined)[]> {
  const none = lines.map(() => undefined);
  if (!lines.length || !candidates.length) return none;
  const { system, user } = matchPrompt(lines, candidates);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      complete(system, user),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("match timed out")), opts.timeoutMs ?? MATCH_TIMEOUT_MS); }),
    ]);
    return parseAiMatches(raw, lines.length, candidates.length);
  } catch (err) {
    (opts.log ?? ((m, e) => console.error(m, e)))("[matcher] AI match failed; lines stay unmatched:", err);
    return none;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
