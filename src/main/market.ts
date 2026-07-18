/**
 * Live market references (context only — never the number that feeds costs).
 *
 * Electricity: day-ahead wholesale spot per European bidding zone, from
 * energy-charts.info (Fraunhofer ISE, ENTSO-E data, no API key). Values are a
 * reference/signal — retail ≈ wholesale + taxes + margin, so the app always
 * steers the user to enter what they actually pay.
 *
 * Sources are tried in order (primary → fallbacks); on total failure the IPC
 * returns { ok: false } and the panel hides its live block gracefully. Results
 * are cached in-memory for an hour (day-ahead only changes once a day).
 */
import { ipcMain } from "electron";

export interface ElectricityRef {
  ok: true;
  currentKwh: number; // €/kWh right now (latest hour ≤ now)
  avgKwh: number; // €/kWh average across the fetched day
  asOf: number; // unix seconds of the current point
  zone: string;
  source: string;
}
type RefResult = ElectricityRef | { ok: false };

const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { at: number; data: ElectricityRef }>();

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Primary: energy-charts.info day-ahead price (EUR/MWh, hourly/quarter-hourly). */
async function fromEnergyCharts(zone: string): Promise<ElectricityRef> {
  const j = (await getJson(`https://api.energy-charts.info/price?bzn=${encodeURIComponent(zone)}`)) as {
    unix_seconds?: number[];
    price?: number[];
    unit?: string;
  };
  const secs = j.unix_seconds ?? [];
  const price = j.price ?? [];
  if (secs.length === 0 || price.length !== secs.length) throw new Error("empty");
  const now = Date.now() / 1000;
  // Latest point at or before now (fall back to the last point of the day).
  let idx = -1;
  for (let i = 0; i < secs.length; i++) if (secs[i]! <= now) idx = i;
  if (idx === -1) idx = price.length - 1;
  const toKwh = (mwh: number): number => Math.round((mwh / 1000) * 10000) / 10000;
  const avgMwh = price.reduce((a, b) => a + b, 0) / price.length;
  return {
    ok: true,
    currentKwh: toKwh(price[idx]!),
    avgKwh: toKwh(avgMwh),
    asOf: secs[idx]!,
    zone,
    source: "energy-charts.info (ENTSO-E)",
  };
}

const electricitySources: ((zone: string) => Promise<ElectricityRef>)[] = [
  fromEnergyCharts,
  // Secondary/tertiary providers can be appended here; each throws on failure.
];

async function electricity(zone: string): Promise<RefResult> {
  const hit = cache.get(zone);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  for (const src of electricitySources) {
    try {
      const data = await src(zone);
      cache.set(zone, { at: Date.now(), data });
      return data;
    } catch {
      /* try next source */
    }
  }
  return { ok: false };
}

// ---- Propane / butane reference -------------------------------------------
// No open API gives reliable RETAIL €/kg per region, so this is a *maintained*
// reference (dated), not a live fetch — clearly labelled as such in the UI. The
// truth remains what the user pays (the bottle calculator uses their own price).
// Structured as a source chain so a live endpoint (e.g. CNMC for ES) can slot in
// front of the bundled table later without touching the renderer.
export interface PropaneRef {
  ok: true;
  region: string; // ISO-2 country
  butaneKg?: number; // €/kg
  propaneKg?: number; // €/kg
  asOf: string; // "YYYY-MM"
  source: string;
}
type PropaneResult = PropaneRef | { ok: false };

// Bundled reference table (update periodically; contributors can extend it).
const PROPANE_TABLE: Record<string, Omit<PropaneRef, "ok" | "region">> = {
  ES: {
    butaneKg: 1.25, // regulated 12.5 kg bottle ≈ 15.6 € (CNMC/BOE)
    propaneKg: 1.8, // typical bottled propane
    asOf: "2026-07",
    source: "Reference: regulated bottle (CNMC/BOE) + typical bottled propane",
  },
};

async function propane(region: string): Promise<PropaneResult> {
  const key = (region || "ES").slice(0, 2).toUpperCase();
  const row = PROPANE_TABLE[key];
  return row ? { ok: true, region: key, ...row } : { ok: false };
}

export function registerMarket(): void {
  ipcMain.handle("market:electricity", async (_e, zone: string) => electricity(zone || "ES"));
  ipcMain.handle("market:propane", async (_e, region: string) => propane(region));
}
