/**
 * Version comparison for the "there's a newer release" check.
 *
 * Pure and separate so it can be tested: the failure mode of getting this
 * wrong is either nagging people who are already up to date, or — worse —
 * staying quiet when they're running something old.
 */

/** True when `b` is a newer version than `a`. Tolerates a leading v. */
export function isNewer(a: string, b: string): boolean {
  const parse = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/i, "")
      .split(/[.-]/)
      .map((n) => parseInt(n, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (y > x) return true;
    if (y < x) return false;
  }
  return false;
}
