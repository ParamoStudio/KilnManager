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

const client = (name: string, sharePct: number, price: number, charged = true): ClientResult => ({
  contactName: name,
  liters: sharePct * 100,
  klu: sharePct * 100,
  sharePct,
  price,
  charged,
});

/**
 * A partner takes a share of **what paying clients paid**, less the share of the
 * kiln's costs their part of the load accounts for. The studio's own work is
 * absent from both halves: it brings nothing in, so it can't add to a cut — and
 * crucially it must not subtract either.
 *
 * That last part was the bug. Basing the cut on the firing's whole profit meant
 * the cost of the studio's own shelves ate into what the partner was owed, and
 * on a firing loaded mostly for the studio it wiped it out completely. Those
 * shelves are the studio's own affair — stock it sells later — not something a
 * partner should be charged for.
 */
const reported: Firing = {
  kiln,
  serviceBasePrice: 65,
  modifiers: [],
  levels: [],
  costItems: [
    { name: "Propane", amount: 10.08, kind: "variable" },
    { name: "Maintenance reserve", amount: 6, kind: "fixed" },
    { name: "Consumables", amount: 2, kind: "fixed" },
  ],
  partners: [{ name: "Ranxo Taller · Their client", pct: 0.3 }],
  invoiceStep: 0.2,
};

// 15% Esther + 10% Ro paying, 75% the studio's own work.
const reportedClients = [
  client("Esther Alumna", 0.15, 9.67),
  client("Ro", 0.1, 6.66),
  client("Myself", 0.75, 0, false),
];

describe("what a partner takes a cut of", () => {
  it("matches the reported firing: 3,62 € on 16,60 € invoiced", () => {
    const acc = computeAccounting(16.33, reported, reportedClients);
    // Invoiced (rounded up to 20c): 9,80 + 6,80 = 16,60.
    // Their 25% of the load carries 25% of the 18,08 € costs = 4,52 €.
    expect(acc.partnerBase).toBeCloseTo(12.08, 2);
    expect(acc.partnerCuts[0]!.amount).toBe(3.62);
  });

  it("no longer lets the studio's own shelves wipe the cut out", () => {
    // The old rule based this on the firing's gross profit (16,33 − 18,08 =
    // −1,75), which paid the partner nothing at all.
    const acc = computeAccounting(16.33, reported, reportedClients);
    expect(acc.grossProfit).toBeLessThan(0); // the firing still reports its loss
    expect(acc.partnerCuts[0]!.amount).toBeGreaterThan(0); // …but the partner is paid
  });

  it("takes a cut of real money — what the client pays, not the exact split", () => {
    const withRounding = computeAccounting(16.33, reported, reportedClients);
    const noRounding = computeAccounting(16.33, { ...reported, invoiceStep: 0 }, reportedClients);
    expect(withRounding.partnerBase).toBeGreaterThan(noRounding.partnerBase);
  });

  it("changes nothing on a firing with no self-assigned work", () => {
    // Whole kiln charged → the base IS the gross profit, as before.
    const full = [client("Solo", 1, 100)];
    const acc = computeAccounting(100, { ...reported, invoiceStep: 0 }, full);
    expect(acc.partnerBase).toBe(acc.grossProfit);
  });

  it("pays nothing on a firing that is entirely the studio's own work", () => {
    const own = [client("Myself", 1, 0, false)];
    const acc = computeAccounting(0, reported, own);
    expect(acc.partnerBase).toBe(0);
    expect(acc.partnerCuts[0]!.amount).toBe(0);
  });

  it("never goes negative, even if a client pays less than their costs", () => {
    // A heavy discount can leave a client's share below the cost they carry.
    const thin = [client("Cheap", 1, 2), client("Myself", 0, 0, false)];
    const acc = computeAccounting(2, reported, thin);
    expect(acc.partnerBase).toBeLessThan(0);
    expect(acc.partnerCuts[0]!.amount).toBe(0);
  });

  it("applies the same rule to a per-client partner", () => {
    const acc = computeAccounting(
      16.33,
      { ...reported, partners: [], clientPartners: { "Esther Alumna": [{ name: "Guest", pct: 0.3 }] } },
      reportedClients,
    );
    // Esther paid 9,80 and carries 15% of 18,08 = 2,71 → 30% of 7,09.
    expect(acc.partnerCuts[0]!.amount).toBe(2.13);
    expect(acc.partnerCuts[0]!.client).toBe("Esther Alumna");
  });

  it("gives a per-client partner nothing for the studio's own shelves", () => {
    const acc = computeAccounting(
      16.33,
      { ...reported, partners: [], clientPartners: { Myself: [{ name: "Guest", pct: 0.3 }] } },
      reportedClients,
    );
    expect(acc.partnerCuts[0]!.amount).toBe(0);
  });

  it("the rule itself: no negative cut, ever", () => {
    expect(partnerCut(-100, 0.3)).toBe(0);
    expect(partnerCut(0, 0.3)).toBe(0);
    expect(partnerCut(80, 0.3)).toBe(24);
  });
});
