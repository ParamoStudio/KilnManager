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

async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
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
// Spain: scraped from a published Repsol tariff (real bottled €/kg). Other
// countries: a maintained *approximate* table (no open pan-EU retail LPG API
// exists) — flagged `approx` so the UI can mark it clearly. The truth remains
// what the user pays; this is only a benchmark. Source chain: live scrape →
// bundled table → unavailable.
export interface PropaneRef {
  ok: true;
  region: string; // ISO-2 country
  butaneKg?: number; // €/kg
  propaneKg?: number; // €/kg
  asOf: string; // "YYYY-MM"
  source: string;
  approx?: boolean; // true = maintained estimate, not a live/published exact figure
}
type PropaneResult = PropaneRef | { ok: false };

const propaneCache = new Map<string, { at: number; data: PropaneRef }>();
const thisMonth = (): string => new Date().toISOString().slice(0, 7);

// Parse a Repsol-style bottled-gas tariff page (handles "Envasado" and "Recarga"
// wording and 11 / 11,00 / 12,5 / 12,50 kg formats) → €/kg for propane & butane.
function parseBottleTariff(html: string, sourceHost: string): PropaneRef {
  const grab = (re: RegExp): number | undefined => {
    const m = html.match(re);
    return m ? parseFloat(m[1]!.replace(/\./g, "").replace(",", ".")) : undefined;
  };
  const propano11 = grab(/Propano[^(]{0,24}\(\s*11(?:[.,]\d+)?\s*Kg\)[\s\S]{0,180}?(\d{1,3},\d{2})\s*€/i);
  const butano125 = grab(/Butano[^(]{0,24}\(\s*12[.,]5(?:0)?\s*Kg\)[\s\S]{0,180}?(\d{1,3},\d{2})\s*€/i);
  if (propano11 === undefined && butano125 === undefined) throw new Error("no prices parsed");
  return {
    ok: true,
    region: "ES",
    propaneKg: propano11 !== undefined ? Math.round((propano11 / 11) * 100) / 100 : undefined,
    butaneKg: butano125 !== undefined ? Math.round((butano125 / 12.5) * 100) / 100 : undefined,
    asOf: thisMonth(),
    source: `Repsol tariff · ${sourceHost}`,
  };
}

// Spanish bottled-tariff sources, tried in order (both static HTML, no key).
const ES_TARIFF_SOURCES: { url: string; host: string }[] = [
  { url: "https://www.comercialdeenergia.es/tarifa-precios-compra-bombona-butano-propano/", host: "comercialdeenergia.es" },
  { url: "https://www.clavelgas.es/tarifa-precios-compra-bombona-butano-propano/", host: "clavelgas.es" },
];

async function scrapeEsTariff(): Promise<PropaneRef> {
  let lastErr: unknown;
  for (const s of ES_TARIFF_SOURCES) {
    try {
      return parseBottleTariff(await getText(s.url), s.host);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("no ES tariff source");
}

// Maintained approximate €/kg for bottled LPG by country (rough benchmarks).
const PROPANE_TABLE: Record<string, Omit<PropaneRef, "ok" | "region">> = {
  ES: { butaneKg: 1.3, propaneKg: 1.39, asOf: "2026-07", source: "Approx. bottled LPG", approx: true },
  PT: { propaneKg: 1.85, asOf: "2026-07", source: "Approx. bottled LPG", approx: true },
  FR: { butaneKg: 2.9, propaneKg: 2.7, asOf: "2026-07", source: "Approx. bottled LPG", approx: true },
  DE: { propaneKg: 2.5, asOf: "2026-07", source: "Approx. bottled LPG", approx: true },
  IT: { propaneKg: 2.5, asOf: "2026-07", source: "Approx. bottled LPG", approx: true },
};

async function propane(region: string): Promise<PropaneResult> {
  const key = (region || "ES").slice(0, 2).toUpperCase();
  const hit = propaneCache.get(key);
  if (hit && Date.now() - hit.at < 6 * 60 * 60 * 1000) return hit.data;
  // Spain: try the live scrape sources first.
  if (key === "ES") {
    try {
      const data = await scrapeEsTariff();
      propaneCache.set(key, { at: Date.now(), data });
      return data;
    } catch {
      /* fall through to the table */
    }
  }
  const row = PROPANE_TABLE[key];
  if (row) {
    const data: PropaneRef = { ok: true, region: key, ...row };
    propaneCache.set(key, { at: Date.now(), data });
    return data;
  }
  return { ok: false };
}

export function registerMarket(): void {
  ipcMain.handle("market:electricity", async (_e, zone: string) => electricity(zone || "ES"));
  ipcMain.handle("market:propane", async (_e, region: string) => propane(region));
}
