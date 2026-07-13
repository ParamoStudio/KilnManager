import type { Firing, Allocation, KilnProfile, FiringService } from "@core";
import { consumedHeightCm } from "@core";
import { demoKilns } from "./kilns";
import { COMPLEXITY, type ComplexityKey } from "./complexity";
import { storage } from "./storage";

// ---- Planner state (renderer-only, richer than the core Firing) -----------

export interface Segment {
  contactName: string;
  complexity: ComplexityKey;
}

export interface PlannerLevel {
  id: string;
  supportHeightCm: number;
  shelfThicknessCm: number;
  division: number; // 1 | 2 | 3 | 4
  segments: (Segment | null)[]; // length === division
}

export interface PlannerModifier {
  id: string;
  label: string;
  amount: number; // negative = discount
  on: boolean;
}

export interface PlannerState {
  kilnId: string;
  serviceId: string;
  levels: PlannerLevel[]; // index 0 = topmost level
  modifiers: PlannerModifier[];
  partners: { name: string; pct: number }[];
}

const defaultModifiers = (): PlannerModifier[] => [
  { id: "priority", label: "Priority (expedite)", amount: 10, on: false },
  { id: "custom-curve", label: "Custom curve", amount: 8, on: false },
  { id: "full-kiln", label: "Full kiln discount", amount: -9.5, on: false },
];

function initialState(): PlannerState {
  const kiln = demoKilns[0]!;
  return {
    kilnId: kiln.id,
    serviceId: kiln.services[0]!.id,
    levels: [],
    modifiers: defaultModifiers(),
    partners: [{ name: "Studio", pct: 0.2 }],
  };
}

export const planner = $state<PlannerState>(initialState());

// ---- Lookups --------------------------------------------------------------

export function currentKiln(): KilnProfile {
  return demoKilns.find((k) => k.id === planner.kilnId) ?? demoKilns[0]!;
}

export function currentService(): FiringService {
  const kiln = currentKiln();
  return kiln.services.find((s) => s.id === planner.serviceId) ?? kiln.services[0]!;
}

/** Height already consumed by all levels (cm). */
export function totalConsumedCm(): number {
  return planner.levels.reduce((a, l) => a + l.supportHeightCm + l.shelfThicknessCm, 0);
}

export function remainingCm(): number {
  return Math.max(0, currentKiln().usableHeightCm - totalConsumedCm());
}

// ---- Mutations ------------------------------------------------------------

let seq = 0;
const newId = (): string => `l${Date.now().toString(36)}${seq++}`;

/** Add a shelf with a chosen support height + division (from the creation popup). */
export function addShelf(supportHeightCm: number, division: number): string | null {
  const kiln = currentKiln();
  const thickness = kiln.defaultShelfThicknessCm;
  const room = remainingCm() - thickness;
  if (room <= 0) return null; // no space
  const support = Math.max(2, Math.min(supportHeightCm, room));
  const div = Math.max(1, Math.min(4, Math.round(division)));
  const id = newId();
  planner.levels.unshift({
    id,
    supportHeightCm: support,
    shelfThicknessCm: thickness,
    division: div,
    segments: Array.from({ length: div }, () => null),
  });
  return id;
}

/** Room (cm) available for a new shelf's support posts. */
export function roomForNewShelf(): number {
  return remainingCm() - currentKiln().defaultShelfThicknessCm;
}

export function removeLevel(id: string): void {
  planner.levels = planner.levels.filter((l) => l.id !== id);
}

export function clearAll(): void {
  planner.levels = [];
}

/** Populate with the agreed worked example (first run / demo). */
export function seedDemo(): void {
  planner.levels = [
    { id: newId(), supportHeightCm: 8.5, shelfThicknessCm: 1.5, division: 1, segments: [{ contactName: "Luis", complexity: "complex" }] },
    { id: newId(), supportHeightCm: 13.5, shelfThicknessCm: 1.5, division: 1, segments: [{ contactName: "Anna", complexity: "medium" }] },
    { id: newId(), supportHeightCm: 8.5, shelfThicknessCm: 1.5, division: 2, segments: [{ contactName: "Studio Work", complexity: "simple" }, null] },
    { id: newId(), supportHeightCm: 10.5, shelfThicknessCm: 1.5, division: 1, segments: [{ contactName: "Guest", complexity: "simple" }] },
  ];
  ["Luis", "Anna", "Studio Work", "Guest"].forEach(addContact);
}

