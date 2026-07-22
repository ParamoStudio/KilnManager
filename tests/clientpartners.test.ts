import { describe, it, expect } from "vitest";
import { computeAccounting } from "../src/core/engine.js";
import type { ClientResult, Firing, KilnProfile } from "../src/core/types.js";

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

/**
 * A guest studio brought Rosa but has nothing to do with Marc. 100 € collected,
 * 20 € of kiln costs, split evenly by load: each client's profit is
 * 50 − 10 = 40 €, so a 30% cut on Rosa alone is 12 €.
 */
const base: Firing = {
  kiln,
  serviceBasePrice: 100,
  modifiers: [],
  levels: [],
  costItems: [{ name: "Propane", amount: 20, kind: "variable" }],
  partners: [],
};

const clients: ClientResult[] = [
  { contactName: "Rosa", liters: 10, klu: 10, sharePct: 0.5, price: 50, charged: true },
  { contactName: "Marc", liters: 10, klu: 10, sharePct: 0.5, price: 50, charged: true },
];

describe("per-client partner cuts", () => {
  it("takes the cut from that client's profit only", () => {
    const acc = computeAccounting(100, { ...base, clientPartners: { Rosa: [{ name: "Guest studio", pct: 0.3 }] } }, clients);
    expect(acc.partnerCuts).toHaveLength(1);
    expect(acc.partnerCuts[0]!.amount).toBe(12);
    expect(acc.partnerCuts[0]!.client).toBe("Rosa");
    // The firing made 80 of profit; the studio keeps all but Rosa's 12.
    expect(acc.grossProfit).toBe(80);
    expect(acc.netToYou).toBe(68);
  });

  it("is smaller than the same percentage taken firing-wide", () => {
    const perClient = computeAccounting(100, { ...base, clientPartners: { Rosa: [{ name: "Guest", pct: 0.3 }] } }, clients);
    const wholeFiring = computeAccounting(100, { ...base, partners: [{ name: "Guest", pct: 0.3 }] }, clients);
    expect(wholeFiring.partnerCuts[0]!.amount).toBe(24); // 30% of all 80
    expect(perClient.partnerCuts[0]!.amount).toBe(12); // 30% of Rosa's 40
  });

  it("charges the client their share of the kiln's costs, not the whole bill", () => {
    // Rosa fills a quarter of the kiln but pays 50: her cost share is 5, not 20.
    const uneven: ClientResult[] = [
      { contactName: "Rosa", liters: 5, klu: 5, sharePct: 0.25, price: 50, charged: true },
      { contactName: "Marc", liters: 15, klu: 15, sharePct: 0.75, price: 50, charged: true },
    ];
    const acc = computeAccounting(100, { ...base, clientPartners: { Rosa: [{ name: "Guest", pct: 0.5 }] } }, uneven);
    expect(acc.partnerCuts[0]!.amount).toBe(22.5); // 50% of (50 − 5)
  });

  it("stacks a firing-wide partner and a per-client one without confusing them", () => {
    const acc = computeAccounting(
      100,
      {
        ...base,
        partners: [{ name: "Landlord", pct: 0.1 }],
        clientPartners: { Rosa: [{ name: "Guest", pct: 0.3 }] },
      },
      clients,
    );
    expect(acc.partnerCuts).toEqual([
      { name: "Landlord", pct: 0.1, amount: 8 },
      { name: "Guest", pct: 0.3, amount: 12, client: "Rosa" },
    ]);
    expect(acc.netToYou).toBe(60);
  });

  it("gives an uncharged (studio's own) client's partner nothing to take", () => {
    const own: ClientResult[] = [
      { contactName: "Myself", liters: 10, klu: 10, sharePct: 0.5, price: 0, charged: false },
      { contactName: "Marc", liters: 10, klu: 10, sharePct: 0.5, price: 50, charged: true },
    ];
    const acc = computeAccounting(50, { ...base, clientPartners: { Myself: [{ name: "Guest", pct: 0.3 }] } }, own);
    // Half the costs against no revenue: a loss, and a partner doesn't take a
    // cut of a loss — they'd be *paid* for it.
    expect(acc.partnerCuts[0]!.amount).toBe(0);
  });

  it("behaves exactly as before when nobody uses the feature", () => {
    const acc = computeAccounting(100, { ...base, partners: [{ name: "Studio", pct: 0.2 }] }, clients);
    expect(acc.partnerCuts).toEqual([{ name: "Studio", pct: 0.2, amount: 16 }]);
    expect(acc.netToYou).toBe(64);
  });
});
