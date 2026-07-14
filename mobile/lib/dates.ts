/**
 * Strict YYYY-MM-DD validation. `new Date()` alone is too lenient — V8
 * accepts "15/3/26" and rolls impossible dates like 2026-02-30 forward,
 * so we round-trip the components to make sure the date really exists.
 */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
