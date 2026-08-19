/**
 * The collections view's data: closed firings, seen as debts per client.
 *
 * Nothing is stored here. Every amount is recomputed from each firing's saved
 * planner through the same engine and the same invoice rounding the client's
 * own ticket used, so the monthly bill can never quote a figure the client was
 * never shown. Only the paid/unpaid marks are persisted, and they live on the
 * firings themselves.
 */
import { computeFiring } from "@core";
import { firings, coreFiringFrom, clientPaidAt } from "./firing.svelte";
import { kilnStore } from "./kilns.svelte";
import { chargedTotal } from "./settings.svelte";
import { localeTag } from "./i18n.svelte";
import { groupCollections, type CollectionEntry, type CollectionMonth } from "./collections";

/** Follows the app's language, like every other date in the app. */
const monthLabel = (ts: number): string => {
  const s = new Date(ts).toLocaleDateString(localeTag(), { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function collectionMonths(): CollectionMonth[] {
  const entries: CollectionEntry[] = [];

  for (const rec of firings.list) {
    if (rec.status !== "closed") continue;
    const kiln = kilnStore.list.find((k) => k.id === rec.planner.kilnId);
    const result = computeFiring(coreFiringFrom(rec.planner));
    const at = rec.closedAt ?? rec.createdAt;

    for (const c of result.clients) {
      // Uncharged zones are the studio's own work: nobody is billed for those,
      // so they are not a debt and never appear here.
      if (!c.charged) continue;
      const amount = chargedTotal(c.price);
      // A zero line is nothing to collect. Listing it would put a client in the
      // ledger who can never be settled, since there is no money to settle.
      if (amount <= 0) continue;

      entries.push({
        firingId: rec.id,
        title: rec.title || kiln?.name || "",
        kilnName: kiln?.name ?? "",
        at,
        client: c.contactName,
        amount,
        paidAt: clientPaidAt(rec, c.contactName),
      });
    }
  }

  return groupCollections(entries, monthLabel);
}
