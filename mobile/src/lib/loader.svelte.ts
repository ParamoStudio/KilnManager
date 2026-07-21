/**
 * Mobile kiln-loading state — a deliberately small mirror of the shelf-
 * building + zone-assignment subset of the desktop app's `firing.svelte.ts`
 * (addShelf/setDivision/setSegment/selection/assign/occupancy math), so the
 * numbers and the workflow behave identically, without dragging in
 * partners/modifiers/tickets/vault (desktop-only concerns).
 *
 * The phone never computes €. It only builds a `PlannerDoc` — the same wire
 * shape desktop's `PlannerState` already uses — and hands it off whole.
 * Pricing always runs on desktop, once, when a firing is reviewed there.
 *
 * Kilns/contacts here are the *structural* read-only sync payload (Stage B):
 * no prices, no cost items — just enough geometry to build shelves against,
 * plus the complexity factors (which are structure, not price). For now
 * (Stage A) they're filled by the dev fixture below.
 */
import { storage } from "./storage";

export type ComplexityKey = "simple" | "medium" | "complex";
export const complexityKeys: ComplexityKey[] = ["simple", "medium", "complex"];

export interface Segment {
  contactName: string;
  complexity: ComplexityKey;
}
export interface PlannerLevel {
  id: string;
  supportHeightCm: number;
  shelfThicknessCm: number;
  division: number; // 1 | 2 | 3 | 4 | 5
  segments: (Segment | null)[];
}
/** Same shape as desktop's PlannerState — a valid, complete document even
 * though the phone only ever fills in kilnId/serviceId/levels. */
export interface PlannerDoc {
  kilnId: string;
  serviceId: string;
  levels: PlannerLevel[];
  kilnMods: string[];
  customDiscount: { mode: "percent" | "fixed"; value: number } | null;
  clientMods: Record<string, string[]>;
  partners: { partnerId: string; tierId: string }[];
}

/** Structural-only kiln info synced from desktop (no prices/costs). */
export interface MobileService {
  id: string;
  name: string;
}
export interface MobileKiln {
  id: string;
  name: string;
  shape: "cylinder" | "box";
  diameterCm?: number;
  widthCm?: number;
  depthCm?: number;
  usableHeightCm: number;
  defaultShelfThicknessCm: number;
  standardPostHeightsCm: number[];
  services: MobileService[];
}
export interface MobileContact {
  id: string;
  name: string;
  surname?: string;
}
export interface SavedDraft {
  id: string;
  title: string;
  createdAt: number;
  planner: PlannerDoc;
  /** Per-client notes, keyed by client name (round-trips to the desktop firing). */
  notes: Record<string, string>;
  /** "synced" once this exact version reached the relay; any edit flips it back. */
  status: "draft" | "synced";
  /** When it last reached the relay (drives the one-day local cleanup). */
  syncedAt?: number;
}

/** Synced firings are already safe on the relay/computer, so the phone drops
 * them after a day to stay tidy. Edited ones are never auto-removed. */
const SYNCED_TTL_MS = 24 * 60 * 60 * 1000;

export const MYSELF = "Myself";
/** Per phone, deliberately small. The phone is a notepad you carry to the kiln,
 * not an archive: keeping at most a handful unsynced means less to lose if it's
 * dropped in a bucket of slip, and it nudges you to bring them in. */
export const MAX_DRAFTS = 3;

/** Default complexity factors, matching the desktop defaults. Structure, not
 * price — synced (read-only) from desktop in Stage B; seeded here for now. */
const DEFAULT_COMPLEXITY: Record<ComplexityKey, number> = { simple: 1.0, medium: 1.15, complex: 1.4 };

// ---- Cached, synced-down data (Stage A: fixture; Stage B: real sync) ------
export const synced = $state<{
  kilns: MobileKiln[];
  contacts: MobileContact[];
  complexity: Record<ComplexityKey, number>;
}>({
  kilns: [],
  contacts: [],
  complexity: { ...DEFAULT_COMPLEXITY },
});