export function setDivision(id: string, division: number): void {
  const lvl = planner.levels.find((l) => l.id === id);
  if (!lvl) return;
  const next: (Segment | null)[] = Array.from({ length: division }, (_, i) => lvl.segments[i] ?? null);
  lvl.division = division;
  lvl.segments = next;
}

export function setSegment(id: string, segIdx: number, seg: Segment | null): void {
  const lvl = planner.levels.find((l) => l.id === id);
  if (!lvl || segIdx < 0 || segIdx >= lvl.segments.length) return;
  lvl.segments[segIdx] = seg;
}

/** Set a level's support height, clamped so the stack never exceeds the kiln. */
export function setSupportHeight(id: string, cm: number): void {
  const lvl = planner.levels.find((l) => l.id === id);
  if (!lvl) return;
  const others = totalConsumedCm() - (lvl.supportHeightCm + lvl.shelfThicknessCm);
  const maxSupport = currentKiln().usableHeightCm - others - lvl.shelfThicknessCm;
  lvl.supportHeightCm = Math.max(2, Math.min(cm, maxSupport));
}

export function setKiln(id: string): void {
  const kiln = demoKilns.find((k) => k.id === id);
  if (!kiln) return;
  planner.kilnId = id;
  if (!kiln.services.some((s) => s.id === planner.serviceId)) {
    planner.serviceId = kiln.services[0]!.id;
  }
}

export function setService(id: string): void {
  planner.serviceId = id;
}

export function toggleModifier(id: string): void {
  const m = planner.modifiers.find((x) => x.id === id);
  if (m) m.on = !m.on;
}

// ---- Mapping to the pure engine -------------------------------------------

export function toCoreFiring(): Firing {
  const kiln = currentKiln();
  const service = currentService();
  const levels = planner.levels.map((l) => ({
    supportHeightCm: l.supportHeightCm,
    shelfThicknessCm: l.shelfThicknessCm,
    allocations: l.segments
      .filter((s): s is Segment => s !== null)
      .map<Allocation>((s) => ({
        contactName: s.contactName,
        fraction: 1 / l.division,
        complexity: COMPLEXITY[s.complexity].factor,
        notes: COMPLEXITY[s.complexity].label,
      })),
  }));
  return {
    kiln,
    serviceBasePrice: service.basePrice,
    serviceName: service.name,
    modifiers: planner.modifiers.filter((m) => m.on).map((m) => ({ label: m.label, amount: m.amount })),
    costItems: kiln.defaultCostItems,
    partners: planner.partners,
    levels,
  };
}

/** Distinct client names in first-appearance order (top level first). */
export function clientNames(): string[] {
  const seen: string[] = [];
  for (const l of planner.levels) {
    for (const s of l.segments) {
      if (s && !seen.includes(s.contactName)) seen.push(s.contactName);
    }
  }
  return seen;
}

// ---- Persistence ----------------------------------------------------------

const STORAGE_KEY = "currentFiring";

export async function loadPlanner(): Promise<void> {
  const saved = await storage.read<PlannerState>(STORAGE_KEY);
  if (saved && Array.isArray(saved.levels)) {
    planner.kilnId = saved.kilnId ?? planner.kilnId;
    planner.serviceId = saved.serviceId ?? planner.serviceId;
    planner.levels = saved.levels;
    if (Array.isArray(saved.modifiers) && saved.modifiers.length) planner.modifiers = saved.modifiers;
    if (Array.isArray(saved.partners)) planner.partners = saved.partners;
  }
}

export function savePlanner(): void {
  void storage.write(STORAGE_KEY, $state.snapshot(planner));
}

// ---- UI / workflow state (transient, not part of the firing doc) ----------

export interface ZoneRef {
  levelId: string;
  segIdx: number;
}

export const ui = $state<{
  /** Zones currently selected in the kiln (the Assign rail acts on these). */
  selection: ZoneRef[];
  /** Complexity applied when assigning the selection. */
  complexity: ComplexityKey;
  /** Shelf editor popup target: a level id, "new", or null (closed). */
  shelfEditor: string | "new" | null;
}>({
  selection: [],
  complexity: "simple",
  shelfEditor: null,
});

// ---- Contacts book (minimal; full cartilla + CSV is T4) -------------------

export const contacts = $state<{ names: string[] }>({ names: [] });

