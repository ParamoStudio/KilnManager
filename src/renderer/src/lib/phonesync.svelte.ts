/**
 * Desktop side of the phone-loading bridge. Owns the pairing config, pushes the
 * read-only payload down to the relay (contacts + kiln STRUCTURE + complexity
 * factors — never prices), and imports firings the phone has uploaded.
 *
 * See relay/worker.ts for the endpoints, and mobile/src/lib/sync.svelte.ts for
 * the phone half. This is plain HTTPS fetch — no Electron/native access needed.
 */
import { contacts, firings, importPhoneFiring } from "./firing.svelte";
import { kilnStore } from "./kilns.svelte";
import { settings } from "./settings.svelte";
import { syncDirty, setDirtyHook } from "./syncflags.svelte";
import { complexityKeys } from "./complexity";
import { RELAY_BASE, MOBILE_APP_URL, bridgeConfigured } from "./syncconfig";
import { storage } from "./storage";

interface PhoneSyncConfig {
  token: string;
}

export const phone = $state<{
  token: string;
  paired: boolean;
  pending: number; // firings waiting on the relay
  pendingNew: number; // …of those, ones we've never seen
  pendingUpdate: number; // …and ones that update a firing already here
  busy: boolean;
  lastError: string;
  /** Drives the little "checking the phone…" notice so the sync is visible. */
  phase: "idle" | "checking" | "done";
  lastCreated: number;
  lastUpdated: number;
}>({
  token: "",
  paired: false,
  pending: 0,
  pendingNew: 0,
  pendingUpdate: 0,
  busy: false,
  lastError: "",
  phase: "idle",
  lastCreated: 0,
  lastUpdated: 0,
});

function persist(): void {
  const cfg: PhoneSyncConfig = { token: phone.token };
  void storage.write("phoneSync", cfg);
}

export async function loadPhoneSync(): Promise<void> {
  const cfg = await storage.read<PhoneSyncConfig>("phoneSync");
  phone.token = cfg?.token ?? "";
  phone.paired = !!(bridgeConfigured() && phone.token);
}

/** Generate a fresh pairing token. Endpoints are fixed at build time.
 * Immediately seeds the phone's mailbox so the very first scan already finds
 * this studio's kilns and clients waiting — no "press sync on both" dance. */
export function generatePairing(): void {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  phone.token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  phone.paired = !!(bridgeConfigured() && phone.token);
  persist();
  if (phone.paired) {
    void pushDown().catch((e) => {
      phone.lastError = e instanceof Error ? e.message : String(e);
    });
  }
}
export function revokePairing(): void {
  phone.token = "";
  phone.paired = false;
  persist();
}

/** The URL the QR encodes: the mobile PWA with the pairing baked into the hash. */
export function pairUrl(): string {
  return `${MOBILE_APP_URL.replace(/\/+$/, "")}/#pair=${phone.token}~${encodeURIComponent(RELAY_BASE)}`;
}

function channel(box: "down" | "up"): string {
  return `${RELAY_BASE.replace(/\/+$/, "")}/channel/${phone.token}/${box}`;
}

/** The phone-facing payload: structure only, no €. */
function buildDown(): unknown {
  return {
    contacts: contacts.list.map((c) => ({ id: c.id, name: c.name, surname: c.surname })),
    kilns: kilnStore.list.map((k) => ({
      id: k.id,
      name: k.name,
      shape: k.shape,
      diameterCm: k.diameterCm,
      widthCm: k.widthCm,
      depthCm: k.depthCm,
      usableHeightCm: k.usableHeightCm,
      defaultShelfThicknessCm: k.defaultShelfThicknessCm,
      standardPostHeightsCm: k.standardPostHeightsCm,
      services: k.services.map((s) => ({ id: s.id, name: s.name })), // no basePrice/fuelUse
    })),
    complexity: Object.fromEntries(complexityKeys.map((key) => [key, settings.complexity[key].factor])),
  };
}

/** Push contacts + kiln structure + complexity to the phone's mailbox. */
export async function pushDown(): Promise<void> {
  if (!phone.paired) return;
  const res = await fetch(channel("down"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDown()),
  });
  if (!res.ok) throw new Error(`down ${res.status}`);
  syncDirty.contacts = false;
  syncDirty.kilns = false;
}