export function complexityFactor(key: ComplexityKey): number {
  return synced.complexity[key] ?? DEFAULT_COMPLEXITY[key];
}

// ---- The one draft currently being edited ----------------------------------
// A stable object whose PROPERTIES get reassigned (never the binding itself —
// mirrors how desktop's `ui`/`app`/`planner` singletons work; a bare exported
// `$state<T | null>` can't be reassigned from outside its own module).
function emptyPlanner(kilnId: string, serviceId: string): PlannerDoc {
  return { kilnId, serviceId, levels: [], kilnMods: [], customDiscount: null, clientMods: {}, partners: [] };
}

export const draft = $state<{
  active: boolean;
  /** Stable for the firing's whole life — the phone, the relay and the desktop
   * all key off this, so re-uploading an edited firing overwrites instead of
   * creating a second one. */
  id: string;
  title: string;
  planner: PlannerDoc;
  notes: Record<string, string>;
}>({
  active: false,
  id: "",
  title: "",
  planner: emptyPlanner("", ""),
  notes: {},
});

export function startNewDraft(kilnId: string): void {
  const kiln = synced.kilns.find((k) => k.id === kilnId) ?? synced.kilns[0];
  if (!kiln) return;
  draft.active = true;
  draft.id = newId("f");
  draft.title = "";
  draft.planner = emptyPlanner(kiln.id, kiln.services[0]?.id ?? "");
  draft.notes = {};
  clearSelection();
  persistDraft();
}
/** Close the editor. The firing already lives in the list (and on the relay);
 * a completely empty one is just dropped. */
/** The title and the firing type are edited by binding, so they need their own
 * setters — every other edit already goes through a function that persists. */
export function setDraftTitle(title: string): void {
  draft.title = title;
  persistDraft();
}
export function setDraftService(serviceId: string): void {
  draft.planner.serviceId = serviceId;
  persistDraft();
}

export function closeDraft(): void {
  // Persist the final state FIRST: tearing the draft down before saving would
  // drop whatever was typed last (the title was being lost exactly this way).
  if (draft.planner.levels.length === 0 && !draft.title.trim()) {
    drafts.list = drafts.list.filter((d) => d.id !== draft.id);
    persistDrafts();
  } else {
    persistDraft();
  }
  draft.active = false;
  draft.id = "";
  draft.title = "";
  draft.planner = emptyPlanner("", "");
  draft.notes = {};
  clearSelection();
  void storage.write("draft", $state.snapshot(draft));
}
export function discardDraft(): void {
  drafts.list = drafts.list.filter((d) => d.id !== draft.id);
  persistDrafts();
  draft.active = false;
  draft.id = "";
  draft.title = "";
  draft.planner = emptyPlanner("", "");
  draft.notes = {};
  clearSelection();
  persistDraft();
}

// ---- Saved (pending) drafts, capped at 5 -----------------------------------
export const drafts = $state<{ list: SavedDraft[] }>({ list: [] });

let seq = 0;
/**
 * Ids must be unique across DEVICES, not just within this phone: a studio can
 * have several people loading kilns against the same pairing QR, and the relay
 * keys firings by id. Timestamp + counter alone collide when two phones create
 * a firing in the same millisecond, and one would silently overwrite the other.
 */
