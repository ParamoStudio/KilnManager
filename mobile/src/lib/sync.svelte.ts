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
 * clear the hash.
 *
 * The QR pairs whichever browser scanned it, which isn't always the browser the
 * user ends up in (see `paircode.ts`), so the same pairing can also be carried
 * across as a code. That's a paste, not a typing exercise.
 */
import { storage } from "./storage";
import { encodePairing, decodePairing, type Pairing } from "./paircode";
import {
  synced,
  drafts,
  setDraftChangeHook,
  setDraftStatus,
  type MobileKiln,
  type MobileContact,
  type ComplexityKey,
} from "./loader.svelte";

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
  /** The relay's mailbox is full: the desktop hasn't collected the previous
   * batch yet. Not an error — the drafts simply stay pending and go through on
   * a later attempt — but the phone says so rather than looking stuck. */
  mailboxFull: boolean;
  /** Set once, the first time this browser pairs, so the app can offer the
   * pairing code before the user walks away with it. See `pairingCode()`. */
  offerCode: boolean;
}>({
  paired: false,
  busy: false,
  lastSyncedAt: null,
  lastError: "",
  mailboxFull: false,
  offerCode: false,
});

let pairing: Pairing | null = null;

function channel(box: "down" | "up"): string {
  return `${pairing!.base.replace(/\/$/, "")}/channel/${pairing!.token}/${box}`;
}

/** The pairing as a string you can carry by hand. See `paircode.ts`. */
export function pairingCode(): string {
  return pairing ? encodePairing(pairing) : "";
}

/** Accepts a pairing code, or a pasted pair URL — people paste what they have. */
export async function applyPairingCode(input: string): Promise<boolean> {
  const p = decodePairing(input);
  if (!p) return false;
  await adoptPairing(p.token, p.base);
  return true;
}

/**
 * Store a pairing, wiping anything cached from a different computer first — a
 * new token means a different vault (a studio that started fresh), and mixing
 * two studios' kilns and clients would be worse than starting empty.
 */
async function adoptPairing(token: string, base: string): Promise<void> {
  const previous = await storage.read<Pairing>("pairing");
  pairing = { token, base };
  if (previous && previous.token !== token) {
    for (const key of ["kilns", "contacts", "complexity", "drafts", "draft"]) {
      await storage.remove(key);
    }
    synced.kilns = [];
    synced.contacts = [];
    drafts.list = [];
  }
  await storage.write("pairing", pairing);
  sync.paired = true;
}

/** Read the pairing from the QR (URL hash) on first open, else from storage. */
export async function loadPairing(): Promise<void> {
  const m = typeof location !== "undefined" ? location.hash.match(/^#pair=([^~]+)~(.+)$/) : null;
  if (m) {
    await adoptPairing(m[1]!, decodeURIComponent(m[2]!));
    // Offer the code once per browser, right after the scan — that's the only
    // moment the user is holding both devices and hasn't walked off yet.
    if (!(await storage.read<boolean>("codeOffered"))) sync.offerCode = true;
    // Clean the URL so a refresh doesn't re-parse and the token isn't left visible.
    if (typeof history !== "undefined") history.replaceState(null, "", location.pathname + location.search);
  } else {
    pairing = (await storage.read<Pairing>("pairing")) ?? null;
  }
  sync.paired = !!(pairing && pairing.base && pairing.token);
}

/**
 * Spend the one-shot offer — called when the sheet is actually on screen, not
 * when pairing happens. Marking it at pairing time meant anything that stopped
 * the sheet rendering burned the only chance the user had of learning the code
 * exists.
 */
export async function markCodeOffered(): Promise<void> {
  sync.offerCode = false;
  await storage.write("codeOffered", true);
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
  let full = false;
  for (const d of drafts.list.filter((x) => x.status === "draft" && x.planner.levels.length > 0)) {
    const res = await fetch(channel("up"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, title: d.title, firing: d.planner, notes: d.notes, createdAt: d.createdAt }),
    });
    if (res.ok) {
      setDraftStatus(d.id, "synced");
      continue;
    }
    // 409 means the mailbox is full — the desktop hasn't collected the last
    // batch. Stop here rather than hammering the relay with the rest; they all
    // stay drafts and go up on a later attempt, in order.
    if (res.status === 409) {
      full = true;
      break;
    }
    // Any other failure (network, relay down) also just leaves it a draft.
  }
  sync.mailboxFull = full;
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
