/**
 * Monthly collections — who owes the studio what, grouped by month.
 *
 * Studios rarely charge a firing on the day it's fired. The usual rhythm is
 * that a client fires a few times over a month and settles once at the end, so
 * the per-firing "has this person paid?" marks are the raw material and this is
 * the view the studio actually bills from.
 *
 * Pure and tested. Every number here ends up in a message sent to a client or a
 * partner who then collects real money, so it must be reproducible from its
 * inputs alone — no store, no dates from the clock, no i18n.
 *
 * Amounts arrive already invoiced (rounded up to the studio's step) because
 * that's what the client was told to pay. Summing them is therefore a plain
 * sum: rounding a second time here would invent cents nobody was billed.
 */

const round = (n: number): number => Math.round(n * 100) / 100;

/** One client's stake in one firing, as billed. */
export interface CollectionEntry {
  firingId: string;
  title: string;
  kilnName: string;
  /** When the firing was closed. Decides which month it belongs to. */
  at: number;
  client: string;
  /** What this client was billed for this firing, already invoiced. */
  amount: number;
  /** ISO date they paid, or null while outstanding. */
  paidAt: string | null;
}

export interface CollectionFiring extends CollectionEntry {
  paid: boolean;
}

export interface ClientCollection {
  client: string;
  /** Every firing of theirs this month, paid ones included, oldest first. */
  firings: CollectionFiring[];
  /** Everything billed this month. */
  total: number;
  /** Only what is still owed. */
  outstanding: number;
  /** Nothing left to collect from them this month. */
  settled: boolean;
}

export interface CollectionMonth {
  key: string; // "2026-08"
  label: string; // "Agosto de 2026"
  /** A timestamp inside the month — used for labelling and ordering. */
  at: number;
  clients: ClientCollection[];
  total: number;
  outstanding: number;
}

export function monthKeyOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The month containing `now`, in the same shape as the keys above. */
export function currentMonthKey(now: number = Date.now()): string {
  return monthKeyOf(now);
}

/**
 * A month can be billed once it is over.
 *
 * The whole point of a monthly statement is that it's complete: sending one
 * mid-month means sending a figure that will have changed by the time the
 * client reads it. Keys sort lexicographically because they're zero-padded.
 */
export function monthIsClosed(key: string, now: number = Date.now()): boolean {
  return key < currentMonthKey(now);
}

/**
 * Group billed entries into months, then clients.
 *
 * Clients are matched by name, because that's the only identity a firing's
 * planner records. Paid clients are kept in the month rather than dropped: they
 * are the record of what was collected, and dropping them would make marking
 * someone paid look like deleting them — with no way back to undo it.
 */
export function groupCollections(
  entries: CollectionEntry[],
  labelFor: (ts: number) => string,
): CollectionMonth[] {
  const byMonth = new Map<string, CollectionEntry[]>();
  for (const e of entries) {
    const key = monthKeyOf(e.at);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(e);
    else byMonth.set(key, [e]);
  }

  const months: CollectionMonth[] = [];
  for (const [key, rows] of byMonth) {
    const byClient = new Map<string, CollectionEntry[]>();
    for (const r of rows) {
      const bucket = byClient.get(r.client);
      if (bucket) bucket.push(r);
      else byClient.set(r.client, [r]);
    }

    const clients: ClientCollection[] = [...byClient].map(([client, rs]) => {
      // Chronological within a client: a statement reads as the month's story,
      // not as a feed.
      const firings = rs
        .slice()
        .sort((a, b) => a.at - b.at)
        .map((r) => ({ ...r, paid: r.paidAt !== null }));
      return {
        client,
        firings,
        total: round(firings.reduce((s, f) => s + f.amount, 0)),
        outstanding: round(firings.reduce((s, f) => s + (f.paid ? 0 : f.amount), 0)),
        settled: firings.every((f) => f.paid),
      };
    });

    // Who still owes comes first, largest debt first; the settled sit below in
    // a stable alphabetical order so they stop moving around once paid.
    clients.sort((a, b) => {
      if (a.settled !== b.settled) return a.settled ? 1 : -1;
      if (!a.settled && b.outstanding !== a.outstanding) return b.outstanding - a.outstanding;
      return a.client.localeCompare(b.client);
    });

    const at = Math.max(...rows.map((r) => r.at));
    months.push({
      key,
      label: labelFor(at),
      at,
      clients,
      total: round(clients.reduce((s, c) => s + c.total, 0)),
      outstanding: round(clients.reduce((s, c) => s + c.outstanding, 0)),
    });
  }

  months.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0)); // newest first
  return months;
}
