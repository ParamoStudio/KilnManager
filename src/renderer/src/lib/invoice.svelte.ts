/**
 * Building a client's invoice for a firing — one implementation, several callers.
 *
 * This used to live inside the outputs panel, which was fine while that panel
 * was the only place an invoice came from. The collections view needs the same
 * document for a firing the studio is chasing payment on, and two copies of
 * this would eventually disagree about what a client was charged. There is only
 * ever one answer to "what does this person's invoice say", so there is only
 * one function that says it.
 */
import type { KilnModifier } from "@core";
import { computeFiring } from "@core";
import { coreFiringFrom, type FiringRecord } from "./firing.svelte";
import { kilnStore } from "./kilns.svelte";
import { settings, chargedTotal, invoiceClientName } from "./settings.svelte";
import { brand } from "./brand.svelte";
import { eur } from "./format";
import { t, localeTag } from "./i18n.svelte";
import type { TicketData, TicketLine } from "./ticket";

/** The date shown on the invoice, and the folder its file lives in. */
export function invoiceDate(rec: FiringRecord): number {
  return rec.closedAt ?? rec.createdAt;
}

export function invoiceData(rec: FiringRecord, name: string): TicketData | null {
  const kiln = kilnStore.list.find((k) => k.id === rec.planner.kilnId);
  if (!kiln) return null;
  const result = computeFiring(coreFiringFrom(rec.planner));
  const service = kiln.services.find((s) => s.id === rec.planner.serviceId) ?? kiln.services[0];
  if (!service) return null;
  const c = result.clients.find((x) => x.contactName === name);
  if (!c) return null;

  const ids = rec.planner.clientMods?.[name] ?? [];
  const defined = kiln.modifiers ?? [];
  const mods = ids
    .map((mid) => defined.find((m) => m.id === mid))
    .filter((m): m is KilnModifier => !!m);

  // Exactly ONE money figure on the invoice: the total. Modifiers say what they
  // are — a name and a −20% — and let the total speak for the money, so the
  // client is never handed cent figures that can't add up to a rounded total.
  const lines: TicketLine[] = mods.map((m) => ({
    label: `${m.name} · ${m.family === "discount" ? "−" : "+"}${m.mode === "percent" ? `${m.value}%` : eur(m.value)}`,
    value: "",
  }));
  lines.push({ label: t.ticket.total, value: eur(chargedTotal(c.price)), strong: true });

  return {
    studioName: settings.studioName,
    logoTop: brand.top || undefined,
    logoBottom: brand.bottom || undefined,
    note: settings.ticketNote || undefined,
    client: invoiceClientName(name),
    date: new Date(invoiceDate(rec)).toLocaleDateString(localeTag(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    firingType: service.name,
    firingTotal: eur(result.serviceRevenue),
    sharePct: c.sharePct,
    shape: kiln.shape,
    extras: [],
    lines,
    total: eur(chargedTotal(c.price)),
    thanks: t.ticket.defaultThanks(settings.studioName),
  };
}

/** Where this client's invoice is written, relative to the outputs folder. */
export function invoicePath(rec: FiringRecord, name: string): string[] | null {
  const kiln = kilnStore.list.find((k) => k.id === rec.planner.kilnId);
  if (!kiln) return null;
  const result = computeFiring(coreFiringFrom(rec.planner));
  const c = result.clients.find((x) => x.contactName === name);
  const stamp = new Date(invoiceDate(rec)).toISOString().slice(0, 10);
  const amount = c ? Math.round(chargedTotal(c.price)) : 0;
  return [kiln.name, stamp, `${name}_${amount}eur_${stamp}.pdf`];
}
