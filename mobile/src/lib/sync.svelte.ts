/**
 * Phone-side sync client. Talks to the pairing relay (see relay/worker.ts):
 *
 *   down  — pull the desktop's read-only payload (contacts + kilns + complexity)
 *           and cache it locally, so the phone works fully offline afterwards.
 *   up    — push pending drafts; mark them "synced" locally; and once the
 *           desktop has imported one (it's gone from the relay), drop it here.
 *
 * Pairing is learned once by scanning a QR on the desktop — the QR opens the
 * PWA with `#pair=<token>~<encodedRelayBase>` in the URL. We persist both and
 * clear the hash. Nothing is ever typed on the phone.
 */
import { storage } from "./storage";
import {
  synced,
  drafts,
  deleteDraft,
  setDraftStatus,
  type MobileKiln,
  type MobileContact,
  type ComplexityKey,
} from "./loader.svelte";

interface Pairing {
  base: string; // relay base URL, e.g. https://kiln-relay.xyz.workers.dev
  token: string;
}
interface DownPayload {
  contacts?: MobileContact[];
  kilns?: MobileKiln[];
  complexity?: Record<ComplexityKey, number>;
}

export const sync = $state<{
  paired: boolean;
  busy: boolean;
  lastSyncedAt: number | null;
  lastError: string;
}>({
  paired: false,
  busy: false,
  lastSyncedAt: null,
  lastError: "",
});

let pairing: Pairing | null = null;

function channel(box: "down" | "up"): string {
  return `${pairing!.base.replace(/\/$/, "")}/channel/${pairing!.token}/${box}`;
}

/** Read the pairing from the QR (URL hash) on first open, else from storage. */
export async function loadPairing(): Promise<void> {
  const m = typeof location !== "undefined" ? location.hash.match(/^#pair=([^~]+)~(.+)$/) : null;
  if (m) {
    pairing = { token: m[1]!, base: decodeURIComponent(m[2]!) };
    await storage.write("pairing", pairing);
    // Clean the URL so a refresh doesn't re-parse and the token isn't left visible.
    if (typeof history !== "undefined") history.replaceState(null, "", location.pathname + location.search);
  } else {
    pairing = (await storage.read<Pairing>("pairing")) ?? null;
  }
  sync.paired = !!(pairing && pairing.base && pairing.token);
}

export async function unpair(): Promise<void> {
  pairing = null;
  sync.paired = false;
  await storage.remove("pairing");
}

/** Pull the desktop's payload and refresh the offline cache. Silent on network
 * failure — the cached data keeps the app fully usable offline. */
export async function syncDown(): Promise<void> {
  if (!sync.paired) return;
  const res = await fetch(channel("down"), { method: "GET" });
  if (!res.ok) throw new Error(`down ${res.status}`);
  const data = (await res.json()) as DownPayload | null;
  if (!data) return;
  if (Array.isArray(data.kilns)) {
    synced.kilns = data.kilns;
    await storage.write("kilns", data.kilns);
  }
  if (Array.isArray(data.contacts)) {
    synced.contacts = data.contacts;
    await storage.write("contacts", data.contacts);
  }
  if (data.complexity) {
    synced.complexity = { ...synced.complexity, ...data.complexity };
    await storage.write("complexity", synced.complexity);
  }
}

/** Push every not-yet-synced draft; mark each "synced" on success. */
export async function syncUp(): Promise<void> {
  if (!sync.paired) return;
  for (const d of drafts.list.filter((x) => x.status === "draft")) {
    const res = await fetch(channel("up"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, title: d.title, firing: d.planner, notes: d.notes, createdAt: d.createdAt }),
    });
    if (res.ok) setDraftStatus(d.id, "synced");
    // A 409 (relay full) or network error just leaves it a draft to retry later.
  }
}

/** Drop any locally-synced draft the desktop has already imported (it's no
 * longer in the relay's up-box) — the "confirmed downloaded" round-trip. */
export async function refreshConsumed(): Promise<void> {
  if (!sync.paired) return;
  const res = await fetch(channel("up"), { method: "GET" });
  if (!res.ok) throw new Error(`up ${res.status}`);
  const pending = (await res.json()) as { id: string }[];
  const stillThere = new Set(pending.map((p) => p.id));
  for (const d of drafts.list.filter((x) => x.status === "synced")) {
    if (!stillThere.has(d.id)) deleteDraft(d.id);
  }
}

/** Full manual sync (the "Sync now" button): down → up → confirm-consumed. */
export async function syncNow(): Promise<boolean> {
  if (!sync.paired || sync.busy) return false;
  sync.busy = true;
  sync.lastError = "";
  try {
    await syncDown();
    await syncUp();
    await refreshConsumed();
    sync.lastSyncedAt = Date.now();
    return true;
  } catch (e) {
    sync.lastError = e instanceof Error ? e.message : String(e);
    return false;
  } finally {
    sync.busy = false;
  }
}

/** Non-blocking sync on app open — refresh the cache + clear consumed drafts,
 * but never block the UI and never surface transient offline errors. */
export async function autoSync(): Promise<void> {
  if (!sync.paired) return;
  try {
    await syncDown();
    await refreshConsumed();
    sync.lastSyncedAt = Date.now();
  } catch {
    /* offline or relay down — the cached data is still fine to work with */
  }
}
