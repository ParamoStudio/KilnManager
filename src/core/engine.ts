import type {
  Allocation,
  ShelfLevel,
  Firing,
  FiringResult,
  ClientResult,
  AccountingResult,
} from "./types.js";
import { footprintAreaCm2, usableVolumeLiters, consumedHeightCm } from "./geometry.js";
import { splitAmount, roundCents } from "./rounding.js";

/** Raw occupied volume of one allocation, in litres. */
export function allocationLiters(
  level: ShelfLevel,
  allocation: Allocation,
  footprintCm2: number,
): number {
  return (consumedHeightCm(level) * footprintCm2 * allocation.fraction) / 1000;
}

/** Effective load units (KLU) of one allocation = litres × complexity. */
export function allocationKLU(
  level: ShelfLevel,
  allocation: Allocation,
  footprintCm2: number,
): number {
  return allocationLiters(level, allocation, footprintCm2) * allocation.complexity;
}

function accountingKey(a: Allocation): string {
  return a.contactId ?? `name:${a.contactName}`;
}

/**
 * The core computation. Turns a visual kiln layout into:
 *  - the fair per-client split of the base price (by KLU),
 *  - the internal accounting (costs → gross → partner cuts → net).
 *
 * Pure function: no I/O, no rounding drift (client prices sum exactly to revenue).
 */
export function computeFiring(firing: Firing): FiringResult {
  const footprint = footprintAreaCm2(firing.kiln);
  const usableKilnLiters = usableVolumeLiters(firing.kiln);

  // 1. Aggregate KLU + litres per client (a client may span several levels).
  const order: string[] = [];
  const byClient = new Map<string, ClientResult>();

  for (const level of firing.levels) {
    for (const alloc of level.allocations) {
      const key = accountingKey(alloc);
      const liters = allocationLiters(level, alloc, footprint);
      const klu = allocationKLU(level, alloc, footprint);

      let entry = byClient.get(key);
      if (!entry) {
        entry = {
          contactId: alloc.contactId,
          contactName: alloc.contactName,
          liters: 0,
          klu: 0,
          sharePct: 0,
          price: 0,
          charged: false,
        };
        byClient.set(key, entry);
        order.push(key);
      }
      entry.liters += liters;
      entry.klu += klu;
      if (alloc.charged !== false) entry.charged = true; // charged if any zone is
    }
  }

  const clients = order.map((k) => byClient.get(k)!);
  const totalKLU = clients.reduce((a, c) => a + c.klu, 0);
  const chargedKLU = clients.reduce((a, c) => a + (c.charged ? c.klu : 0), 0);
  const totalOccupiedLiters = clients.reduce((a, c) => a + c.liters, 0);

  // 2. Nominal full-kiln price, and the portion actually charged: the studio's
  //    own (uncharged) zones still occupy the kiln, so paying clients only cover
  //    their proportional share — the studio absorbs the rest.
  // Fixed € modifiers adjust the base; the net percentage then applies to that
  // subtotal. Surcharges are positive, discounts negative (mode missing = fixed).
  const fixedSum = firing.modifiers.reduce((a, m) => a + (m.mode === "percent" ? 0 : m.amount), 0);
  const pctSum = firing.modifiers.reduce((a, m) => a + (m.mode === "percent" ? m.amount : 0), 0);
  const serviceRevenue = roundCents((firing.serviceBasePrice + fixedSum) * (1 + pctSum / 100));
  const chargedRevenue = totalKLU > 0 ? roundCents((serviceRevenue * chargedKLU) / totalKLU) : 0;

  // 3. Split the charged revenue by KLU among charged clients (0 weight → 0).
  const prices = splitAmount(chargedRevenue, clients.map((c) => (c.charged ? c.klu : 0)));
  clients.forEach((c, i) => {
    c.sharePct = totalKLU > 0 ? c.klu / totalKLU : 0;
    c.price = c.charged ? prices[i]! : 0;
  });

  // 4. Accounting is based on what is actually charged.
  const accounting = computeAccounting(chargedRevenue, firing);

  return {
    totalKLU,
    totalOccupiedLiters,
    usableKilnLiters,
    fillFraction: usableKilnLiters > 0 ? totalOccupiedLiters / usableKilnLiters : 0,
    serviceRevenue,
    clients,
    accounting,
  };
}

export function computeAccounting(revenue: number, firing: Firing): AccountingResult {
  const kilnCosts = roundCents(firing.costItems.reduce((a, c) => a + c.amount, 0));
  const grossProfit = roundCents(revenue - kilnCosts);

  const partnerCuts = firing.partners.map((p) => ({
    name: p.name,
    pct: p.pct,
    amount: roundCents(grossProfit * p.pct),
  }));
  const partnerTotal = partnerCuts.reduce((a, p) => a + p.amount, 0);

  return {
    revenue,
    kilnCosts,
    grossProfit,
    partnerCuts,
    netToYou: roundCents(grossProfit - partnerTotal),
  };
}
