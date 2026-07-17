/**
 * Cost data derived from the closed-firings log — the single source of truth
 * for both the in-app Expenses viewer and the exported KilnCosts.xlsx.
 *
 * Nothing is stored here: every number is recomputed from each firing's saved
 * planner through the core engine, so the viewer and the workbook always agree
 * with the firing breakdowns.
 */
import { computeFiring, roundUp50 } from "@core";
import { firings, coreFiringFrom, type FiringRecord } from "./firing.svelte";
import { kilnStore } from "./kilns.svelte";

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
  partnerCuts: { name: string; amount: number }[];
  net: number; // grossProfit − Σ partner cuts
}

export interface MonthBlock {
  key: string; // "2026-07"
  label: string; // "julio 2026"
  firings: FiringRow[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
  partnerDebt: { name: string; amount: number }[]; // owed per partner this month
}

export interface KilnCosts {
  kilnId: string;
  kilnName: string;
  months: MonthBlock[]; // newest month first
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
}

const monthKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ts: number): string => {
  const s = new Date(ts).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1); // "Julio 2026"
};

function rowFor(rec: FiringRecord): FiringRow {
  const result = computeFiring(coreFiringFrom(rec.planner));
  const a = result.accounting;
  // Collected revenue mirrors the ticket/breakdown: each charged client rounded up.
  const revenue = result.clients.reduce((s, c) => s + (c.charged ? roundUp50(c.price) : 0), 0);
  const kilnCosts = a.kilnCosts;
  const grossProfit = Math.round((revenue - kilnCosts) * 100) / 100;
  const fuel = coreFiringFrom(rec.planner).costItems;
  const fuelCost = fuel[0]?.amount ?? 0; // first cost item is the variable fuel line
  const fixedCost = Math.round((kilnCosts - fuelCost) * 100) / 100;
  const partnerCuts = a.partnerCuts.map((p) => ({
    name: p.name,
    amount: Math.round(grossProfit * p.pct * 100) / 100,
  }));
  const net = Math.round((grossProfit - partnerCuts.reduce((s, p) => s + p.amount, 0)) * 100) / 100;
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

/** Group closed firings by kiln → month, computing per-month partner debt. */
export function costData(): KilnCosts[] {
  const closed = firings.list.filter((f) => f.status === "closed");
  const byKiln = new Map<string, FiringRecord[]>();
  for (const rec of closed) {
    const k = rec.planner.kilnId || "unknown";
    (byKiln.get(k) ?? byKiln.set(k, []).get(k)!).push(rec);
  }

  const out: KilnCosts[] = [];
  for (const [kilnId, recs] of byKiln) {
    const kilnName = kilnStore.list.find((k) => k.id === kilnId)?.name ?? "Horno eliminado";
    const byMonth = new Map<string, FiringRow[]>();
    for (const rec of recs) {
      const row = rowFor(rec);
      const key = monthKey(row.at);
      (byMonth.get(key) ?? byMonth.set(key, []).get(key)!).push(row);
    }

    const months: MonthBlock[] = [];
    for (const [key, rows] of byMonth) {
      rows.sort((x, y) => y.at - x.at);
      const revenue = round(rows.reduce((s, r) => s + r.revenue, 0));
      const kilnCosts = round(rows.reduce((s, r) => s + r.kilnCosts, 0));
      const grossProfit = round(rows.reduce((s, r) => s + r.grossProfit, 0));
      const net = round(rows.reduce((s, r) => s + r.net, 0));
      const debtMap = new Map<string, number>();
      for (const r of rows) for (const pc of r.partnerCuts) debtMap.set(pc.name, round((debtMap.get(pc.name) ?? 0) + pc.amount));
      months.push({
        key,
        label: monthLabel(rows[0]!.at),
        firings: rows,
        revenue,
        kilnCosts,
        grossProfit,
        net,
        partnerDebt: [...debtMap].map(([name, amount]) => ({ name, amount })),
      });
    }
    months.sort((a, b) => (a.key < b.key ? 1 : -1)); // newest month first

    out.push({
      kilnId,
      kilnName,
      months,
      revenue: round(months.reduce((s, m) => s + m.revenue, 0)),
      kilnCosts: round(months.reduce((s, m) => s + m.kilnCosts, 0)),
      grossProfit: round(months.reduce((s, m) => s + m.grossProfit, 0)),
      net: round(months.reduce((s, m) => s + m.net, 0)),
    });
  }
  out.sort((a, b) => a.kilnName.localeCompare(b.kilnName));
  return out;
}

const round = (n: number): number => Math.round(n * 100) / 100;
