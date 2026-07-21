import type { Firing, Allocation, KilnProfile, FiringService, KilnModifier, AppliedModifier } from "@core";
import { consumedHeightCm } from "@core";
import { kilnStore, loadKilns } from "./kilns.svelte";
import { type ComplexityKey } from "./complexity";
import { cx, loadSettings, fuelCostFor, fuelDefFor, resolvePartner, defaultTierRef } from "./settings.svelte";
import { loadPayments } from "./payments.svelte";
import { loadLocale } from "./i18n.svelte";
import { markContactsDirty } from "./syncflags.svelte";
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
  division: number; // 1 | 2 | 3 | 4 | 5
  segments: (Segment | null)[]; // length === division
}

export interface PlannerState {
  kilnId: string;
  serviceId: string;
  levels: PlannerLevel[]; // index 0 = topmost level
  kilnMods: string[]; // active full-kiln modifier ids (surcharge or discount)
  customDiscount: { mode: "percent" | "fixed"; value: number } | null; // firing-wide failsafe
  clientMods: Record<string, string[]>; // client name → applied client-modifier ids
  partners: { partnerId: string; tierId: string }[]; // applied partner + chosen tier
}

function initialState(): PlannerState {
  const kiln = kilnStore.list[0]; // may be undefined on a fresh, kiln-less install
  return {
    kilnId: kiln?.id ?? "",
    serviceId: kiln?.services[0]?.id ?? "",
    levels: [],
    kilnMods: [],
    customDiscount: null,
    clientMods: {},
    partners: [],
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
  const div = Math.max(1, Math.min(5, Math.round(division)));
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

// ---- Modifiers ------------------------------------------------------------

/** The current kiln's defined modifiers. */
export function kilnModifiers(): KilnModifier[] {
  return currentKiln().modifiers ?? [];
}
export function fullKilnMods(): KilnModifier[] {
  return kilnModifiers().filter((m) => m.scope === "full-kiln");
}
export function clientScopeMods(): KilnModifier[] {
  return kilnModifiers().filter((m) => m.scope === "client");
}
export const modSign = (m: { family: "surcharge" | "discount" }): number =>
  m.family === "surcharge" ? 1 : -1;

// ---- Full-kiln modifiers (checkbox toggles) ----
export function toggleKilnMod(id: string): void {
  const i = planner.kilnMods.indexOf(id);
  if (i >= 0) planner.kilnMods.splice(i, 1);
  else planner.kilnMods.push(id);
}
export function setCustomDiscount(mode: "percent" | "fixed", value: number): void {
  planner.customDiscount = value > 0 ? { mode, value } : null;
}
export function clearCustomDiscount(): void {
  planner.customDiscount = null;
}

// ---- Client modifiers (assigned to a client by picking a shelf) ----
export function modsForClient(name: string): KilnModifier[] {
  const ids = planner.clientMods[name] ?? [];
  const defined = kilnModifiers();
  return ids.map((id) => defined.find((m) => m.id === id)).filter((m): m is KilnModifier => !!m);
}
export function clientHasMods(name: string | null): boolean {
  return !!name && (planner.clientMods[name]?.length ?? 0) > 0;
}
/** Arm "pick a shelf" mode for a client modifier (shows the kiln banner). */
export function startClientMod(id: string): void {
  ui.pendingClientMod = ui.pendingClientMod === id ? null : id;
}
export function cancelClientMod(): void {
  ui.pendingClientMod = null;
}
/** Apply the armed client modifier to whichever client owns the clicked zone. */
export function applyPendingClientModAt(levelId: string, segIdx: number): void {
  const id = ui.pendingClientMod;
  if (!id) return;
  const owner = planner.levels.find((l) => l.id === levelId)?.segments[segIdx]?.contactName ?? null;
  if (owner && owner !== MYSELF) {
    const list = planner.clientMods[owner] ?? [];
    if (!list.includes(id)) planner.clientMods[owner] = [...list, id];
  }
  ui.pendingClientMod = null;
}
// ---- Partners (in the firing modifiers) ----
export function partnerTierActive(partnerId: string, tierId: string): boolean {
  return planner.partners.some((p) => p.partnerId === partnerId && p.tierId === tierId);
}
export function partnerActive(partnerId: string): boolean {
  return planner.partners.some((p) => p.partnerId === partnerId);
}
/** Toggle a partner's tier: click active tier → off; another tier → switch. */
export function togglePartnerTier(partnerId: string, tierId: string): void {
  const i = planner.partners.findIndex((p) => p.partnerId === partnerId);
  if (i < 0) planner.partners.push({ partnerId, tierId });
  else if (planner.partners[i]!.tierId === tierId) planner.partners.splice(i, 1);
  else planner.partners[i] = { partnerId, tierId };
}

export function removeClientMod(name: string, id: string): void {
  const list = planner.clientMods[name] ?? [];
  const next = list.filter((x) => x !== id);
  if (next.length) planner.clientMods[name] = next;
  else delete planner.clientMods[name];
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
  // Variable fuel cost = this service's consumption × the fuel's current price.
  const fuelItem = {
    name: fuelDefFor(kiln).label,
    amount: fuelCostFor(kiln, service.fuelUse ?? 0),
    kind: "variable" as const,
  };
  return {
    kiln,
    serviceBasePrice: service.basePrice,
    serviceName: service.name,
    modifiers: resolveModifiers(kiln, p),
    clientModifiers: resolveClientModifiers(kiln, p),
    costItems: [fuelItem, ...kiln.defaultCostItems],
    partners: (p.partners ?? [])
      .map((pp) => {
        const a = pp as unknown as { name?: string; pct?: number; partnerId?: string; tierId?: string };
        if (typeof a.pct === "number" && typeof a.name === "string") return { name: a.name, pct: a.pct }; // legacy shape
        if (a.partnerId && a.tierId) return resolvePartner({ partnerId: a.partnerId, tierId: a.tierId });
        return null;
      })
      .filter((x): x is { name: string; pct: number } => !!x),
    levels,
  };
}

/** Full-kiln modifiers (ticked) + the firing-wide custom discount → engine lines. */
function resolveModifiers(kiln: KilnProfile, p: PlannerState): { label: string; mode: "percent" | "fixed"; amount: number }[] {
  const defined = kiln.modifiers ?? [];
  const active = p.kilnMods ?? []; // guard: legacy records may lack this field
  const out: { label: string; mode: "percent" | "fixed"; amount: number }[] = [];
  for (const m of defined) {
    if (m.scope === "full-kiln" && active.includes(m.id)) {
      out.push({ label: m.name, mode: m.mode, amount: modSign(m) * m.value });
    }
  }
  if (p.customDiscount) {
    out.push({ label: "Custom discount", mode: p.customDiscount.mode, amount: -p.customDiscount.value });
  }
  return out;
}

/** Per-client modifiers → a map of engine AppliedModifier lines by client name. */
function resolveClientModifiers(kiln: KilnProfile, p: PlannerState): Record<string, AppliedModifier[]> {
  const defined = kiln.modifiers ?? [];
  const map: Record<string, AppliedModifier[]> = {};
  for (const [name, ids] of Object.entries(p.clientMods ?? {})) {
    const arr: AppliedModifier[] = [];
    for (const id of ids) {
      const m = defined.find((x) => x.id === id && x.scope === "client");
      if (m) arr.push({ mode: m.mode, amount: modSign(m) * m.value });
    }
    if (arr.length) map[name] = arr;
  }
  return map;
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

export type Screen = "home" | "firing" | "kilnProfiles" | "expenses" | "appSettings";

export const app = $state<{
  screen: Screen;
  agendaOpen: boolean;
  /** Firing record id whose Outputs panel is open (on close, or from the log). */
  outputsFor: string | null;
  /** True when the panel opened right after closing → auto-export tickets once. */
  outputsAutoExport: boolean;
  /** When set, the agenda opens in add-mode and assigns the new client on save. */
  agendaAddFor: "assign" | null;
  /** Shown until the studio has at least one kiln. */
  firstKilnOpen: boolean;
  /** When set, Kiln Profiles opens this kiln straight in the editor. */
  editKilnId: string | null;
}>({
  screen: "home",
  agendaOpen: false,
  outputsFor: null,
  outputsAutoExport: false,
  agendaAddFor: null,
  firstKilnOpen: false,
  editKilnId: null,
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
  /** Where the firing came from — set when imported from the phone loader. */
  source?: "phone";
}

export const firings = $state<{ list: FiringRecord[]; activeId: string | null }>({
  list: [],
  activeId: null,
});

function loadIntoPlanner(state: PlannerState): void {
  planner.kilnId = state.kilnId;
  planner.serviceId = state.serviceId;
  planner.levels = state.levels ?? [];
  planner.kilnMods = state.kilnMods ?? [];
  planner.customDiscount = state.customDiscount ?? null;
  planner.clientMods = state.clientMods ?? {};
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
      kilnMods: [],
      customDiscount: null,
      clientMods: {},
      partners: (() => {
        const d = defaultTierRef();
        return d ? [d] : [];
      })(),
    },
  };
  firings.list.push(rec);
  firings.activeId = rec.id;
  loadIntoPlanner(rec.planner);
  ui.selection = [];
  app.screen = "firing";
  saveApp();
}

/** Import a firing built on the phone as a new "current" firing, tagged so it's
 * visually distinguishable until the ceramicist reviews/prices it here. The
 * phone sends the same PlannerState shape the app already uses — no translation,
 * no pricing done on the phone. Missing fields are filled defensively. */
export function importPhoneFiring(item: {
  id?: string;
  title?: string;
  firing: PlannerState;
  notes?: Record<string, string>;
}): void {
  const p = item.firing ?? ({} as PlannerState);
  const kiln = kilnStore.list.find((k) => k.id === p.kilnId) ?? kilnStore.list[0];
  const rec: FiringRecord = {
    id: `f${Date.now().toString(36)}${seq++}`,
    title: item.title ?? "",
    createdAt: Date.now(),
    status: "current",
    source: "phone",
    clientNotes: item.notes ?? {},
    planner: {
      kilnId: p.kilnId || kiln?.id || "",
      serviceId: p.serviceId || kiln?.services[0]?.id || "",
      levels: p.levels ?? [],
      kilnMods: p.kilnMods ?? [],
      customDiscount: p.customDiscount ?? null,
      clientMods: p.clientMods ?? {},
      partners:
        p.partners && p.partners.length
          ? p.partners
          : (() => {
              const d = defaultTierRef();
              return d ? [d] : [];
            })(),
    },
  };
  firings.list.push(rec);
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
  // Go to Home in the background so the (now closed) firing screen isn't left
  // behind the panel — it's a log entry now, not a current firing.
  app.screen = "home";
  app.outputsAutoExport = true; // export the client tickets once, on close
  app.outputsFor = rec.id; // open the Outputs panel for the just-closed firing
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
  const snap = $state.snapshot(firings.list) as FiringRecord[];
  // Split by status so the folder stays clean and self-explanatory.
  void storage.write("PendingFirings", snap.filter((f) => f.status === "current"));
  void storage.write("FiringsLog", snap.filter((f) => f.status === "closed"));
}

export async function loadApp(): Promise<void> {
  await loadLocale(); // first: so seed localization + labels use the active language
  await loadKilns();
  await loadSettings();
  const pending = await storage.read<FiringRecord[]>("PendingFirings");
  const log = await storage.read<FiringRecord[]>("FiringsLog");
  if (Array.isArray(pending) || Array.isArray(log)) {
    firings.list = [...(pending ?? []), ...(log ?? [])];
  } else {
    // Legacy single-file store (pre-split) — read once if present.
    const legacy = await storage.read<FiringRecord[]>("firings");
    if (Array.isArray(legacy)) firings.list = legacy;
  }
  await loadContacts();
  await loadPayments();
}

// ---- UI / workflow state (transient, not part of the firing doc) ----------

export interface ZoneRef {
  levelId: string;
  segIdx: number;
}

export const ui = $state<{
  /** Zones currently selected in the kiln (the Assign rail acts on these). */
  selection: ZoneRef[];
  /** The shelf originally clicked (for "assign only this one" on reassign). */
  primaryZone: ZoneRef | null;
  /** Complexity applied when assigning a fresh (free) selection. */
  complexity: ComplexityKey;
  /** Shelf editor popover target: a level id, "new", or null (closed). */
  shelfEditor: string | "new" | null;
  /** Screen anchor for the shelf-editor popover (arrow points here). */
  shelfEditorAnchor: { x: number; y: number } | null;
  /** Zone hovered in the Assign rail → highlighted in the kiln. */
  hoverZone: ZoneRef | null;
  /** When set, clicking a shelf applies this client-modifier to its owner. */
  pendingClientMod: string | null;
}>({
  selection: [],
  primaryZone: null,
  complexity: "simple",
  shelfEditor: null,
  shelfEditorAnchor: null,
  hoverZone: null,
  pendingClientMod: null,
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
  markContactsDirty();
  return c;
}
export function updateContact(id: string, patch: Partial<Contact>): void {
  const c = contacts.list.find((x) => x.id === id);
  if (c) Object.assign(c, patch);
  saveContacts();
  markContactsDirty();
}
export function deleteContact(id: string): void {
  contacts.list = contacts.list.filter((c) => c.id !== id);
  saveContacts();
  markContactsDirty();
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
 * Click a shelf. A free shelf toggles in/out of a multi-selection; an
 * assigned shelf selects ALL of that client's shelves (client-edit mode) and
 * remembers the clicked one as the primary (for "assign only this" on reassign).
 */
export function toggleSelection(levelId: string, segIdx: number): void {
  const owner = zoneOwner(levelId, segIdx);
  if (owner) {
    selectClientZones(owner);
    ui.primaryZone = { levelId, segIdx };
    return;
  }
  // Free shelf: if we were editing a client, restart with just this one.
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

/** Empty ONLY the primary shelf (the one originally clicked). */
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

/** Set the complexity of a single shelf (per-box editing in client mode). */
export function setZoneComplexity(levelId: string, segIdx: number, cx: ComplexityKey): void {
  const lvl = planner.levels.find((l) => l.id === levelId);
  const seg = lvl?.segments[segIdx];
  if (lvl && seg) lvl.segments[segIdx] = { ...seg, complexity: cx };
}

/** Reassign to another client, either the primary shelf only or all selected. */
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

/** Human label for a shelf: shelf number (bottom-up) / position. */
export function zoneLabel(levelId: string, segIdx: number): string {
  const idx = planner.levels.findIndex((l) => l.id === levelId);
  if (idx < 0) return "";
  const shelfNum = planner.levels.length - idx; // bottom = 1
  return `${shelfNum}/${segIdx + 1}`;
}

// Re-export for convenience in components.
export { consumedHeightCm };
