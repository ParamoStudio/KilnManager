/**
 * Kiln Manager — core domain types.
 *
 * Domain language is English (see Docs/PROGRAM_GUIDELINE.md).
 * All lengths in centimetres, volumes in litres, money in the studio's currency
 * (assumed a single currency per install; no conversion in the engine).
 */

export type KilnShape = "cylinder" | "box";

/** A named firing service with the base price the studio charges for it. */
export interface FiringService {
  id: string;
  name: string; // e.g. "Bisque", "High-temp glaze", "Crystalline"
  basePrice: number; // the studio's "source of truth" price for a full firing
}

/** A configurable cost line for a firing (feeds the internal margin only). */
export interface CostItem {
  name: string; // e.g. "Propane", "Maintenance reserve", "Cones", "Kiln wash"
  amount: number;
  kind: "fixed" | "variable"; // fixed = default from profile, variable = per-firing
}

/** A collaborator / studio that takes an agreed cut of the gross profit. */
export interface Partner {
  name: string;
  pct: number; // fraction 0..1 of gross profit (0.20 = 20%)
}

export interface KilnProfile {
  id: string;
  name: string;
  location?: string;
  shape: KilnShape;

  /** cylinder geometry */
  diameterCm?: number;
  /** box geometry */
  widthCm?: number;
  depthCm?: number;

  usableHeightCm: number;
  /** Fraction of the raw footprint that is actually loadable (0..1). Default 1. */
  usableFootprintFactor?: number;

  defaultShelfThicknessCm: number;
  /** Standard post/support heights offered when building a level (cm). */
  standardPostHeightsCm: number[];

  services: FiringService[];
  defaultCostItems: CostItem[];
}

/** One client's slice of a shelf level. */
export interface Allocation {
  contactId?: string;
  contactName: string;
  /** Horizontal fraction of the shelf occupied (0..1). 0.5 = half a shelf. */
  fraction: number;
  /** Complexity factor (Simple 1.00 / Medium 1.15 / Complex 1.30 by default). */
  complexity: number;
  /** false = studio's own work: counts for occupancy/KLU but is not charged. */
  charged?: boolean;
  notes?: string;
}

/** A stacked level in the kiln: posts + shelf, shared by one or more allocations. */
export interface ShelfLevel {
  supportHeightCm: number; // post height (piece clearance)
  shelfThicknessCm: number; // the shelf slab
  allocations: Allocation[];
}

/** An optional firing-wide price adjustment (Priority, Custom curve, discounts…). */
export interface Modifier {
  label: string;
  amount: number; // added to base price; negative for discounts
}

/** A full firing being planned or recorded. */
export interface Firing {
  kiln: KilnProfile;
  /** Resolved base price of the chosen service (copied so history stays stable). */
  serviceBasePrice: number;
  serviceName?: string;
  levels: ShelfLevel[];
  modifiers: Modifier[];
  costItems: CostItem[];
  partners: Partner[];
  date?: string; // ISO date
  notes?: string;
}

// ---- Computed results -----------------------------------------------------

export interface ClientResult {
  contactId?: string;
  contactName: string;
  liters: number; // raw occupied volume (litres)
  klu: number; // effective load units (liters × complexity)
  sharePct: number; // 0..1 of total KLU
  price: number; // charged amount (0 for uncharged / studio-own zones)
  charged: boolean; // false = studio's own work, not billed
}

export interface AccountingResult {
  revenue: number; // base price ± modifiers (what clients pay in total)
  kilnCosts: number; // Σ cost items
  grossProfit: number; // revenue − kilnCosts
  partnerCuts: { name: string; pct: number; amount: number }[];
  netToYou: number; // grossProfit − Σ partner cuts
}

export interface FiringResult {
  totalKLU: number;
  totalOccupiedLiters: number;
  usableKilnLiters: number;
  fillFraction: number; // occupied / usable (for "% full" display)
  serviceRevenue: number; // nominal full-kiln price (base ± modifiers)
  clients: ClientResult[];
  accounting: AccountingResult; // revenue here = actually charged (excludes own work)
}