/** How many phone firings are waiting, split into brand-new vs. edits to a
 * firing we already hold — the phone can tell you which, so it should. */
export async function checkUp(): Promise<number> {
  if (!phone.paired) return 0;
  const res = await fetch(channel("up"), { method: "GET" });
  if (!res.ok) throw new Error(`up ${res.status}`);
  const list = (await res.json()) as { id?: string }[];
  const rows = Array.isArray(list) ? list : [];
  const known = new Set(firings.list.filter((f) => f.status === "current" && f.phoneId).map((f) => f.phoneId));
  phone.pendingUpdate = rows.filter((x) => x.id && known.has(x.id)).length;
  phone.pendingNew = rows.length - phone.pendingUpdate;
  phone.pending = rows.length;
  return phone.pending;
}

interface UpItem {
  id: string;
  title?: string;
  firing: unknown;
  notes?: Record<string, string>;
}

/** Import every pending phone firing, then clear the relay's up-box. */
export async function importFromPhone(): Promise<number> {
  if (!phone.paired) return 0;
  const res = await fetch(channel("up"), { method: "GET" });
  if (!res.ok) throw new Error(`up ${res.status}`);
  const list = (await res.json()) as UpItem[];
  if (!Array.isArray(list) || list.length === 0) {
    phone.pending = phone.pendingNew = phone.pendingUpdate = 0;
    return 0;
  }
  const known = new Set(firings.list.filter((f) => f.status === "current" && f.phoneId).map((f) => f.phoneId));
  let created = 0;
  let updated = 0;
  for (const item of list) {
    if (item.id && known.has(item.id)) updated++;
    else created++;
    importPhoneFiring({
      id: item.id,
      title: item.title,
      firing: item.firing as never,
      notes: item.notes,
    });
  }
  // Confirm consumption so the phone drops them on its next check.
  await fetch(channel("up"), { method: "DELETE" });
  phone.pending = phone.pendingNew = phone.pendingUpdate = 0;
  phone.lastCreated = created;
  phone.lastUpdated = updated;
  return list.length;
}

/**
 * Non-blocking pass on app open: refresh the phone's copy of contacts/kilns,
 * then pull down whatever it uploaded. Importing is safe to do automatically —
 * firings keep their phone id, so a firing still being edited on the phone
 * updates this same record rather than piling up duplicates.
 */
export async function phoneSyncOnOpen(): Promise<void> {
  if (!phone.paired) return;
  phone.phase = "checking";
  phone.lastError = "";
  phone.lastCreated = phone.lastUpdated = 0;
  // Hold the notice on screen long enough to actually be read, even when the
  // round-trip takes 200 ms — otherwise the sync is invisible and the user has
  // no idea it happened.
  const shown = new Promise((r) => setTimeout(r, 2200));
  try {
    await pushDown(); // cheap payload; keep the phone current after every launch
    await importFromPhone();
  } catch (e) {
    phone.lastError = e instanceof Error ? e.message : String(e);
  }
  await shown;
  phone.phase = "done";
  setTimeout(() => {
    if (phone.phase === "done") phone.phase = "idle";
  }, 3200);
}

/**
 * Keep the phone's clients/kilns fresh while the app is open: any edit flags
 * the data dirty and schedules a debounced push, so a client added at the
 * computer shows up on the phone within seconds.
 */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function startAutoPush(): void {
  setDirtyHook(() => {
    if (!phone.paired) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void pushDown().catch((e) => {
        phone.lastError = e instanceof Error ? e.message : String(e);
      });
    }, 2000);
  });
}

/** Manual "Check phone / sync now" from the UI, with busy + error surfaced. */
export async function phoneSyncNow(): Promise<boolean> {
  if (!phone.paired || phone.busy) return false;
  phone.busy = true;
  phone.lastError = "";
  try {
    await pushDown();
    await checkUp();
    return true;
  } catch (e) {
    phone.lastError = e instanceof Error ? e.message : String(e);
    return false;
  } finally {
    phone.busy = false;
  }
}
