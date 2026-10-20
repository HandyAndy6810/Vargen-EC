/**
 * Mix two #RRGGBB colours: t = 1 gives `a`, t = 0 gives `b`. Pure, so a
 * gradient built from theme tokens follows any future change to them.
 */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string) => {
    const s = h.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new Error(`mixHex wants #RRGGBB, got ${h}`);
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const k = Math.min(1, Math.max(0, t));
  const [ca, cb] = [parse(a), parse(b)];
  return '#' + ca
    .map((v, i) => Math.round(v * k + cb[i] * (1 - k)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}
