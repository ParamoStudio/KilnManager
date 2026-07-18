/**
 * Cost data derived from the closed-firings log — the single source of truth
 * for both the in-app Expenses viewer and the exported per-month workbooks.
 *
 * Nothing is stored here: every number is recomputed from each firing's saved
 * planner through the core engine, so the viewer and the workbooks always agree
 * with the firing breakdowns. Partner-payment status is layered in from the
 * payments store (default: pending).
 */
import { computeFiring, roundUp50 } from "@core";
import { firings, coreFiringFrom, type FiringRecord } from "./firing.svelte";
import { kilnStore } from "./kilns.svelte";
import { settings } from "./settings.svelte";
import { isPaid, paidAt } from "./payments.svelte";

const round = (n: number): number => Math.round(n * 100) / 100;

export interface PartnerCut {
  partnerId: string;
  tierId: string;
  partner: string; // partner name
  tier: string; // tier name
  amount: number;
}

export interface FiringRow {
  id: string;
  title: string;
  at: number; // closedAt (fallback createdAt)
  clients: string[]; // charged client names
  revenue: number; // collected (rounded up to 0.50)
  fuelCost: number;
  fixedCost: number;
  kilnCosts: number; // fuel + fixed
  grossProfit: number; // revenue − kilnCosts
  partnerCuts: PartnerCut[];
  net: number; // grossProfit − Σ partner cuts
}

export interface KilnMonth {
  kilnId: string;
  kilnName: string;
  firings: FiringRow[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
}

export interface PartnerDebt {
  partnerId: string;
  name: string;
  total: number;
  tiers: { tierId: string; tier: string; amount: number }[]; // breakdown
  paid: boolean;
  paidAt: string | null; // ISO date (YYYY-MM-DD) it was marked paid
}

export interface Month {
  key: string; // "2026-07"
  label: string; // "Julio 2026"
  kilns: KilnMonth[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
  partners: PartnerDebt[]; // owed this month, across all kilns
}

const monthKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ts: number): string => {
  const s = new Date(ts).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1); // "Julio 2026"
};

/** Resolve this firing's partner refs into cuts, keeping partner + tier identity. */
function partnerCutsFor(rec: FiringRecord, grossProfit: number): PartnerCut[] {
  const refs = rec.planner.partners ?? [];
  const out: PartnerCut[] = [];
  for (const ref of refs) {
    const a = ref as unknown as { partnerId?: string; tierId?: string; name?: string; pct?: number };
    if (a.partnerId && a.tierId) {
      const p = settings.partners.find((x) => x.id === a.partnerId);
      const t = p?.tiers.find((x) => x.id === a.tierId);
      if (p && t) {
        out.push({ partnerId: p.id, tierId: t.id, partner: p.name, tier: t.name, amount: round(grossProfit * t.pct) });
        continue;
      }
    }
    if (typeof a.pct === "number" && typeof a.name === "string") {
      // Legacy shape without ids: key by name.
      out.push({ partnerId: a.name, tierId: "", partner: a.name, tier: "", amount: round(grossProfit * a.pct) });
    }
  }
  return out;
}

function rowFor(rec: FiringRecord): FiringRow {
  const core = coreFiringFrom(rec.planner);
  const result = computeFiring(core);
  // Collected revenue mirrors the ticket/breakdown: each charged client rounded up.
  const revenue = round(result.clients.reduce((s, c) => s + (c.charged ? roundUp50(c.price) : 0), 0));
  const kilnCosts = result.accounting.kilnCosts;
  const grossProfit = round(revenue - kilnCosts);
  const fuelCost = core.costItems[0]?.amount ?? 0; // first cost item is the variable fuel line
  const fixedCost = round(kilnCosts - fuelCost);
  const partnerCuts = partnerCutsFor(rec, grossProfit);
  const net = round(grossProfit - partnerCuts.reduce((s, p) => s + p.amount, 0));
  return {
    id: rec.id,
    title: rec.title || "Sin título",
    at: rec.closedAt ?? rec.createdAt,
    clients: result.clients.filter((c) => c.charged).map((c) => c.contactName),
    revenue,
    fuelCost,
    fixedCost,
    kilnCosts,
    grossProfit,
    partnerCuts,
    net,
  };
}

/** Closed firings grouped by month → kiln, with per-month partner debt. Newest first. */
export function monthlyData(): Month[] {
  const closed = firings.list.filter((f) => f.status === "closed");
  const byMonth = new Map<string, FiringRow[]>();
  const rowKiln = new Map<string, string>(); // firing id → kilnId (for grouping)

  for (const rec of closed) {
    const row = rowFor(rec);
    rowKiln.set(row.id, rec.planner.kilnId || "unknown");
    const key = monthKey(row.at);
    (byMonth.get(key) ?? byMonth.set(key, []).get(key)!).push(row);
  }

  const kilnName = (id: string): string => kilnStore.list.find((k) => k.id === id)?.name ?? "Horno eliminado";

  const months: Month[] = [];
  for (const [key, rows] of byMonth) {
    rows.sort((x, y) => y.at - x.at);
    const label = monthLabel(rows[0]!.at);

    // Per-kiln blocks within the month.
    const byKiln = new Map<string, FiringRow[]>();
    for (const r of rows) {
      const kid = rowKiln.get(r.id)!;
      (byKiln.get(kid) ?? byKiln.set(kid, []).get(kid)!).push(r);
    }
    const kilns: KilnMonth[] = [...byKiln].map(([kilnId, frs]) => ({
      kilnId,
      kilnName: kilnName(kilnId),
      firings: frs,
      revenue: round(frs.reduce((s, r) => s + r.revenue, 0)),
      kilnCosts: round(frs.reduce((s, r) => s + r.kilnCosts, 0)),
      grossProfit: round(frs.reduce((s, r) => s + r.grossProfit, 0)),
      net: round(frs.reduce((s, r) => s + r.net, 0)),
    }));
    kilns.sort((a, b) => a.kilnName.localeCompare(b.kilnName));

    // Partner debt for the month, aggregated by partner then broken down by tier.
    const pMap = new Map<string, PartnerDebt>();
    for (const r of rows)
      for (const c of r.partnerCuts) {
        let pd = pMap.get(c.partnerId);
        if (!pd) {
          pd = { partnerId: c.partnerId, name: c.partner, total: 0, tiers: [], paid: false, paidAt: null };
          pMap.set(c.partnerId, pd);
        }
        pd.total = round(pd.total + c.amount);
        const tid = c.tierId || c.tier;
        const tb = pd.tiers.find((t) => t.tierId === tid);
        if (tb) tb.amount = round(tb.amount + c.amount);
        else pd.tiers.push({ tierId: tid, tier: c.tier, amount: c.amount });
      }
    const partners = [...pMap.values()].map((pd) => ({
      ...pd,
      paid: isPaid(key, pd.partnerId),
      paidAt: paidAt(key, pd.partnerId),
    }));
    partners.sort((a, b) => a.name.localeCompare(b.name));

    months.push({
      key,
      label,
      kilns,
      revenue: round(rows.reduce((s, r) => s + r.revenue, 0)),
      kilnCosts: round(rows.reduce((s, r) => s + r.kilnCosts, 0)),
      grossProfit: round(rows.reduce((s, r) => s + r.grossProfit, 0)),
      net: round(rows.reduce((s, r) => s + r.net, 0)),
      partners,
    });
  }
  months.sort((a, b) => (a.key < b.key ? 1 : -1)); // newest month first
  return months;
}