export async function loadContacts(): Promise<void> {
  const s = await storage.read<{ names: string[] }>("contacts");
  if (s && Array.isArray(s.names)) contacts.names = s.names;
}
function saveContacts(): void {
  void storage.write("contacts", $state.snapshot(contacts));
}
export function addContact(name: string): void {
  const n = name.trim();
  if (n && !contacts.names.includes(n)) {
    contacts.names.push(n);
    saveContacts();
  }
}

// ---- Shelf editor popup ---------------------------------------------------

export function openShelfEditor(target: string | "new"): void {
  ui.shelfEditor = target;
}
export function closeShelfEditor(): void {
  ui.shelfEditor = null;
}

/** Physical fraction of a shelf's area that is occupied (0..1). */
export function occupiedFraction(level: PlannerLevel): number {
  if (level.division === 0) return 0;
  return level.segments.filter((s) => s !== null).length / level.division;
}

/** Physical fill of the whole kiln by occupied volume (0..1). */
export function occupiedVolumeFraction(): number {
  const uH = currentKiln().usableHeightCm;
  if (uH <= 0) return 0;
  let occ = 0;
  for (const l of planner.levels) {
    occ += (l.supportHeightCm + l.shelfThicknessCm) * occupiedFraction(l);
  }
  return occ / uH;
}

/** Structure fill: how much usable height is shelved (0..1). */
export function structureFillFraction(): number {
  const uH = currentKiln().usableHeightCm;
  return uH > 0 ? totalConsumedCm() / uH : 0;
}

export function occupancyBand(frac: number): "low" | "balanced" | "high" {
  if (frac <= 0.3) return "low";
  if (frac <= 0.7) return "balanced";
  return "high";
}

// ---- Zone selection + assignment ------------------------------------------

export function zoneOwner(levelId: string, segIdx: number): string | null {
  return planner.levels.find((l) => l.id === levelId)?.segments[segIdx]?.contactName ?? null;
}

export function isSelected(levelId: string, segIdx: number): boolean {
  return ui.selection.some((z) => z.levelId === levelId && z.segIdx === segIdx);
}

/** Click a zone: toggle it in/out of the working selection. */
export function toggleSelection(levelId: string, segIdx: number): void {
  const i = ui.selection.findIndex((z) => z.levelId === levelId && z.segIdx === segIdx);
  if (i >= 0) ui.selection.splice(i, 1);
  else ui.selection.push({ levelId, segIdx });
  // Adopt the complexity of the last-touched assigned zone, for convenience.
  const seg = planner.levels.find((l) => l.id === levelId)?.segments[segIdx];
  if (seg) ui.complexity = seg.complexity;
}

export function clearSelection(): void {
  ui.selection = [];
}

export function selectionOwners(): string[] {
  const set = new Set<string>();
  for (const z of ui.selection) {
    const o = zoneOwner(z.levelId, z.segIdx);
    if (o) set.add(o);
  }
  return [...set];
}

/** Assign every selected zone to a client, with the current complexity. */
export function assignSelectionTo(name: string): void {
  const n = name.trim();
  if (!n) return;
  addContact(n);
  for (const z of ui.selection) {
    setSegment(z.levelId, z.segIdx, { contactName: n, complexity: ui.complexity });
  }
  clearSelection();
}

/** Apply the current complexity to the selected zones that are already assigned. */
export function applyComplexityToSelection(cx: ComplexityKey): void {
  ui.complexity = cx;
  for (const z of ui.selection) {
    const lvl = planner.levels.find((l) => l.id === z.levelId);
    const seg = lvl?.segments[z.segIdx];
    if (lvl && seg) lvl.segments[z.segIdx] = { ...seg, complexity: cx };
  }
}

/** Empty the selected zones. */
export function clearSelectedZones(): void {
  for (const z of ui.selection) setSegment(z.levelId, z.segIdx, null);
  clearSelection();
}

export function clearClient(name: string): void {
  for (const l of planner.levels) {
    l.segments = l.segments.map((s) => (s && s.contactName === name ? null : s));
  }
}

/** Select all zones belonging to a client (e.g. clicking their breakdown chip). */
export function selectClientZones(name: string): void {
  const sel: ZoneRef[] = [];
  for (const l of planner.levels) {
    l.segments.forEach((s, i) => {
      if (s?.contactName === name) sel.push({ levelId: l.id, segIdx: i });
    });
  }
  ui.selection = sel;
}

// Re-export for convenience in components.
export { consumedHeightCm };
