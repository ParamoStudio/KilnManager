import { describe, it, expect } from "vitest";

/**
 * The built-in cost-line backfill, extracted from `kilns.svelte.ts`.
 *
 * This exists because of a real failure: the backfill compared against the
 * English name only, so once those lines were localized every launch added the
 * English pair back, the localize pass renamed them to Spanish too, and the kiln
 * ended up with two cost lines called the same thing. A keyed `{#each}` in the
 * outputs panel then threw on the duplicate key, the panel rendered empty, and
 * neither the client invoices nor the expenses workbook were ever written.
 *
 * Closing a firing silently produced nothing. Hence a test.
 */

const BUILTIN_FIXED = ["Maintenance reserve", "Consumables"] as const;
const BUILTIN_ALIASES: Record<(typeof BUILTIN_FIXED)[number], string[]> = {
  "Maintenance reserve": ["Maintenance reserve", "Reserva de mantenimiento"],
  Consumables: ["Consumables", "Consumibles"],
};

interface CostItem {
  name: string;
  amount: number;
  kind: "fixed" | "variable";
}

function backfill(existing: CostItem[]): CostItem[] {
  const items = [...existing];
  for (const key of BUILTIN_FIXED) {
    const matches = items.filter((c) => BUILTIN_ALIASES[key].includes(c.name));
    if (matches.length === 0) {
      items.push({ name: key, amount: 0, kind: "fixed" });
    } else if (matches.length > 1) {
      const keep = matches.find((c) => c.amount > 0) ?? matches[0]!;
      for (const dup of matches) if (dup !== keep) items.splice(items.indexOf(dup), 1);
    }
  }
  return items;
}

const names = (items: CostItem[]): string[] => items.map((c) => c.name);
const fixed = (name: string, amount = 0): CostItem => ({ name, amount, kind: "fixed" });

describe("built-in cost lines", () => {
  it("adds both to a kiln that has none", () => {
    expect(names(backfill([]))).toEqual(["Maintenance reserve", "Consumables"]);
  });

  it("does NOT re-add them once they've been localized", () => {
    const localized = [fixed("Reserva de mantenimiento", 6), fixed("Consumibles", 2)];
    expect(names(backfill(localized))).toEqual(["Reserva de mantenimiento", "Consumibles"]);
  });

  it("is idempotent — launching the app twice can't grow the list", () => {
    let items = backfill([fixed("Mantenimiento", 5)]);
    const first = names(items);
    for (let i = 0; i < 5; i++) items = backfill(items);
    expect(names(items)).toEqual(first);
  });

  it("repairs a kiln that already has duplicates, keeping the one with a value", () => {
    const broken = [fixed("Reserva de mantenimiento", 6), fixed("Consumibles", 2), fixed("Reserva de mantenimiento", 0), fixed("Consumibles", 0)];
    const repaired = backfill(broken);
    expect(names(repaired)).toEqual(["Reserva de mantenimiento", "Consumibles"]);
    expect(repaired.find((c) => c.name === "Reserva de mantenimiento")!.amount).toBe(6);
    expect(repaired.find((c) => c.name === "Consumibles")!.amount).toBe(2);
  });

  it("never leaves two lines with the same name — that's what broke the panel", () => {
    const cases: CostItem[][] = [
      [],
      [fixed("Maintenance reserve")],
      [fixed("Reserva de mantenimiento")],
      [fixed("Maintenance reserve"), fixed("Reserva de mantenimiento")],
      [fixed("Consumibles"), fixed("Consumables"), fixed("Mantenimiento", 3)],
    ];
    for (const c of cases) {
      const out = names(backfill(c));
      expect(new Set(out).size).toBe(out.length);
    }
  });

  it("leaves the user's own cost lines untouched", () => {
    const mine = [fixed("Mantenimiento", 5), fixed("Cones", 1)];
    const out = backfill(mine);
    expect(out).toContainEqual(fixed("Mantenimiento", 5));
    expect(out).toContainEqual(fixed("Cones", 1));
  });
});
