import type { KilnProfile } from "@core";

/**
 * Seed kiln profiles. Real profile management lives in Kiln Profiles; these
 * populate the store on first run. Fuel is modelled as per-service consumption
 * (bottles for gas, kWh for electric) × a global price; the fixed cost items
 * (maintenance reserve, consumables) are flat per firing.
 */
export const demoKilns: KilnProfile[] = [
  {
    id: "technopyro-75l",
    name: "Technopyro 75L",
    energy: "gas",
    gasType: "propane",
    shape: "cylinder",
    diameterCm: 40,
    usableHeightCm: 62,
    defaultShelfThicknessCm: 1.5,
    standardPostHeightsCm: [5, 8, 10, 13, 15, 20],
    services: [
      { id: "high-reduction", name: "High Reduction", basePrice: 94, fuelUse: 1 },
      { id: "bisque", name: "Bisque", basePrice: 60, fuelUse: 0.5 },
      { id: "high-glaze", name: "High-temp glaze", basePrice: 90, fuelUse: 1.1 },
    ],
    defaultCostItems: [
      { name: "Maintenance reserve", amount: 4, kind: "fixed" },
      { name: "Consumables", amount: 3, kind: "fixed" },
    ],
    modifiers: [
      { id: "m-priority", name: "Priority (expedite)", family: "surcharge", mode: "percent", value: 10 },
      { id: "m-curve", name: "Custom curve", family: "surcharge", mode: "fixed", value: 5 },
      { id: "m-studio", name: "Studio", family: "discount", mode: "percent", value: 20 },
      { id: "m-fullkiln", name: "Full kiln", family: "discount", mode: "fixed", value: 9.5 },
    ],
  },
  {
    id: "box-40l",
    name: "Test Box 40L",
    energy: "electric",
    shape: "box",
    widthCm: 40,
    depthCm: 30,
    usableHeightCm: 45,
    defaultShelfThicknessCm: 1.2,
    standardPostHeightsCm: [5, 8, 10, 12],
    services: [
      { id: "bisque", name: "Bisque", basePrice: 55, fuelUse: 30 },
      { id: "low-glaze", name: "Low-temp glaze", basePrice: 70, fuelUse: 45 },
    ],
    defaultCostItems: [
      { name: "Maintenance reserve", amount: 3, kind: "fixed" },
      { name: "Consumables", amount: 0, kind: "fixed" },
    ],
    modifiers: [
      { id: "m-priority", name: "Priority (expedite)", family: "surcharge", mode: "percent", value: 10 },
      { id: "m-student", name: "Student", family: "discount", mode: "percent", value: 15 },
    ],
  },
];
