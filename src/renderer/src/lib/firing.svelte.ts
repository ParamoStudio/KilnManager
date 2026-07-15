import type { Firing, Allocation, KilnProfile, FiringService } from "@core";
import { consumedHeightCm } from "@core";
import { kilnStore, loadKilns } from "./kilns.svelte";
import { type ComplexityKey } from "./complexity";
import { cx, loadSettings } from "./settings.svelte";
import { storage } from "./storage";

// ---- Planner state (renderer-only, richer than the core Firing) -----------

/** Reserved client name for the studio's own (uncharged) work. */
export const MYSELF = "Myself";

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
  const kiln = kilnStore.list[0]!;
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
  return kilnStore.list.find((k) => k.id === planner.kilnId) ?? kilnStore.list[0]!;
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

/** First run: seed the agreed worked example as one Current Firing. */
export function seedDemoFiring(): void {
  const kiln = kilnStore.list[0]!;
  ["Luis", "Anna", "Studio Work", "Guest"].forEach(addContact);
  firings.list.push({
    id: `f${Date.now().toString(36)}${seq++}`,
    title: "",
    createdAt: Date.now(),
    status: "current",
    clientNotes: {},
    planner: {
      kilnId: kiln.id,
      serviceId: kiln.services[0]!.id,
      modifiers: defaultModifiers(),
      partners: [],
      levels: [
        { id: newId(), supportHeightCm: 8.5, shelfThicknessCm: 1.5, division: 1, segments: [{ contactName: "Luis", complexity: "complex" }] },
        { id: newId(), supportHeightCm: 13.5, shelfThicknessCm: 1.5, division: 1, segments: [{ contactName: "Anna", complexity: "medium" }] },
        { id: newId(), supportHeightCm: 8.5, shelfThicknessCm: 1.5, division: 2, segments: [{ contactName: "Studio Work", complexity: "simple" }, null] },
        { id: newId(), supportHeightCm: 10.5, shelfThicknessCm: 1.5, division: 1, segments: [{ contactName: "Guest", complexity: "simple" }] },
      ],
    },
  });
}

