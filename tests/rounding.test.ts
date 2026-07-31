import { describe, it, expect } from "vitest";
import { splitAmount, roundCents, roundUpInvoice } from "../src/core/rounding.js";

describe("roundUpInvoice", () => {
  it("rounds up to the next 20 cents", () => {
    expect(roundUpInvoice(10.98)).toBe(11);
    expect(roundUpInvoice(10.12)).toBe(10.2);
    expect(roundUpInvoice(29.07)).toBe(29.2);
    expect(roundUpInvoice(13.47)).toBe(13.6);
  });

  it("leaves an amount that's already there alone", () => {
    expect(roundUpInvoice(10.2)).toBe(10.2);
    expect(roundUpInvoice(30)).toBe(30);
    // 0.20 x 3 is not exactly 0.60 in binary; it must not creep to 0.80.
    expect(roundUpInvoice(0.6)).toBe(0.6);
    expect(roundUpInvoice(2.4)).toBe(2.4);
  });

  it("never rounds down — the invoice can't come in under cost", () => {
    for (const n of [0.01, 5.19, 5.21, 99.99]) {
      expect(roundUpInvoice(n)).toBeGreaterThanOrEqual(n);
    }
  });

  it("never overcharges by more than the step", () => {
    for (const n of [0.01, 7.03, 12.81, 45.99]) {
      expect(roundUpInvoice(n) - n).toBeLessThan(0.2);
    }
  });

  it("returns clean cents, not floating-point dust", () => {
    for (const n of [1.05, 7.77, 19.99]) {
      const r = roundUpInvoice(n);
      expect(Number(r.toFixed(2))).toBe(r);
    }
  });
});

describe("splitAmount", () => {
  it("parts always sum exactly to the total", () => {
    const parts = splitAmount(100, [1, 1, 1]); // 33.33 + 33.33 + 33.34
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("handles a nasty three-way split", () => {
    const parts = splitAmount(94, [13.069, 21.677, 6.283, 15.08]);
    expect(roundCents(parts.reduce((a, b) => a + b, 0))).toBe(94);
    parts.forEach((p) => expect(Number.isFinite(p)).toBe(true));
  });

  it("zero weights → all zero", () => {
    expect(splitAmount(50, [0, 0])).toEqual([0, 0]);
  });

  it("empty → empty", () => {
    expect(splitAmount(50, [])).toEqual([]);
  });
});
