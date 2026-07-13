import { describe, it, expect } from "vitest";
import { validateFiring } from "../src/core/validation.js";
import type { Firing, KilnProfile } from "../src/core/types.js";

const kiln: KilnProfile = {
  id: "k1",
  name: "Test kiln",
  shape: "cylinder",
  diameterCm: 40,
  usableHeightCm: 62,
  defaultShelfThicknessCm: 1.5,
  standardPostHeightsCm: [],
  services: [],
  defaultCostItems: [],
};

const base: Firing = {
  kiln,
  serviceBasePrice: 90,
  modifiers: [],
  costItems: [],
  partners: [],
  levels: [],
};

describe("validateFiring", () => {
  it("flags an overfilled shelf", () => {
    const f: Firing = {
      ...base,
      levels: [
        {
          supportHeightCm: 8.5,
          shelfThicknessCm: 1.5,
          allocations: [
            { contactName: "A", fraction: 0.6, complexity: 1 },
            { contactName: "B", fraction: 0.6, complexity: 1 },
          ],
        },
      ],
    };
    expect(validateFiring(f).some((i) => i.level === "error" && /overfilled/.test(i.message))).toBe(true);
  });

  it("accepts a shelf that sums to exactly 100%", () => {
    const f: Firing = {
      ...base,
      levels: [
        {
          supportHeightCm: 8.5,
          shelfThicknessCm: 1.5,
          allocations: [
            { contactName: "A", fraction: 0.5, complexity: 1 },
            { contactName: "B", fraction: 0.5, complexity: 1 },
          ],
        },
      ],
    };
    expect(validateFiring(f).some((i) => /overfilled/.test(i.message))).toBe(false);
  });

  it("flags an overstacked kiln", () => {
    const f: Firing = {
      ...base,
      levels: Array.from({ length: 8 }, () => ({
        supportHeightCm: 8.5,
        shelfThicknessCm: 1.5,
        allocations: [{ contactName: "A", fraction: 1, complexity: 1 }],
      })),
    };
    expect(validateFiring(f).some((i) => /usable/.test(i.message))).toBe(true);
  });

  it("flags partner cuts over 100%", () => {
    const f: Firing = { ...base, partners: [{ name: "X", pct: 0.7 }, { name: "Y", pct: 0.5 }] };
    expect(validateFiring(f).some((i) => /Partner cuts/.test(i.message))).toBe(true);
  });
});
