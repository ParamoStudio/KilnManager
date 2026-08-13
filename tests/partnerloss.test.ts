import { describe, it, expect } from "vitest";
import { computeAccounting, partnerCut } from "../src/core/engine.js";
import type { ClientResult, Firing, KilnProfile } from "../src/core/types.js";

const kiln: KilnProfile = {
  id: "k1",
  name: "Test kiln",
  shape: "cylinder",
  diameterCm: 42,
  usableHeightCm: 62,
  defaultShelfThicknessCm: 1.5,
  standardPostHeightsCm: [],
  services: [],
  defaultCostItems: [],
};

/**
 * The reported case: a firing loaded 90% with the studio's own work. Only one
 * client pays (6.50) while the kiln costs 21.75, so the firing runs at a loss
 * by design — own work occupies the kiln without paying for it.
 *
 * The app used to give the 30% partner a cut of −4.57, i.e. it claimed the
 * partner owed the studio money and made the loss look 4.57 smaller than it was.
 */
const ownWorkFiring: Firing = {
  kiln,
  serviceBasePrice: 65,
  modifiers: [],
  levels: [],
  costItems: [
    { name: "Propane", amount: 13.75, kind: "variable" },
    { name: "Maintenance reserve", amount: 6, kind: "fixed" },
    { name: "Consumables", amount: 2, kind: "fixed" },
  ],
  partners: [{ name: "Ranxo Taller · Their client", pct: 0.3 }],
};

const clients: ClientResult[] = [
  { contactName: "Ro", liters: 1, klu: 1, sharePct: 0.1, price: 6.5, charged: true },
  { contactName: "Myself", liters: 9, klu: 9, sharePct: 0.9, price: 0, charged: false },
];

describe("a partner never takes a share of a loss", () => {
  it("gives nothing away on a firing the studio loaded for itself", () => {
    const acc = computeAccounting(6.5, ownWorkFiring, clients);
    expect(acc.grossProfit).toBe(-15.25); // the loss is still reported honestly
    expect(acc.partnerCuts[0]!.amount).toBe(0); // …but nobody earns off it
  });

  it("does not flatter the books by subtracting a negative cut", () => {
    const acc = computeAccounting(6.5, ownWorkFiring, clients);
    // Net must equal the real loss, not a loss softened by a phantom debt.
    expect(acc.netToYou).toBe(-15.25);
  });

  it("still pays a partner normally when the firing did make money", () => {
    const profitable = { ...ownWorkFiring, costItems: [{ name: "Propane", amount: 20, kind: "variable" as const }] };
    const acc = computeAccounting(100, profitable, []);
    expect(acc.grossProfit).toBe(80);
    expect(acc.partnerCuts[0]!.amount).toBe(24); // 30% of 80
    expect(acc.netToYou).toBe(56);
  });

  it("applies the same rule to a per-client partner", () => {
    const acc = computeAccounting(
      6.5,
      { ...ownWorkFiring, partners: [], clientPartners: { Myself: [{ name: "Guest", pct: 0.3 }] } },
      clients,
    );
    expect(acc.partnerCuts[0]!.amount).toBe(0);
  });

  it("the rule itself: no negative cut, ever", () => {
    expect(partnerCut(-100, 0.3)).toBe(0);
    expect(partnerCut(-0.01, 0.3)).toBe(0);
    expect(partnerCut(0, 0.3)).toBe(0);
    expect(partnerCut(80, 0.3)).toBe(24);
  });

  it("breaking even gives nothing away either", () => {
    const acc = computeAccounting(21.75, ownWorkFiring, clients);
    expect(acc.grossProfit).toBe(0);
    expect(acc.partnerCuts[0]!.amount).toBe(0);
    expect(acc.netToYou).toBe(0);
  });
});
