/**
 * Kiln profiles store — the studio's kilns, editable in Kiln Profiles and
 * persisted. Seeded from the demo profiles on first run.
 */
import type { CostItem, KilnModifier, KilnProfile, KilnShape } from "@core";
import { demoKilns } from "./kilns";
import { storage } from "./storage";

/** Fixed cost lines every kiln always shows (in this order, deduped by name). */
export const BUILTIN_FIXED = ["Maintenance reserve", "Consumables"] as const;

export const kilnStore = $state<{ list: KilnProfile[] }>({
  list: structuredClone(demoKilns),
});

let kilnSeq = 0;
const newKilnId = (): string => `kiln-${Date.now().toString(36)}-${kilnSeq++}`;

export function kilnList(): KilnProfile[] {
  return kilnStore.list;
}

export function getKiln(id: string): KilnProfile | undefined {
  return kilnStore.list.find((k) => k.id === id);
}

/** Volume in litres of the loadable cavity (footprint × usable height). */
export function kilnVolumeL(k: KilnProfile): number {
  const factor = k.usableFootprintFactor ?? 1;
  let areaCm2: number;
  if (k.shape === "cylinder") {
    const r = (k.diameterCm ?? 0) / 2;
    areaCm2 = Math.PI * r * r;
  } else {
    areaCm2 = (k.widthCm ?? 0) * (k.depthCm ?? 0);
  }
  return (areaCm2 * k.usableHeightCm * factor) / 1000; // cm³ → litres
}

function blankKiln(shape: KilnShape = "cylinder"): KilnProfile {
  return {
    id: newKilnId(),
    name: "New kiln",
    shape,
    diameterCm: shape === "cylinder" ? 40 : undefined,
    widthCm: shape === "box" ? 40 : undefined,
    depthCm: shape === "box" ? 30 : undefined,
    energy: "electric",
    usableHeightCm: 50,
    defaultShelfThicknessCm: 1.5,
    standardPostHeightsCm: [5, 8, 10, 13, 15, 20],
    services: [{ id: `svc-${newKilnId()}`, name: "Firing", basePrice: 80, fuelUse: 0 }],
    defaultCostItems: [
      { name: "Maintenance reserve", amount: 0, kind: "fixed" },
      { name: "Consumables", amount: 0, kind: "fixed" },
    ],
    modifiers: [],
  };
}

/** Backfill fields added after a kiln may have been persisted, so old data and
 *  new data behave the same (energy, per-service fuelUse, the built-in fixed
 *  items). Never removes the user's own custom cost items. */
function normalizeKiln(k: KilnProfile): KilnProfile {
  const items: CostItem[] = k.defaultCostItems ? [...k.defaultCostItems] : [];
  for (const name of BUILTIN_FIXED) {
    if (!items.some((c) => c.name === name)) items.push({ name, amount: 0, kind: "fixed" });
  }
  return {
    ...k,
    energy: k.energy ?? "other",
    services: k.services.map((s) => ({ ...s, fuelUse: s.fuelUse ?? 0 })),
    defaultCostItems: items,
    modifiers: k.modifiers ?? [],
  };
}

export const newModifierId = (): string => `mod-${newKilnId()}`;

export function addModifier(kilnId: string, family: "surcharge" | "discount"): void {
  const k = getKiln(kilnId);
  if (!k) return;
  if (!k.modifiers) k.modifiers = [];
  k.modifiers.push({
    id: newModifierId(),
    name: family === "surcharge" ? "New surcharge" : "New discount",
    family,
    mode: "percent",
    value: 10,
  });
  saveKilns();
}
export function removeModifier(kilnId: string, id: string): void {
  const k = getKiln(kilnId);
  if (!k?.modifiers) return;
  k.modifiers = k.modifiers.filter((m) => m.id !== id);
  saveKilns();
}
export function setModifierMode(m: KilnModifier, mode: "percent" | "fixed"): void {
  m.mode = mode;
  saveKilns();
}

export function addKiln(shape: KilnShape = "cylinder"): KilnProfile {
  const k = blankKiln(shape);
  kilnStore.list.push(k);
  saveKilns();
  return k;
}

export function updateKiln(id: string, patch: Partial<KilnProfile>): void {
  const i = kilnStore.list.findIndex((k) => k.id === id);
  if (i < 0) return;
  kilnStore.list[i] = { ...kilnStore.list[i]!, ...patch };
  saveKilns();
}

export function removeKiln(id: string): void {
  kilnStore.list = kilnStore.list.filter((k) => k.id !== id);
  saveKilns();
}

export const newServiceId = (): string => `svc-${newKilnId()}`;

export function saveKilns(): void {
  void storage.write("kilns", $state.snapshot(kilnStore.list));
}

export async function loadKilns(): Promise<void> {
  const saved = await storage.read<KilnProfile[]>("kilns");
  if (Array.isArray(saved) && saved.length > 0) {
    kilnStore.list = saved.map(normalizeKiln);
  } else {
    kilnStore.list = structuredClone(demoKilns);
    saveKilns();
  }
}
