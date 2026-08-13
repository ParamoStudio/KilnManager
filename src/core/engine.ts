import type {
  Allocation,
  ShelfLevel,
  Firing,
  FiringResult,
  ClientResult,
  AccountingResult,
} from "./types.js";
import { footprintAreaCm2, usableVolumeLiters, consumedHeightCm } from "./geometry.js";
import { splitAmount, roundCents, roundUpTo } from "./rounding.js";

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

  // 3. Split the charged revenue by KLU among charged clients (0 weight → 0),
  //    then apply each client's own modifiers to their share. A client discount
  //    is absorbed by the studio; a client surcharge is added to what's charged.
  const shares = splitAmount(chargedRevenue, clients.map((c) => (c.charged ? c.klu : 0)));
  clients.forEach((c, i) => {
    c.sharePct = totalKLU > 0 ? c.klu / totalKLU : 0;
    if (!c.charged) {
      c.price = 0;
      return;
    }
    const mods = firing.clientModifiers?.[c.contactName] ?? [];
    const cFixed = mods.reduce((a, m) => a + (m.mode === "percent" ? 0 : m.amount), 0);
    const cPct = mods.reduce((a, m) => a + (m.mode === "percent" ? m.amount : 0), 0);
    c.price = roundCents((shares[i]! + cFixed) * (1 + cPct / 100));
  });

  // 4. The books record what actually came in — each client's total as it is
  //    invoiced, rounded. `c.price` stays the exact fair share (the app shows it
  //    alongside), but the ledger must add up to real money: the monthly views
  //    already used the invoiced figure, and a partner's cut is taken from it,
  //    so the accounting using the exact one made the rows disagree by the
  //    rounding difference.
  const collectedRevenue = roundCents(
    clients.reduce((a, c) => a + (c.charged ? roundUpTo(c.price, firing.invoiceStep ?? 0) : 0), 0),
  );
  const accounting = computeAccounting(collectedRevenue, firing, clients);

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

/**
 * What a partner takes from a given base.
 *
 * **Never below zero** — a partner agreement is a share of what comes in, not a
 * co-signature on the losses. A negative cut would mean the partner owing the
 * studio money, and it quietly flattered the books besides, since subtracting a
 * negative made a loss look smaller than it was.
 *
 * One function for both kinds of cut (whole-firing and per-client) so the rule
 * can't hold in one place and not the other, which is exactly what happened once.
 */
export function partnerCut(base: number, pct: number): number {
  return roundCents(Math.max(0, base) * pct);
}

export function computeAccounting(
  revenue: number,
  firing: Firing,
  /**
   * Required: a partner's cut is a share of what paying clients paid, so it
   * cannot be worked out without knowing who paid and how much of the kiln they
   * filled. Defaulting this to [] would have silently produced zero cuts.
   */
  clients: ClientResult[],
): AccountingResult {
  const kilnCosts = roundCents(firing.costItems.reduce((a, c) => a + c.amount, 0));
  const grossProfit = roundCents(revenue - kilnCosts);

  /** What a client actually pays — partners take a cut of real money. */
  const invoiced = (price: number): number => roundUpTo(price, firing.invoiceStep ?? 0);

  /**
   * A partner takes their percentage of **what paying clients paid, less the
   * share of the kiln's costs that their part of the load accounts for**.
   *
   * The studio's own work is deliberately absent from both halves. It brings in
   * nothing, so it can't add to a partner's cut — but it must not subtract
   * either, and that was the bug: basing the cut on the firing's whole profit
   * meant the cost of the studio's own shelves ate into what the partner was
   * owed, and on a firing loaded mostly for the studio it wiped it out entirely.
   * Those shelves are the studio's own affair (stock it will sell later), not
   * something a partner should be charged for.
   *
   * Costs still follow the load by KLU, the same basis everything else here is
   * split on — so a client who filled a quarter of the kiln carries a quarter of
   * its costs, and no more.
   */
  const chargedLoad = clients.reduce((a, c) => a + (c.charged ? c.sharePct : 0), 0);
  const chargedIn = roundCents(clients.reduce((a, c) => a + (c.charged ? invoiced(c.price) : 0), 0));
  const partnerBase = roundCents(chargedIn - kilnCosts * chargedLoad);

  const partnerCuts: AccountingResult["partnerCuts"] = firing.partners.map((p) => ({
    name: p.name,
    pct: p.pct,
    amount: partnerCut(partnerBase, p.pct),
  }));

  // Same rule, one client at a time: what that client paid, less their own
  // share of the kiln's costs.
  for (const c of clients) {
    for (const p of firing.clientPartners?.[c.contactName] ?? []) {
      const base = c.charged ? invoiced(c.price) - kilnCosts * c.sharePct : 0;
      partnerCuts.push({
        name: p.name,
        pct: p.pct,
        amount: partnerCut(base, p.pct),
        client: c.contactName,
      });
    }
  }

  const partnerTotal = partnerCuts.reduce((a, p) => a + p.amount, 0);

  return {
    revenue,
    kilnCosts,
    grossProfit,
    partnerCuts,
    partnerBase,
    netToYou: roundCents(grossProfit - partnerTotal),
  };
}
