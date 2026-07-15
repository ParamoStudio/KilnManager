/**
 * Kiln profiles store — the studio's kilns, editable in Kiln Profiles and
 * persisted. Seeded from the demo profiles on first run.
 */
import type { KilnProfile, KilnShape } from "@core";
import { demoKilns } from "./kilns";
import { storage } from "./storage";

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
    usableHeightCm: 50,
    defaultShelfThicknessCm: 1.5,
    standardPostHeightsCm: [5, 8, 10, 13, 15, 20],
    services: [{ id: `svc-${newKilnId()}`, name: "Firing", basePrice: 80 }],
    defaultCostItems: [{ name: "Fuel", amount: 8, kind: "variable" }],
  };
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
    kilnStore.list = saved;
  } else {
    kilnStore.list = structuredClone(demoKilns);
    saveKilns();
  }
}