export function setDivision(id: string, division: number): void {
  const lvl = planner.levels.find((l) => l.id === id);
  if (!lvl) return;
  if (lvl.division === division) return; // unchanged: keep the clients as they are
  // Re-dividing changes the shelf geometry, so it clears every assignment (the
  // editor warns about this) rather than shifting clients into the new columns.
  lvl.division = division;
  lvl.segments = Array.from({ length: division }, () => null);
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
  const kiln = kilnStore.list.find((k) => k.id === id);
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

/** Build a pure-engine Firing from any planner state (active or a stored record). */
export function coreFiringFrom(p: PlannerState): Firing {
  const kiln = kilnStore.list.find((k) => k.id === p.kilnId) ?? kilnStore.list[0]!;
  const service = kiln.services.find((s) => s.id === p.serviceId) ?? kiln.services[0]!;
  const levels = p.levels.map((l) => ({
    supportHeightCm: l.supportHeightCm,
    shelfThicknessCm: l.shelfThicknessCm,
    allocations: l.segments
      .filter((s): s is Segment => s !== null)
      .map<Allocation>((s) => ({
        contactName: s.contactName,
        fraction: 1 / l.division,
        complexity: cx(s.complexity).factor,
        charged: s.contactName !== MYSELF,
        notes: cx(s.complexity).label,
      })),
  }));
  return {
    kiln,
    serviceBasePrice: service.basePrice,
    serviceName: service.name,
    modifiers: p.modifiers.filter((m) => m.on).map((m) => ({ label: m.label, amount: m.amount })),
    costItems: kiln.defaultCostItems,
    partners: p.partners,
    levels,
  };
}

export function toCoreFiring(): Firing {
  return coreFiringFrom(planner);
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

// ---- App navigation -------------------------------------------------------

export type Screen = "home" | "firing" | "kilnProfiles" | "appSettings";

export const app = $state<{
  screen: Screen;
  agendaOpen: boolean;
  exportOpen: boolean;
  /** When set, the agenda opens in add-mode and assigns the new client on save. */
  agendaAddFor: "assign" | null;
}>({
  screen: "home",
  agendaOpen: false,
  exportOpen: false,
  agendaAddFor: null,
});

/** Open the agenda to create a client and assign the current selection to them. */
export function newClientForAssign(): void {
  app.agendaAddFor = "assign";
  app.agendaOpen = true;
}

export function go(screen: Screen): void {
  // Sync working edits into the active record when leaving the firing screen.
  if (app.screen === "firing" && screen !== "firing") saveActive();
  app.screen = screen;
}

// ---- Firings collection + lifecycle ---------------------------------------

export interface FiringRecord {
  id: string;
  title: string;
  createdAt: number;
  status: "current" | "closed";
  closedAt?: number;
  planner: PlannerState;
  clientNotes: Record<string, string>;
}

export const firings = $state<{ list: FiringRecord[]; activeId: string | null }>({
  list: [],
  activeId: null,
});

function loadIntoPlanner(state: PlannerState): void {
  planner.kilnId = state.kilnId;
  planner.serviceId = state.serviceId;
  planner.levels = state.levels ?? [];
  planner.modifiers = state.modifiers?.length ? state.modifiers : defaultModifiers();
  planner.partners = state.partners ?? [];
}

export function activeFiring(): FiringRecord | null {
  return firings.list.find((f) => f.id === firings.activeId) ?? null;
}

export function currentFirings(): FiringRecord[] {
  return firings.list
    .filter((f) => f.status === "current")
    .sort((a, b) => a.createdAt - b.createdAt); // oldest first = most urgent
}
export function closedFirings(): FiringRecord[] {
  return firings.list
    .filter((f) => f.status === "closed")
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
}

export function newFiring(kilnId: string): void {
  const kiln = kilnStore.list.find((k) => k.id === kilnId) ?? kilnStore.list[0]!;
  const rec: FiringRecord = {
    id: `f${Date.now().toString(36)}${seq++}`,
    title: "",
    createdAt: Date.now(),
    status: "current",
    clientNotes: {},
    planner: {
      kilnId: kiln.id,
      serviceId: kiln.services[0]!.id,
      levels: [],
      modifiers: defaultModifiers(),
      partners: [],
    },
  };
  firings.list.push(rec);
  firings.activeId = rec.id;
  loadIntoPlanner(rec.planner);
  ui.selection = [];
  app.screen = "firing";
  saveApp();
}

export function openFiring(id: string): void {
  const rec = firings.list.find((f) => f.id === id);
  if (!rec) return;
  firings.activeId = id;
  loadIntoPlanner(rec.planner);
  ui.selection = [];
  app.screen = "firing";
}

export function closeActiveFiring(): void {
  const rec = activeFiring();
  if (!rec) return;
  rec.planner = $state.snapshot(planner) as PlannerState; // sync working edits
  rec.status = "closed";
  rec.closedAt = Date.now();
  saveApp();
}

export function deleteFiring(id: string): void {
  firings.list = firings.list.filter((f) => f.id !== id);
  if (firings.activeId === id) firings.activeId = null;
  saveApp();
}

export function setActiveTitle(title: string): void {
  const rec = activeFiring();
  if (rec) rec.title = title;
}

/** Per-client note for THIS firing (distinct from the contact's general note). */
export function clientNote(name: string): string {
  return activeFiring()?.clientNotes[name] ?? "";
}
export function setClientNote(name: string, text: string): void {
  const rec = activeFiring();
  if (rec) rec.clientNotes[name] = text;
}

/** Sync the working planner back into the active firing record + persist. */
export function saveActive(): void {
  const rec = activeFiring();
  if (rec) rec.planner = $state.snapshot(planner) as PlannerState;
  saveApp();
}

// ---- Persistence (whole app) ----------------------------------------------

export function saveApp(): void {
  void storage.write("firings", $state.snapshot(firings.list));
}

export async function loadApp(): Promise<void> {
  await loadKilns();
  await loadSettings();
  const saved = await storage.read<FiringRecord[]>("firings");
  if (Array.isArray(saved)) firings.list = saved;
  await loadContacts();
  if (firings.list.length === 0) seedDemoFiring();
}

// ---- UI / workflow state (transient, not part of the firing doc) ----------

export interface ZoneRef {
  levelId: string;
  segIdx: number;
}

export const ui = $state<{
  /** Zones currently selected in the kiln (the Assign rail acts on these). */
  selection: ZoneRef[];
  /** The cubicle originally clicked (for "assign only this one" on reassign). */
  primaryZone: ZoneRef | null;
  /** Complexity applied when assigning a fresh (free) selection. */
  complexity: ComplexityKey;
  /** Shelf editor popover target: a level id, "new", or null (closed). */
  shelfEditor: string | "new" | null;
  /** Screen anchor for the shelf-editor popover (arrow points here). */
  shelfEditorAnchor: { x: number; y: number } | null;
  /** Zone hovered in the Assign rail → highlighted in the kiln. */
  hoverZone: ZoneRef | null;
}>({
  selection: [],
  primaryZone: null,
  complexity: "simple",
  shelfEditor: null,
  shelfEditorAnchor: null,
  hoverZone: null,
});

// ---- Contacts book (the Agenda mini-app) ----------------------------------

export interface Contact {
  id: string;
  name: string;
  surname?: string;
  phone?: string;
  notes?: string;
  lastUsedAt?: number;
}

export const contacts = $state<{ list: Contact[] }>({ list: [] });

let cseq = 0;
const cid = (): string => `c${Date.now().toString(36)}${cseq++}`;

export async function loadContacts(): Promise<void> {
  const s = await storage.read<{ list?: Contact[]; names?: string[] }>("contacts");
  if (s?.list && Array.isArray(s.list)) contacts.list = s.list;
  else if (s?.names && Array.isArray(s.names)) contacts.list = s.names.map((n) => ({ id: cid(), name: n }));
}
export function saveContacts(): void {
  void storage.write("contacts", $state.snapshot(contacts));
}

export function contactByName(name: string): Contact | undefined {
  return contacts.list.find((c) => c.name === name);
}

/** Ensure a contact exists for this name; bump lastUsed. Returns it. */
export function addContact(name: string): Contact {
  const n = name.trim();
  let c = contacts.list.find((x) => x.name === n);
  if (!c && n) {
    c = { id: cid(), name: n, lastUsedAt: Date.now() };
    contacts.list.push(c);
  } else if (c) {
    c.lastUsedAt = Date.now();
  }
  saveContacts();
  return c ?? { id: "", name: n };
}

export function addContactFull(data: Omit<Contact, "id">): Contact {
  const c: Contact = { id: cid(), ...data };
  contacts.list.push(c);
  saveContacts();
  return c;
}
export function updateContact(id: string, patch: Partial<Contact>): void {
  const c = contacts.list.find((x) => x.id === id);
  if (c) Object.assign(c, patch);
  saveContacts();
}
export function deleteContact(id: string): void {
  contacts.list = contacts.list.filter((c) => c.id !== id);
  saveContacts();
}
export function recentContacts(n = 4): Contact[] {
  return [...contacts.list]
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, n);
}

// ---- Shelf editor popup ---------------------------------------------------

export function openShelfEditor(target: string | "new", anchor?: { x: number; y: number }): void {
  ui.shelfEditor = target;
  ui.shelfEditorAnchor = anchor ?? null;
}
export function closeShelfEditor(): void {
  ui.shelfEditor = null;
  ui.shelfEditorAnchor = null;
}
export function setHoverZone(z: ZoneRef | null): void {
  ui.hoverZone = z;
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
  // Occupancy can never exceed the kiln — clamp any rounding overshoot to 100%.
  return Math.min(1, occ / uH);
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

/**
 * Click a cubicle. A free cubicle toggles in/out of a multi-selection; an
 * assigned cubicle selects ALL of that client's cubicles (client-edit mode) and
 * remembers the clicked one as the primary (for "assign only this" on reassign).
 */
export function toggleSelection(levelId: string, segIdx: number): void {
  const owner = zoneOwner(levelId, segIdx);
  if (owner) {
    selectClientZones(owner);
    ui.primaryZone = { levelId, segIdx };
    return;
  }
  // Free cubicle: if we were editing a client, restart with just this one.
  if (selectionOwners().length > 0) {
    ui.selection = [{ levelId, segIdx }];
  } else {
    const i = ui.selection.findIndex((z) => z.levelId === levelId && z.segIdx === segIdx);
    if (i >= 0) ui.selection.splice(i, 1);
    else ui.selection.push({ levelId, segIdx });
  }
  ui.primaryZone = null;
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

/** Assign the selection to the studio's own (uncharged) work. */
export function assignSelectionToSelf(): void {
  for (const z of ui.selection) {
    setSegment(z.levelId, z.segIdx, { contactName: MYSELF, complexity: ui.complexity });
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

/** Empty ALL selected zones (a whole client's set). */
export function clearSelectedZones(): void {
  for (const z of ui.selection) setSegment(z.levelId, z.segIdx, null);
  clearSelection();
}

/** Empty ONLY the primary cubicle (the one originally clicked). */
export function clearPrimaryZone(): void {
  const p = ui.primaryZone;
  if (!p) return;
  setSegment(p.levelId, p.segIdx, null);
  ui.selection = ui.selection.filter((z) => !(z.levelId === p.levelId && z.segIdx === p.segIdx));
  ui.primaryZone = ui.selection[0] ?? null;
  if (ui.selection.length === 0) clearSelection();
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
  ui.primaryZone = sel[0] ?? null;
}

/** Set the complexity of a single cubicle (per-box editing in client mode). */
export function setZoneComplexity(levelId: string, segIdx: number, cx: ComplexityKey): void {
  const lvl = planner.levels.find((l) => l.id === levelId);
  const seg = lvl?.segments[segIdx];
  if (lvl && seg) lvl.segments[segIdx] = { ...seg, complexity: cx };
}

/** Reassign to another client, either the primary cubicle only or all selected. */
export function reassignTo(name: string, scope: "primary" | "all"): void {
  const n = name.trim();
  if (!n) return;
  addContact(n);
  const zones = scope === "primary" && ui.primaryZone ? [ui.primaryZone] : ui.selection;
  for (const z of zones) {
    const lvl = planner.levels.find((l) => l.id === z.levelId);
    const seg = lvl?.segments[z.segIdx];
    if (lvl && seg) lvl.segments[z.segIdx] = { contactName: n, complexity: seg.complexity };
  }
  clearSelection();
}

/** Human label for a cubicle: shelf number (bottom-up) / position. */
export function zoneLabel(levelId: string, segIdx: number): string {
  const idx = planner.levels.findIndex((l) => l.id === levelId);
  if (idx < 0) return "";
  const shelfNum = planner.levels.length - idx; // bottom = 1
  return `${shelfNum}/${segIdx + 1}`;
}

// Re-export for convenience in components.
export { consumedHeightCm };
