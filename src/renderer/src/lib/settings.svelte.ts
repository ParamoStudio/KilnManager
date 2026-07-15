/**
 * Studio-wide settings — global complexity factors and partners (with tiers),
 * edited in App Settings and persisted. Kiln-specific prices/costs live in the
 * kiln profiles, not here.
 */
import type { FuelKind, KilnProfile } from "@core";
import { COMPLEXITY, complexityKeys, type ComplexityKey } from "./complexity";
import { storage } from "./storage";

export interface PartnerTier {
  id: string;
  name: string;
  pct: number; // fraction 0..1 of gross profit
}
export interface PartnerDef {
  id: string;
  name: string;
  tiers: PartnerTier[];
}
export interface ComplexityDef {
  label: string;
  factor: number;
}
/** A fuel's current global price (per unit) — the volatile part of fuel cost. */
export interface FuelDef {
  label: string;
  unit: string; // "bottle" | "kWh" | "load" | "unit"
  price: number; // € per unit, right now
  bottleKg?: number; // for gas bottles (reference / calculator)
}
/** A logged fuel-price observation, so price changes are tracked over time. */
export interface PricePoint {
  id: string;
  fuel: FuelKind;
  price: number;
  at: number;
  note?: string;
}
export interface AppSettings {
  complexity: Record<ComplexityKey, ComplexityDef>;
  partners: PartnerDef[];
  fuels: Record<FuelKind, FuelDef>;
  priceHistory: PricePoint[];
}

export const FUEL_KINDS: FuelKind[] = ["electricity", "propane", "butane", "wood", "other"];

function defaultFuels(): Record<FuelKind, FuelDef> {
  return {
    electricity: { label: "Electricity", unit: "kWh", price: 0.15 },
    propane: { label: "Propane", unit: "bottle", price: 21, bottleKg: 11 },
    butane: { label: "Butane", unit: "bottle", price: 17, bottleKg: 12.5 },
    wood: { label: "Wood", unit: "load", price: 30 },
    other: { label: "Fuel", unit: "unit", price: 0 },
  };
}

function defaultSettings(): AppSettings {
  return {
    fuels: defaultFuels(),
    priceHistory: [],
    complexity: {
      simple: { ...COMPLEXITY.simple },
      medium: { ...COMPLEXITY.medium },
      complex: { ...COMPLEXITY.complex },
    },
    partners: [
      {
        id: "studio",
        name: "Guest studio",
        tiers: [
          { id: "their-client", name: "Their client", pct: 0.3 },
          { id: "my-client", name: "My client", pct: 0.15 },
        ],
      },
    ],
  };
}

export const settings = $state<AppSettings>(defaultSettings());

/** Reactive complexity label + factor for a key (reads from settings). */
export function cx(key: ComplexityKey): ComplexityDef {
  return settings.complexity[key];
}

/** The concrete fuel a kiln burns (drives which global price applies). */
export function fuelKeyForKiln(k: Pick<KilnProfile, "energy" | "gasType">): FuelKind {
  switch (k.energy) {
    case "electric":
      return "electricity";
    case "gas":
      return k.gasType === "butane" ? "butane" : "propane";
    case "wood":
      return "wood";
    default:
      return "other";
  }
}
export function fuelDefFor(k: Pick<KilnProfile, "energy" | "gasType">): FuelDef {
  return settings.fuels[fuelKeyForKiln(k)];
}
/** Variable fuel € for one firing = the service's consumption × current price. */
export function fuelCostFor(k: Pick<KilnProfile, "energy" | "gasType">, fuelUse: number): number {
  return (fuelUse || 0) * settings.fuels[fuelKeyForKiln(k)].price;
}

/** Record a newly-observed fuel price: set it live + log it to the history. */
export function recordFuelPrice(fuel: FuelKind, price: number, note?: string): void {
  if (!(price >= 0)) return;
  settings.fuels[fuel].price = price;
  settings.priceHistory.unshift({ id: newId("px"), fuel, price, at: Date.now(), note });
  if (settings.priceHistory.length > 200) settings.priceHistory.length = 200;
  saveSettings();
}

let partnerSeq = 0;
export const newId = (p: string): string => `${p}-${Date.now().toString(36)}-${partnerSeq++}`;

export function addPartner(): void {
  settings.partners.push({ id: newId("partner"), name: "New partner", tiers: [] });
  saveSettings();
}
export function removePartner(id: string): void {
  settings.partners = settings.partners.filter((p) => p.id !== id);
  saveSettings();
}
export function addTier(partnerId: string): void {
  const p = settings.partners.find((x) => x.id === partnerId);
  if (p) {
    p.tiers.push({ id: newId("tier"), name: "Tier", pct: 0.2 });
    saveSettings();
  }
}
export function removeTier(partnerId: string, tierId: string): void {
  const p = settings.partners.find((x) => x.id === partnerId);
  if (p) {
    p.tiers = p.tiers.filter((t) => t.id !== tierId);
    saveSettings();
  }
}

export function resetComplexity(): void {
  for (const k of complexityKeys) settings.complexity[k] = { ...COMPLEXITY[k] };
  saveSettings();
}

export function saveSettings(): void {
  void storage.write("settings", $state.snapshot(settings));
}

export async function loadSettings(): Promise<void> {
  const saved = await storage.read<AppSettings>("settings");
  if (saved && saved.complexity && Array.isArray(saved.partners)) {
    settings.complexity = saved.complexity;
    settings.partners = saved.partners;
    // Fuels/history arrived later — backfill any missing keys from defaults.
    settings.fuels = { ...defaultFuels(), ...(saved.fuels ?? {}) };
    settings.priceHistory = Array.isArray(saved.priceHistory) ? saved.priceHistory : [];
  }
}
