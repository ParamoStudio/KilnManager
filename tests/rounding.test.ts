import { describe, it, expect } from "vitest";
import { splitAmount, roundCents } from "../src/core/rounding.js";

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
