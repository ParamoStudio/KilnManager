/**
 * Firing-log grouping + search. Years of firings pile up here, so the log shows
 * only the newest and everything else is reached through the search panel.
 */
import type { FiringRecord } from "./firing.svelte";
import { localeTag } from "./i18n.svelte";

export interface MonthGroup {
  key: string; // YYYY-MM
  label: string; // "July 2026", localized
  rows: FiringRecord[];
}

const stampOf = (r: FiringRecord): number => r.closedAt ?? r.createdAt;

function monthLabel(ts: number): string {
  const s = new Date(ts).toLocaleDateString(localeTag(), { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Split an already newest-first list into month buckets, order preserved. */
export function groupByMonth(rows: FiringRecord[]): MonthGroup[] {
  const out: MonthGroup[] = [];
  for (const r of rows) {
    const d = new Date(stampOf(r));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const last = out[out.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else out.push({ key, label: monthLabel(stampOf(r)), rows: [r] });
  }
  return out;
}

/** Accent- and case-insensitive, so "maria" finds "María" and "julio" finds "Julio". */
const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Every whitespace-separated term must match somewhere — so "raku julio 2026"
 * narrows across kiln, month and year at once, which is how you actually look
 * for a firing. Results stay newest-first within equal relevance.
 */
export function searchFirings(
  rows: FiringRecord[],
  query: string,
  kilnNameOf: (r: FiringRecord) => string,
  kilnLocationOf: (r: FiringRecord) => string,
): FiringRecord[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;

  const scored: { r: FiringRecord; score: number }[] = [];
  for (const r of rows) {
    const ts = stampOf(r);
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const fields = [
      r.title,
      kilnNameOf(r),
      kilnLocationOf(r),
      monthLabel(ts),
      // Months in both languages plus numeric forms, so "julio", "july" and
      // "2026-07" all find the same firing whatever the UI language is.
      new Date(ts).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      new Date(ts).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      `${d.getFullYear()}-${mm}`,
      String(d.getFullYear()),
      // client names in this firing
      ...Object.keys(r.clientNotes ?? {}),
      ...r.planner.levels.flatMap((l) => l.segments.map((s) => s?.contactName ?? "")),
    ].map(norm);

    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      const hit = fields.findIndex((f) => f.includes(term));
      if (hit < 0) {
        matchedAll = false;
        break;
      }
      // Earlier fields (title, kiln) count for more than a client buried inside.
      score += hit === 0 ? 3 : hit <= 2 ? 2 : 1;
    }
    if (matchedAll) scored.push({ r, score });
  }
  return scored.sort((a, b) => b.score - a.score || stampOf(b.r) - stampOf(a.r)).map((x) => x.r);
}
