/**
 * Desktop side of the phone-loading bridge. Owns the pairing config, pushes the
 * read-only payload down to the relay (contacts + kiln STRUCTURE + complexity
 * factors — never prices), and imports firings the phone has uploaded.
 *
 * See relay/worker.ts for the endpoints, and mobile/src/lib/sync.svelte.ts for
 * the phone half. This is plain HTTPS fetch — no Electron/native access needed.
 */
import { contacts, importPhoneFiring } from "./firing.svelte";
import { kilnStore } from "./kilns.svelte";
import { settings } from "./settings.svelte";
import { syncDirty } from "./syncflags.svelte";
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
  busy: boolean;
  lastError: string;
}>({
  token: "",
  paired: false,
  pending: 0,
  busy: false,
  lastError: "",
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

/** Generate a fresh pairing token. Endpoints are fixed at build time. */
export function generatePairing(): void {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  phone.token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  phone.paired = !!(bridgeConfigured() && phone.token);
  persist();
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

/** How many phone firings are waiting (updates phone.pending). */
export async function checkUp(): Promise<number> {
  if (!phone.paired) return 0;
  const res = await fetch(channel("up"), { method: "GET" });
  if (!res.ok) throw new Error(`up ${res.status}`);
  const list = (await res.json()) as unknown[];
  phone.pending = Array.isArray(list) ? list.length : 0;
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
    phone.pending = 0;
    return 0;
  }
  for (const item of list) {
    importPhoneFiring({
      id: item.id,
      title: item.title,
      firing: item.firing as never,
      notes: item.notes,
    });
  }
  // Confirm consumption so the phone drops them on its next check.
  await fetch(channel("up"), { method: "DELETE" });
  phone.pending = 0;
  return list.length;
}

/** Non-blocking pass on app open: push fresh data down + see what's waiting. */
export async function phoneSyncOnOpen(): Promise<void> {
  if (!phone.paired) return;
  try {
    await pushDown(); // cheap payload; keep the phone current after every launch
    await checkUp();
  } catch (e) {
    phone.lastError = e instanceof Error ? e.message : String(e);
  }
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
