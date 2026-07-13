import { describe, it, expect } from "vitest";
import { computeAccounting } from "../src/core/engine.js";
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

// The real-world example from design: 70€ firing, 15€ costs, 20% to the studio.
describe("accounting — three faces of the ledger", () => {
  const firing: Firing = {
    kiln,
    serviceBasePrice: 70,
    modifiers: [],
    levels: [],
    costItems: [
      { name: "Propane", amount: 8, kind: "variable" },
      { name: "Maintenance reserve", amount: 4, kind: "fixed" },
      { name: "Cones", amount: 3, kind: "fixed" },
    ],
    partners: [{ name: "Studio", pct: 0.2 }],
  };

  const acc = computeAccounting(70, firing);

  it("kiln costs sum to 15", () => {
    expect(acc.kilnCosts).toBe(15);
  });

  it("gross profit = revenue − costs = 55", () => {
    expect(acc.grossProfit).toBe(55);
  });

  it("studio takes 20% of gross = 11", () => {
    expect(acc.partnerCuts[0]!.amount).toBe(11);
  });

  it("net to you = 44", () => {
    expect(acc.netToYou).toBe(44);
  });

  it("no partners → you keep the whole gross", () => {
    const solo = computeAccounting(70, { ...firing, partners: [] });
    expect(solo.netToYou).toBe(55);
  });
});
