/** Round a money amount to whole cents. */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Split `total` money among `weights` so the parts sum EXACTLY to `total`
 * (to the cent), using the largest-remainder method. Essential for receipts:
 * the client prices must add up to the invoiced amount with no rounding drift.
 */
export function splitAmount(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) return weights.map(() => 0);

  const totalCents = Math.round(total * 100);
  const raw = weights.map((w) => (totalCents * w) / sumW);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);

  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  const cents = floors.slice();
  for (let k = 0; k < remainder && k < n; k++) {
    cents[byFrac[k]!.i]! += 1;
  }
  return cents.map((c) => c / 100);
}
