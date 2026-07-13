import type { Firing, KilnProfile } from "@core";

/**
 * Seed data for T1 — the agreed worked example. Lets us show the engine working
 * end-to-end before the visual builder (T2) exists. Replaced by real, persisted
 * data from T3 onward.
 */
export const demoKiln: KilnProfile = {
  id: "technopyro-75l",
  name: "Technopyro 75L",
  shape: "cylinder",
  diameterCm: 40,
  usableHeightCm: 62,
  defaultShelfThicknessCm: 1.5,
  standardPostHeightsCm: [5, 8, 10, 13, 15, 20],
  services: [{ id: "high-reduction", name: "High Reduction", basePrice: 94 }],
  defaultCostItems: [
    { name: "Propane", amount: 8, kind: "variable" },
    { name: "Maintenance reserve", amount: 4, kind: "fixed" },
    { name: "Cones", amount: 3, kind: "fixed" },
  ],
};

export const demoFiring: Firing = {
  kiln: demoKiln,
  serviceBasePrice: 94,
  serviceName: "High Reduction",
  modifiers: [],
  costItems: demoKiln.defaultCostItems,
  partners: [{ name: "Studio", pct: 0.2 }],
  levels: [
    {
      supportHeightCm: 8.5,
      shelfThicknessCm: 1.5,
      allocations: [{ contactName: "Luis", fraction: 0.8, complexity: 1.3, notes: "Complex" }],
    },
    {
      supportHeightCm: 13.5,
      shelfThicknessCm: 1.5,
      allocations: [{ contactName: "Anna", fraction: 1.0, complexity: 1.15, notes: "Medium" }],
    },
    {
      supportHeightCm: 8.5,
      shelfThicknessCm: 1.5,
      allocations: [{ contactName: "Studio Work", fraction: 0.5, complexity: 1.0, notes: "Simple" }],
    },
    {
      supportHeightCm: 10.5,
      shelfThicknessCm: 1.5,
      allocations: [{ contactName: "Guest", fraction: 1.0, complexity: 1.0, notes: "Simple" }],
    },
  ],
};

export const clientColors = ["var(--violet)", "var(--green)", "var(--amber)", "var(--blue)"];
