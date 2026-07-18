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
  /** Studio default: pre-applied on every new firing (only one tier can be it). */
  default?: boolean;
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
  /** Studio name printed on the client ticket. */
  studioName: string;
  /** WhatsApp/message template. Placeholders: {client} {total}. */
  ticketMessage: string;
  /** Electricity pricing mode: a single fixed €/kWh, or a low/high average. */
  electricityMode: "fixed" | "adaptive";
  electricityLow: number; // €/kWh (adaptive)
  electricityHigh: number; // €/kWh (adaptive)
  /** ENTSO-E bidding zone for the live wholesale reference. */
  biddingZone: string;
}

/** ENTSO-E bidding zones offered in the selector (code → label). */
export const BIDDING_ZONES: { code: string; label: string }[] = [
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "FR", label: "France" },
  { code: "DE-LU", label: "Germany · Luxembourg" },
  { code: "IT-North", label: "Italy (North)" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "GB", label: "Great Britain" },
  { code: "IE", label: "Ireland" },
  { code: "DK1", label: "Denmark (West)" },
  { code: "DK2", label: "Denmark (East)" },
  { code: "NO2", label: "Norway (South)" },
  { code: "SE3", label: "Sweden (Stockholm)" },
  { code: "FI", label: "Finland" },
  { code: "PL", label: "Poland" },
];

export const DEFAULT_TICKET_MESSAGE =
  "¡Buenos días {client}! Ya tengo tus piezas en el horno, más o menos en un día podrás pasarte a buscarlas. Te adjunto el ticket. Nos vemos.";

export const FUEL_KINDS: FuelKind[] = ["electricity", "propane", "butane", "wood", "other"];

function defaultFuels(): Record<FuelKind, FuelDef> {
  return {
    electricity: { label: "Electricity", unit: "kWh", price: 0.15 },
    propane: { label: "Propane", unit: "bottle", price: 21, bottleKg: 11 },
    butane: { label: "Butane", unit: "bottle", price: 17, bottleKg: 12.5 },
    wood: { label: "Wood", unit: "kg", price: 0.3 },
    other: { label: "Fuel", unit: "unit", price: 0 },
  };
}

function defaultSettings(): AppSettings {
  return {
    fuels: defaultFuels(),
    priceHistory: [],
    studioName: "Example Guest Studio",
    ticketMessage: DEFAULT_TICKET_MESSAGE,
    electricityMode: "fixed",
    electricityLow: 0.1,
    electricityHigh: 0.2,
    biddingZone: "ES",
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

/** Mark (or unmark) one tier as the studio default — exclusive across all. */
export function setDefaultTier(partnerId: string, tierId: string): void {
  for (const p of settings.partners)
    for (const t of p.tiers) t.default = p.id === partnerId && t.id === tierId ? !t.default : false;
  saveSettings();
}
export function defaultTierRef(): { partnerId: string; tierId: string } | null {
  for (const p of settings.partners)
    for (const t of p.tiers) if (t.default) return { partnerId: p.id, tierId: t.id };
  return null;
}
/** Resolve a {partnerId,tierId} to a { name, pct } line for the engine. */
export function resolvePartner(ref: { partnerId: string; tierId: string }): { name: string; pct: number } | null {
  const p = settings.partners.find((x) => x.id === ref.partnerId);
  const t = p?.tiers.find((x) => x.id === ref.tierId);
  return p && t ? { name: `${p.name} · ${t.name}`, pct: t.pct } : null;
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
    // Keep the user's saved PRICES, but take label/unit from the current
    // defaults so definition changes (e.g. wood load → kg) always propagate.
    const sf = saved.fuels ?? ({} as Partial<Record<FuelKind, FuelDef>>);
    const df = defaultFuels();
    settings.fuels = Object.fromEntries(
      FUEL_KINDS.map((k) => [k, { ...df[k], price: typeof sf[k]?.price === "number" ? sf[k]!.price : df[k].price }]),
    ) as Record<FuelKind, FuelDef>;
    settings.priceHistory = Array.isArray(saved.priceHistory) ? saved.priceHistory : [];
    settings.studioName = typeof saved.studioName === "string" ? saved.studioName : "Example Guest Studio";
    settings.ticketMessage = typeof saved.ticketMessage === "string" ? saved.ticketMessage : DEFAULT_TICKET_MESSAGE;
    settings.electricityMode = saved.electricityMode === "adaptive" ? "adaptive" : "fixed";
    settings.electricityLow = typeof saved.electricityLow === "number" ? saved.electricityLow : 0.1;
    settings.electricityHigh = typeof saved.electricityHigh === "number" ? saved.electricityHigh : 0.2;
    settings.biddingZone = typeof saved.biddingZone === "string" ? saved.biddingZone : "ES";
  }
}

/** In adaptive mode the working €/kWh is the midpoint of the low/high band. */
export function recomputeElectricity(): void {
  if (settings.electricityMode === "adaptive") {
    const lo = settings.electricityLow || 0;
    const hi = settings.electricityHigh || 0;
    settings.fuels.electricity.price = Math.round(((lo + hi) / 2) * 10000) / 10000;
  }
}
export function setElectricityMode(mode: "fixed" | "adaptive"): void {
  settings.electricityMode = mode;
  recomputeElectricity();
  saveSettings();
}
export function setElectricityBounds(low: number, high: number): void {
  settings.electricityLow = Math.max(0, low || 0);
  settings.electricityHigh = Math.max(0, high || 0);
  recomputeElectricity();
  saveSettings();
}
export function setBiddingZone(zone: string): void {
  settings.biddingZone = zone;
  saveSettings();
}
