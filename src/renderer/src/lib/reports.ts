/**
 * Plain-text reports a studio copies into WhatsApp.
 *
 * These exist because partners often collect the money. When the owner can't be
 * at the studio, whoever is there needs to know what to charge, to whom, and
 * what they're owed for it — otherwise they're collecting blind.
 *
 * Deliberately plain text: no asterisks or markdown, because WhatsApp would
 * turn some of it into formatting and anywhere else it would just show the
 * punctuation. Amounts arrive pre-formatted so this file never has a second
 * opinion about currency, and labels arrive from the caller so it works in
 * either language without knowing about i18n.
 *
 * Pure and tested — a partner acting on a wrong figure is a real-world problem,
 * not a cosmetic one.
 */

export interface ReportLine {
  name: string;
  amount: string;
}

export interface FiringReportLabels {
  firing: string;
  fullKiln: string;
  toCollect: string;
  nothingToCollect: string;
  /** Used when exactly one partner is owed. */
  owePartner: (amount: string) => string;
  /** Used when several are, as a heading above the list. */
  owePartners: (amount: string) => string;
}

export interface FiringReportInput {
  kilnName: string;
  serviceName: string;
  /** The service's price for a full kiln, formatted. */
  firingPrice: string;
  /** The firing's date, already localized. */
  date: string;
  /** Everything to be collected, formatted. */
  toCollect: string;
  /** Per paying client. The studio's own work is never in here. */
  clients: ReportLine[];
  /** Partner cuts owed from this firing. */
  partners: ReportLine[];
  /** Total owed to partners, formatted. */
  partnersTotal: string;
}

export function firingReport(d: FiringReportInput, L: FiringReportLabels): string {
  const out: string[] = [
    `${L.firing} · ${d.kilnName}`,
    `${d.serviceName} — ${d.firingPrice} ${L.fullKiln}`,
    d.date,
    "",
  ];

  if (d.clients.length === 0) {
    out.push(L.nothingToCollect);
  } else {
    out.push(`${L.toCollect} ${d.toCollect}`);
    for (const c of d.clients) out.push(`- ${c.name}: ${c.amount}`);
  }

  if (d.partners.length === 1) {
    out.push("", L.owePartner(d.partnersTotal));
  } else if (d.partners.length > 1) {
    out.push("", L.owePartners(d.partnersTotal));
    for (const p of d.partners) out.push(`- ${p.name}: ${p.amount}`);
  }

  return out.join("\n");
}

export interface MonthReportLabels {
  summary: (month: string) => string;
  gross: string;
  toPartners: string;
  net: string;
  noPartners: string;
}

export interface MonthReportInput {
  /** The month, already localized ("August 2026"). */
  month: string;
  gross: string;
  net: string;
  partners: ReportLine[];
  partnersTotal: string;
}

export function monthReport(d: MonthReportInput, L: MonthReportLabels): string {
  const out: string[] = [L.summary(d.month), "", `${L.gross} ${d.gross}`];

  if (d.partners.length === 0) {
    out.push(L.noPartners);
  } else {
    out.push(`${L.toPartners} ${d.partnersTotal}`);
    for (const p of d.partners) out.push(`- ${p.name}: ${p.amount}`);
  }

  out.push(`${L.net} ${d.net}`);
  return out.join("\n");
}

/**
 * Copy text, reporting whether it worked.
 *
 * The clipboard can be refused (permissions, an insecure context), and a button
 * that says "Copied" when nothing was copied is worse than one that admits it.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface CollectionsReportLabels {
  heading: (month: string) => string;
  intro: string;
  total: string;
  nothing: (month: string) => string;
  /** Printed when the month is still running, stamped with the day it was taken. */
  provisional: (date: string) => string;
}

export interface CollectionsReportInput {
  /** The month, already localized ("Agosto de 2026"). */
  month: string;
  /** One line per client who still owes, formatted. */
  clients: ReportLine[];
  /** Everything outstanding that month, formatted. */
  total: string;
  /**
   * Set when the month hasn't ended: the day this was taken, already localized.
   * It doubles as the flag — a provisional figure without a date on it is
   * exactly the thing this is meant to prevent, so the two can't come apart.
   */
  provisional?: string;
}

/**
 * What each client owes for a whole month.
 *
 * This goes to whoever collects at the studio — often a partner rather than the
 * owner — so it names people and amounts and nothing else. No costs, no cuts,
 * no net: none of that is theirs to see, and any of it on screen invites the
 * wrong figure being charged.
 */
export function collectionsReport(d: CollectionsReportInput, L: CollectionsReportLabels): string {
  // The warning is part of the message, not part of the button. A total copied
  // mid-month is still a useful thing to send; what would be dishonest is
  // letting it arrive looking final, and a rule enforced in the UI stops
  // applying the moment the text is pasted somewhere else. It carries the day
  // it was taken for the same reason: a forwarded message has no other way of
  // saying which afternoon's figures these were.
  const head: string[] = [L.heading(d.month)];
  if (d.provisional) head.push(L.provisional(d.provisional));

  // Nothing owed already names the month, so it stands alone rather than under
  // a heading that would say the month twice.
  if (d.clients.length === 0) {
    return d.provisional ? [L.nothing(d.month), L.provisional(d.provisional)].join("\n") : L.nothing(d.month);
  }

  const out: string[] = [...head, "", L.intro];
  for (const c of d.clients) out.push(`- ${c.name}: ${c.amount}`);
  out.push("", `${L.total} ${d.total}`);
  return out.join("\n");
}
