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
  setDraftChangeHook,
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

/** Push every not-yet-synced firing; mark each "synced" on success. Each keeps
 * its stable id, so the relay (and the desktop) overwrite rather than duplicate
 * — editing a firing five times still yields exactly one firing. */
export async function syncUp(): Promise<void> {
  if (!sync.paired) return;
  for (const d of drafts.list.filter((x) => x.status === "draft" && x.planner.levels.length > 0)) {
    const res = await fetch(channel("up"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, title: d.title, firing: d.planner, notes: d.notes, createdAt: d.createdAt }),
    });
    if (res.ok) setDraftStatus(d.id, "synced");
    // A 409 (relay full) or network error just leaves it a draft to retry later.
  }
}

/**
 * Automatic upload: every edit schedules one, debounced so a burst of taps
 * becomes a single request. Offline failures are silent — the firing simply
 * stays "Draft" and goes up on the next edit, app open, or manual upload.
 */
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleUpload(): void {
  if (!sync.paired) return;
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    uploadTimer = null;
    void syncUp().catch(() => {
      /* offline — retried on the next change or app open */
    });
  }, 1500);
}

/** Full manual sync (the "Sync now" button): down → up → confirm-consumed. */
export async function syncNow(): Promise<boolean> {
  if (!sync.paired || sync.busy) return false;
  sync.busy = true;
  sync.lastError = "";
  try {
    await syncDown();
    await syncUp();
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
    await syncUp(); // anything edited while offline goes up now
    sync.lastSyncedAt = Date.now();
  } catch {
    /* offline or relay down — the cached data is still fine to work with */
  }
}

/** Wire the automatic upload to every edit made in the loader. */
export function startAutoUpload(): void {
  setDraftChangeHook(scheduleUpload);
}
