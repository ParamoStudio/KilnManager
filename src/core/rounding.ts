/** Round a money amount to whole cents. */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Round a money amount UP to the next 20 cents — the client-facing figure.
 *
 * Always up, so a rounded invoice never comes in under what the firing cost.
 * Twenty rather than fifty because the step is the most anyone can be
 * overcharged by: at 50 it could be 49 cents, which stops being a tidy-up and
 * starts being a surcharge. 10.98 → 11.00, 10.12 → 10.20.
 *
 * The epsilon stops a value that is already a clean multiple from being pushed
 * to the next one by floating-point noise (0.20 × 3 is not exactly 0.60).
 */
export const INVOICE_STEP = 0.2;

export function roundUpInvoice(n: number): number {
  return roundCents(Math.ceil(n / INVOICE_STEP - 1e-9) * INVOICE_STEP);
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
