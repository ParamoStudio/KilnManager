/**
 * Studio-wide settings — global complexity factors and partners (with tiers),
 * edited in App Settings and persisted. Kiln-specific prices/costs live in the
 * kiln profiles, not here.
 */
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
export interface AppSettings {
  complexity: Record<ComplexityKey, ComplexityDef>;
  partners: PartnerDef[];
}

function defaultSettings(): AppSettings {
  return {
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
  }
}
