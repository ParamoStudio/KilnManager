import { describe, it, expect } from "vitest";
import { computeFiring } from "../src/core/engine.js";
import type { Firing, KilnProfile } from "../src/core/types.js";

const kiln: KilnProfile = {
  id: "k1",
  name: "Technopyro 75L",
  shape: "cylinder",
  diameterCm: 40, // footprint ≈ 1256.64 cm²
  usableHeightCm: 62,
  defaultShelfThicknessCm: 1.5,
  standardPostHeightsCm: [5, 8, 10, 13, 15],
  services: [{ id: "s1", name: "High Reduction", basePrice: 94 }],
  defaultCostItems: [],
};

// The worked example agreed during design. Consumed heights 10/15/10/12 cm.
const firing: Firing = {
  kiln,
  serviceBasePrice: 94,
  serviceName: "High Reduction",
  modifiers: [],
  costItems: [],
  partners: [],
  levels: [
    { supportHeightCm: 8.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Luis", fraction: 0.8, complexity: 1.3 }] },
    { supportHeightCm: 13.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Anna", fraction: 1.0, complexity: 1.15 }] },
    { supportHeightCm: 8.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Studio", fraction: 0.5, complexity: 1.0 }] },
    { supportHeightCm: 10.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Guest", fraction: 1.0, complexity: 1.0 }] },
  ],
};

describe("computeFiring — worked example", () => {
  const r = computeFiring(firing);

  it("total KLU matches the volumetric model (~56.1)", () => {
    expect(r.totalKLU).toBeCloseTo(56.108, 2);
  });

  it("client prices sum EXACTLY to revenue (no rounding drift)", () => {
    const sum = r.clients.reduce((a, c) => a + c.price, 0);
    expect(sum).toBe(94);
  });

  it("volumetric model makes Anna (tallest, full) pay more than Luis", () => {
    const byName = Object.fromEntries(r.clients.map((c) => [c.contactName, c]));
    expect(byName.Anna!.price).toBeGreaterThan(byName.Luis!.price);
    expect(byName.Anna!.price).toBeCloseTo(36.32, 1);
    expect(byName.Luis!.price).toBeCloseTo(21.9, 1);
  });

  it("fill fraction = occupied / usable volume", () => {
    expect(r.fillFraction).toBeGreaterThan(0);
    expect(r.fillFraction).toBeLessThanOrEqual(1);
  });
});

describe("computeFiring — aggregation & complexity", () => {
  it("aggregates one client across multiple levels", () => {
    const f: Firing = {
      ...firing,
      levels: [
        { supportHeightCm: 8.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Luis", fraction: 0.5, complexity: 1.0 }] },
        { supportHeightCm: 8.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Luis", fraction: 0.5, complexity: 1.0 }] },
      ],
    };
    const res = computeFiring(f);
    expect(res.clients).toHaveLength(1);
    expect(res.clients[0]!.price).toBe(94);
  });

  it("uncharged (studio-own) zones occupy but are not billed", () => {
    const f: Firing = {
      ...firing,
      levels: [
        { supportHeightCm: 13.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Client", fraction: 1, complexity: 1 }] },
        { supportHeightCm: 13.5, shelfThicknessCm: 1.5, allocations: [{ contactName: "Myself", fraction: 1, complexity: 1, charged: false }] },
      ],
    };
    const r = computeFiring(f);
    const byName = Object.fromEntries(r.clients.map((c) => [c.contactName, c]));
    expect(byName.Myself!.price).toBe(0);
    expect(byName.Myself!.charged).toBe(false);
    // Equal KLU → client covers half of the 94 € nominal; studio absorbs the rest.
    expect(byName.Client!.price).toBeCloseTo(47, 1);
    expect(r.serviceRevenue).toBe(94);
    expect(r.accounting.revenue).toBeCloseTo(47, 1);
  });

  it("uniform complexity cancels out (it is purely relative)", () => {
    const simple = computeFiring(firing).clients.map((c) => c.price);
    const allComplex: Firing = {
      ...firing,
      levels: firing.levels.map((l) => ({
        ...l,
        allocations: l.allocations.map((a) => ({ ...a, complexity: 1.3 })),
      })),
    };
    const complex = computeFiring(allComplex).clients.map((c) => c.price);
    // Same split regardless of the shared complexity value.
    // (Note: the original firing mixes complexities, so we compare against a
    //  simple baseline built here.)
    const allSimple: Firing = {
      ...firing,
      levels: firing.levels.map((l) => ({
        ...l,
        allocations: l.allocations.map((a) => ({ ...a, complexity: 1.0 })),
      })),
    };
    const baseline = computeFiring(allSimple).clients.map((c) => c.price);
    expect(complex).toEqual(baseline);
    expect(simple).not.toEqual(baseline); // mixed complexity DOES change the split
  });
});
