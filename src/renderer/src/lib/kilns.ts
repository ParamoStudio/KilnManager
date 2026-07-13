import type { KilnProfile } from "@core";

/**
 * Seed kiln profiles for T2. Real profile management (create/edit/persist)
 * arrives in T3; for now these populate the kiln selector.
 */
export const demoKilns: KilnProfile[] = [
  {
    id: "technopyro-75l",
    name: "Technopyro 75L",
    shape: "cylinder",
    diameterCm: 40,
    usableHeightCm: 62,
    defaultShelfThicknessCm: 1.5,
    standardPostHeightsCm: [5, 8, 10, 13, 15, 20],
    services: [
      { id: "high-reduction", name: "High Reduction", basePrice: 94 },
      { id: "bisque", name: "Bisque", basePrice: 60 },
      { id: "high-glaze", name: "High-temp glaze", basePrice: 90 },
    ],
    defaultCostItems: [
      { name: "Propane", amount: 8, kind: "variable" },
      { name: "Maintenance reserve", amount: 4, kind: "fixed" },
      { name: "Cones", amount: 3, kind: "fixed" },
    ],
  },
  {
    id: "box-40l",
    name: "Test Box 40L",
    shape: "box",
    widthCm: 40,
    depthCm: 30,
    usableHeightCm: 45,
    defaultShelfThicknessCm: 1.2,
    standardPostHeightsCm: [5, 8, 10, 12],
    services: [
      { id: "bisque", name: "Bisque", basePrice: 55 },
      { id: "low-glaze", name: "Low-temp glaze", basePrice: 70 },
    ],
    defaultCostItems: [
      { name: "Electricity", amount: 6, kind: "variable" },
      { name: "Maintenance reserve", amount: 3, kind: "fixed" },
    ],
  },
];