const newId = (p: string): string => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${p}${Date.now().toString(36)}${seq++}${rand}`;
};

/** Only firings the computer hasn't collected yet count against the cap. Ones
 * already synced are just receipts waiting to expire — being blocked by those
 * would be nonsense, since there's nothing left to go and fetch. */
export function pendingCount(): number {
  return drafts.list.filter((d) => d.status !== "synced").length;
}
export function canSaveNewDraft(): boolean {
  return pendingCount() < MAX_DRAFTS;
}
export function deleteDraft(id: string): void {
  drafts.list = drafts.list.filter((d) => d.id !== id);
  persistDrafts();
}
/** Clear every already-synced firing at once (they're safe to drop — the
 * desktop already has them). */
export function deleteSyncedDrafts(): void {
  drafts.list = drafts.list.filter((d) => d.status !== "synced");
  persistDrafts();
}
/** Flip a saved draft's sync status (used by the sync client). */
export function setDraftStatus(id: string, status: "draft" | "synced"): void {
  const d = drafts.list.find((x) => x.id === id);
  if (!d) return;
  d.status = status;
  if (status === "synced") d.syncedAt = Date.now();
  persistDrafts();
}
/** Distinct clients assigned across a draft (Myself counts as one owner). */
export function distinctClients(planner: PlannerDoc): number {
  const set = new Set<string>();
  for (const l of planner.levels) for (const s of l.segments) if (s) set.add(s.contactName);
  return set.size;
}
/** Open a saved firing for editing. It KEEPS its id and stays in the list —
 * edits overwrite it everywhere instead of spawning a duplicate. */
export function resumeDraft(id: string): boolean {
  const d = drafts.list.find((x) => x.id === id);
  if (!d) return false;
  draft.active = true;
  draft.id = d.id;
  draft.title = d.title;
  draft.planner = JSON.parse(JSON.stringify(d.planner)) as PlannerDoc;
  draft.notes = { ...(d.notes ?? {}) };
  clearSelection();
  persistDraft();
  return true;
}

// ---- Kiln / service lookup within the current draft ------------------------
export function currentKiln(planner: PlannerDoc): MobileKiln | null {
  return synced.kilns.find((k) => k.id === planner.kilnId) ?? synced.kilns[0] ?? null;
}
export function currentService(planner: PlannerDoc): MobileService | null {
  const kiln = currentKiln(planner);
  return kiln?.services.find((s) => s.id === planner.serviceId) ?? kiln?.services[0] ?? null;
}

// ---- Shelf geometry (mirrors firing.svelte.ts exactly) ---------------------
export function totalConsumedCm(planner: PlannerDoc): number {
  return planner.levels.reduce((a, l) => a + l.supportHeightCm + l.shelfThicknessCm, 0);
}
export function remainingCm(planner: PlannerDoc): number {
  const kiln = currentKiln(planner);
  return Math.max(0, (kiln?.usableHeightCm ?? 0) - totalConsumedCm(planner));
}
export function roomForNewShelf(planner: PlannerDoc): number {
  const kiln = currentKiln(planner);
  return remainingCm(planner) - (kiln?.defaultShelfThicknessCm ?? 0);
}
export function addShelf(planner: PlannerDoc, supportHeightCm: number, division: number): string | null {
  const kiln = currentKiln(planner);
  if (!kiln) return null;
  const thickness = kiln.defaultShelfThicknessCm;
  const room = remainingCm(planner) - thickness;
  if (room <= 0) return null;
  const support = Math.max(2, Math.min(supportHeightCm, room));
  const div = Math.max(1, Math.min(5, Math.round(division)));
  const id = newId("l");
  planner.levels.unshift({
    id,
    supportHeightCm: support,
    shelfThicknessCm: thickness,
    division: div,
    segments: Array.from({ length: div }, () => null),
  });
  persistDraft();
  return id;
}
export function removeLevel(planner: PlannerDoc, id: string): void {
  planner.levels = planner.levels.filter((l) => l.id !== id);
  sel.selection = sel.selection.filter((z) => z.levelId !== id);
  if (sel.primaryZone?.levelId === id) sel.primaryZone = sel.selection[0] ?? null;
  persistDraft();
}
export function setDivision(planner: PlannerDoc, id: string, division: number): void {
  const lvl = planner.levels.find((l) => l.id === id);
  if (!lvl || lvl.division === division) return;
  lvl.division = division;
  lvl.segments = Array.from({ length: division }, () => null);
  sel.selection = sel.selection.filter((z) => !(z.levelId === id && z.segIdx >= division));
  persistDraft();
}
export function setSegment(planner: PlannerDoc, id: string, segIdx: number, seg: Segment | null): void {
  const lvl = planner.levels.find((l) => l.id === id);
  if (!lvl || segIdx < 0 || segIdx >= lvl.segments.length) return;
  lvl.segments[segIdx] = seg;
  persistDraft();
}
export function setSupportHeight(planner: PlannerDoc, id: string, cm: number): void {
  const lvl = planner.levels.find((l) => l.id === id);
  const kiln = currentKiln(planner);
  if (!lvl || !kiln) return;
  const others = totalConsumedCm(planner) - (lvl.supportHeightCm + lvl.shelfThicknessCm);
  const maxSupport = kiln.usableHeightCm - others - lvl.shelfThicknessCm;
  lvl.supportHeightCm = Math.max(2, Math.min(cm, maxSupport));
  persistDraft();
}
export function occupiedFraction(level: PlannerLevel): number {
  if (level.division === 0) return 0;
  return level.segments.filter((s) => s !== null).length / level.division;
}
export function occupiedVolumeFraction(planner: PlannerDoc): number {
  const kiln = currentKiln(planner);
  const uH = kiln?.usableHeightCm ?? 0;
  if (uH <= 0) return 0;
  let occ = 0;
  for (const l of planner.levels) occ += (l.supportHeightCm + l.shelfThicknessCm) * occupiedFraction(l);
  return Math.min(1, occ / uH);
}
export function occupancyBand(frac: number): "low" | "balanced" | "high" {
  if (frac <= 0.3) return "low";
  if (frac <= 0.7) return "balanced";
  return "high";
}
/** Shelf number (bottom-up) / position — matches desktop's zoneLabel exactly. */
export function zoneLabel(planner: PlannerDoc, levelId: string, segIdx: number): string {
  const idx = planner.levels.findIndex((l) => l.id === levelId);
  if (idx < 0) return "";
  const shelfNum = planner.levels.length - idx;
  return `${shelfNum}/${segIdx + 1}`;
}

// ---- Zone selection + assignment (transient UI state) ----------------------
export interface ZoneRef {
  levelId: string;
  segIdx: number;
}
export const sel = $state<{ selection: ZoneRef[]; primaryZone: ZoneRef | null; complexity: ComplexityKey }>({
  selection: [],
  primaryZone: null,
  complexity: "simple",
});

/** Distinct owners in order of appearance (drives per-client colour slots). */
export function clientNames(): string[] {
  const seen: string[] = [];
  for (const l of draft.planner.levels) {
    for (const s of l.segments) {
      if (s && !seen.includes(s.contactName)) seen.push(s.contactName);
    }
  }
  return seen;
}
export function zoneOwner(levelId: string, segIdx: number): string | null {
  return draft.planner.levels.find((l) => l.id === levelId)?.segments[segIdx]?.contactName ?? null;
}
export function isSelected(levelId: string, segIdx: number): boolean {
  return sel.selection.some((z) => z.levelId === levelId && z.segIdx === segIdx);
}
/**
 * Tap a zone. A free zone toggles in/out of a multi-selection; an assigned zone
 * selects ALL of that client's zones (client-edit mode) and remembers the
 * tapped one as the primary (for "empty only this" in the edit sheet).
 */
export function toggleSelection(levelId: string, segIdx: number): void {
  const owner = zoneOwner(levelId, segIdx);
  if (owner) {
    selectClientZones(owner);
    sel.primaryZone = { levelId, segIdx };
    return;
  }
  if (selectionOwners().length > 0) {
    sel.selection = [{ levelId, segIdx }];
  } else {
    const i = sel.selection.findIndex((z) => z.levelId === levelId && z.segIdx === segIdx);
    if (i >= 0) sel.selection.splice(i, 1);
    else sel.selection.push({ levelId, segIdx });
  }
  sel.primaryZone = null;
}
export function clearSelection(): void {
  sel.selection = [];
  sel.primaryZone = null;
}
export function selectionOwners(): string[] {
  const set = new Set<string>();
  for (const z of sel.selection) {
    const o = zoneOwner(z.levelId, z.segIdx);
    if (o) set.add(o);
  }
  return [...set];
}
export function selectClientZones(name: string): void {
  const list: ZoneRef[] = [];
  for (const l of draft.planner.levels) {
    l.segments.forEach((s, i) => {
      if (s?.contactName === name) list.push({ levelId: l.id, segIdx: i });
    });
  }
  sel.selection = list;
  sel.primaryZone = list[0] ?? null;
}
export function segmentAt(z: ZoneRef): Segment | null {
  return draft.planner.levels.find((l) => l.id === z.levelId)?.segments[z.segIdx] ?? null;
}
/** Assign every selected zone to a client, with the current complexity. */
export function assignSelectionTo(name: string): void {
  const n = name.trim();
  if (!n) return;
  for (const z of sel.selection) {
    setSegment(draft.planner, z.levelId, z.segIdx, { contactName: n, complexity: sel.complexity });
  }
  clearSelection();
}
/** Assign the selection to the studio's own (uncharged) work. */
export function assignSelectionToSelf(): void {
  for (const z of sel.selection) {
    setSegment(draft.planner, z.levelId, z.segIdx, { contactName: MYSELF, complexity: sel.complexity });
  }
  clearSelection();
}
/** Apply the current complexity to the selected zones (before assigning). */
export function applyComplexityToSelection(cx: ComplexityKey): void {
  sel.complexity = cx;
  for (const z of sel.selection) {
    const s = segmentAt(z);
    if (s) setSegment(draft.planner, z.levelId, z.segIdx, { ...s, complexity: cx });
  }
}
/** Set the complexity of one zone (per-zone editing in client-edit mode). */
export function setZoneComplexity(levelId: string, segIdx: number, cx: ComplexityKey): void {
  const s = segmentAt({ levelId, segIdx });
  if (s) setSegment(draft.planner, levelId, segIdx, { ...s, complexity: cx });
}
/** Reassign selected zones to another client (the primary only, or all). */
export function reassignTo(name: string, scope: "primary" | "all"): void {
  const n = name.trim();
  if (!n) return;
  const zones = scope === "primary" && sel.primaryZone ? [sel.primaryZone] : sel.selection;
  for (const z of zones) {
    const s = segmentAt(z);
    if (s) setSegment(draft.planner, z.levelId, z.segIdx, { contactName: n, complexity: s.complexity });
  }
  clearSelection();
}
/** Empty ALL selected zones (a whole client's set). */
export function clearSelectedZones(): void {
  for (const z of sel.selection) setSegment(draft.planner, z.levelId, z.segIdx, null);
  clearSelection();
}
/** Empty ONLY the primary zone (the one originally tapped). */
export function clearPrimaryZone(): void {
  const p = sel.primaryZone;
  if (!p) return;
  setSegment(draft.planner, p.levelId, p.segIdx, null);
  sel.selection = sel.selection.filter((z) => !(z.levelId === p.levelId && z.segIdx === p.segIdx));
  sel.primaryZone = sel.selection[0] ?? null;
  if (sel.selection.length === 0) clearSelection();
}

// ---- Per-client notes -------------------------------------------------------
export function clientNote(name: string): string {
  return draft.notes[name] ?? "";
}
export function setClientNote(name: string, text: string): void {
  if (text) draft.notes[name] = text;
  else delete draft.notes[name];
  persistDraft();
}

// ---- Persistence ------------------------------------------------------------

/** The sync client registers here so every edit can be pushed automatically.
 * Kept as a hook (rather than importing sync) so there's no import cycle. */
let changeHook: (() => void) | null = null;
export function setDraftChangeHook(fn: (() => void) | null): void {
  changeHook = fn;
}

/** Mirror the live draft into the saved list. Any content change marks it
 * unsynced again, which is what schedules the automatic re-upload. */
function upsertActiveDraft(): void {
  if (!draft.active || !draft.id) return;
  const i = drafts.list.findIndex((d) => d.id === draft.id);
  const entry: SavedDraft = {
    id: draft.id,
    title: draft.title.trim(),
    createdAt: i >= 0 ? drafts.list[i]!.createdAt : Date.now(),
    planner: $state.snapshot(draft.planner) as PlannerDoc,
    notes: $state.snapshot(draft.notes) as Record<string, string>,
    status: "draft",
  };
  if (i >= 0) drafts.list[i] = entry;
  else if (canSaveNewDraft()) drafts.list.push(entry);
  else return;
  persistDrafts();
}

function persistDraft(): void {
  upsertActiveDraft();
  void storage.write("draft", $state.snapshot(draft));
  changeHook?.();
}
function persistDrafts(): void {
  void storage.write("drafts", $state.snapshot(drafts.list));
}

export async function loadCached(): Promise<void> {
  const k = await storage.read<MobileKiln[]>("kilns");
  if (Array.isArray(k)) synced.kilns = k;
  const c = await storage.read<MobileContact[]>("contacts");
  if (Array.isArray(c)) synced.contacts = c;
  const cx = await storage.read<Record<ComplexityKey, number>>("complexity");
  if (cx) synced.complexity = { ...DEFAULT_COMPLEXITY, ...cx };
  const d = await storage.read<SavedDraft[]>("drafts");
  if (Array.isArray(d)) {
    const now = Date.now();
    drafts.list = d
      .map((x) => ({ ...x, notes: x.notes ?? {}, status: x.status ?? "draft" }))
      // Already on the computer and a day old → drop it, the phone is a
      // notepad, not an archive.
      .filter((x) => !(x.status === "synced" && x.syncedAt && now - x.syncedAt > SYNCED_TTL_MS));
  }
  const saved = await storage.read<{ active: boolean; id?: string; title: string; planner: PlannerDoc; notes?: Record<string, string> }>("draft");
  if (saved && saved.active && saved.id) {
    draft.active = true;
    draft.id = saved.id;
    draft.title = saved.title;
    draft.planner = saved.planner;
    draft.notes = saved.notes ?? {};
  }
}

// ---- Dev-only fixture (stands in for Stage B's real sync) -----------------
export async function seedFixture(): Promise<void> {
  synced.kilns = [
    {
      id: "demo-1",
      name: "Test Kiln",
      shape: "cylinder",
      diameterCm: 40,
      usableHeightCm: 62,
      defaultShelfThicknessCm: 1.5,
      standardPostHeightsCm: [5, 8, 12, 20],
      services: [
        { id: "svc-1", name: "High Reduction" },
        { id: "svc-2", name: "Bisque" },
      ],
    },
    {
      id: "demo-2",
      name: "Small Test Kiln",
      shape: "box",
      widthCm: 30,
      depthCm: 30,
      usableHeightCm: 45,
      defaultShelfThicknessCm: 1.2,
      standardPostHeightsCm: [5, 8, 12],
      services: [{ id: "svc-3", name: "Glaze Firing" }],
    },
  ];
  synced.contacts = [
    { id: "c1", name: "Gero" },
    { id: "c2", name: "Lua" },
    { id: "c3", name: "María", surname: "Ortiz" },
  ];
  synced.complexity = { ...DEFAULT_COMPLEXITY };
  await storage.write("kilns", synced.kilns);
  await storage.write("contacts", synced.contacts);
  await storage.write("complexity", synced.complexity);
}
