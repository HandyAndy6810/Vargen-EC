/**
 * The cost recorded on an AI-generated hourly labour line, whose price is always the
 * tradie's charge-out rate.
 *
 * - Labour marked up (cost-plus, "Mark up labour too"): the rate is the cost, as it
 *   always was, so the markup has something to apply to.
 * - Otherwise: "What an hour costs you" when set and no more than the rate, else
 *   unknown (null) — an uncosted line, not the charge-out rate posing as a cost.
 *
 * The unknown case is also what keeps phones on builds from before the setting safe:
 * they send neither field, and their money code marks up any labour line that HAS a
 * cost, but prices one without a cost at its price, i.e. the charge-out rate.
 */
export function labourLineCost(opts: {
  rate: number | null;
  markupLabour: boolean;
  costRate: number | null;
}): number | null {
  const { rate, markupLabour, costRate } = opts;
  if (rate == null) return null;
  if (markupLabour) return rate;
  return costRate != null && costRate > 0 && costRate <= rate ? costRate : null;
}
