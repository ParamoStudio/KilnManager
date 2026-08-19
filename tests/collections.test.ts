import { describe, it, expect } from "vitest";
import {
  groupCollections,
  monthIsClosed,
  monthKeyOf,
  type CollectionEntry,
} from "../src/renderer/src/lib/collections";
import { collectionsReport } from "../src/renderer/src/lib/reports";

const label = (ts: number): string => monthKeyOf(ts); // tests don't care about i18n

const at = (iso: string): number => new Date(iso).getTime();

const entry = (over: Partial<CollectionEntry> & { client: string; at: number; amount: number }): CollectionEntry => ({
  firingId: `${over.client}-${over.at}`,
  title: "Horneada",
  kilnName: "Tecnopiro 75",
  paidAt: null,
  ...over,
});

describe("grouping collections", () => {
  const entries = [
    entry({ client: "Ana", at: at("2026-08-04T10:00"), amount: 10.6 }),
    entry({ client: "Ana", at: at("2026-08-20T10:00"), amount: 4.2 }),
    entry({ client: "Ro", at: at("2026-08-11T10:00"), amount: 21.2 }),
    entry({ client: "Ana", at: at("2026-07-09T10:00"), amount: 8 }),
  ];

  it("separates months and puts the newest first", () => {
    const months = groupCollections(entries, label);
    expect(months.map((m) => m.key)).toEqual(["2026-08", "2026-07"]);
  });

  it("adds up what each client owes across the month's firings", () => {
    const [aug] = groupCollections(entries, label);
    const ana = aug!.clients.find((c) => c.client === "Ana")!;
    expect(ana.firings).toHaveLength(2);
    expect(ana.total).toBe(14.8);
    expect(ana.outstanding).toBe(14.8);
    expect(aug!.outstanding).toBe(36);
  });

  it("lists a client's firings oldest first, as a bill reads", () => {
    const [aug] = groupCollections(entries, label);
    const ana = aug!.clients.find((c) => c.client === "Ana")!;
    expect(ana.firings.map((f) => f.at)).toEqual([at("2026-08-04T10:00"), at("2026-08-20T10:00")]);
  });

  it("counts only unpaid firings towards what is owed, but keeps the paid ones", () => {
    const months = groupCollections(
      [
        entry({ client: "Ana", at: at("2026-08-04T10:00"), amount: 10.6, paidAt: "2026-08-05" }),
        entry({ client: "Ana", at: at("2026-08-20T10:00"), amount: 4.2 }),
      ],
      label,
    );
    const ana = months[0]!.clients[0]!;
    expect(ana.firings).toHaveLength(2); // the statement still shows the whole month
    expect(ana.total).toBe(14.8);
    expect(ana.outstanding).toBe(4.2); // but only this is billed again
    expect(ana.settled).toBe(false);
  });

  it("keeps a fully paid client in the month so the mark can be undone", () => {
    const months = groupCollections(
      [entry({ client: "Ana", at: at("2026-08-04T10:00"), amount: 10.6, paidAt: "2026-08-05" })],
      label,
    );
    expect(months[0]!.clients).toHaveLength(1);
    expect(months[0]!.clients[0]!.settled).toBe(true);
    expect(months[0]!.outstanding).toBe(0);
  });

  it("puts who still owes above who has paid, biggest debt first", () => {
    const months = groupCollections(
      [
        entry({ client: "Paid", at: at("2026-08-01T10:00"), amount: 50, paidAt: "2026-08-02" }),
        entry({ client: "Small", at: at("2026-08-02T10:00"), amount: 5 }),
        entry({ client: "Big", at: at("2026-08-03T10:00"), amount: 30 }),
      ],
      label,
    );
    expect(months[0]!.clients.map((c) => c.client)).toEqual(["Big", "Small", "Paid"]);
  });

  it("does not let floating point invent cents in a total", () => {
    const months = groupCollections(
      [
        entry({ client: "Ana", at: at("2026-08-01T10:00"), amount: 10.6 }),
        entry({ client: "Ana", at: at("2026-08-02T10:00"), amount: 10.6 }),
        entry({ client: "Ana", at: at("2026-08-03T10:00"), amount: 0.2 }),
      ],
      label,
    );
    expect(months[0]!.clients[0]!.total).toBe(21.4);
    expect(months[0]!.total).toBe(21.4);
  });

  it("has nothing to show when no firing has been closed", () => {
    expect(groupCollections([], label)).toEqual([]);
  });
});

describe("when a month can be billed", () => {
  const now = at("2026-08-18T12:00");

  it("refuses the month still in progress — its figure would still move", () => {
    expect(monthIsClosed("2026-08", now)).toBe(false);
  });

  it("allows any month already over", () => {
    expect(monthIsClosed("2026-07", now)).toBe(true);
    expect(monthIsClosed("2025-12", now)).toBe(true);
  });

  it("compares by year first, not by month number", () => {
    expect(monthIsClosed("2025-09", now)).toBe(true); // later month, earlier year
    expect(monthIsClosed("2027-01", now)).toBe(false);
  });
});

describe("collections report", () => {
  const L = {
    heading: (m: string) => `Cobros de ${m}`,
    intro: "Esto es lo que tienen que pagar los clientes:",
    total: "Total:",
    nothing: (m: string) => `Nada pendiente de cobro en ${m}.`,
    provisional: (d: string) => `Provisional a ${d} — el mes no ha acabado todavía.`,
  };

  it("reads as a list a partner can collect from", () => {
    const text = collectionsReport(
      {
        month: "Agosto de 2026",
        clients: [
          { name: "Esther Alumna", amount: "21,20 €" },
          { name: "Ro", amount: "10,60 €" },
        ],
        total: "31,80 €",
      },
      L,
    );
    expect(text).toBe(
      [
        "Cobros de Agosto de 2026",
        "",
        "Esto es lo que tienen que pagar los clientes:",
        "- Esther Alumna: 21,20 €",
        "- Ro: 10,60 €",
        "",
        "Total: 31,80 €",
      ].join("\n"),
    );
  });

  it("says so plainly when everyone has paid", () => {
    const text = collectionsReport({ month: "Agosto de 2026", clients: [], total: "0,00 €" }, L);
    expect(text).toBe("Nada pendiente de cobro en Agosto de 2026.");
  });

  it("carries no costs, cuts or net — none of that is the collector's to see", () => {
    const text = collectionsReport(
      { month: "Agosto de 2026", clients: [{ name: "Ro", amount: "10,60 €" }], total: "10,60 €" },
      L,
    );
    expect(text.toLowerCase()).not.toContain("neto");
    expect(text.toLowerCase()).not.toContain("socio");
    expect(text.toLowerCase()).not.toContain("coste");
  });

  it("carries no formatting characters WhatsApp would reinterpret", () => {
    const text = collectionsReport(
      { month: "Agosto de 2026", clients: [{ name: "Ro", amount: "10,60 €" }], total: "10,60 €" },
      L,
    );
    expect(text).not.toMatch(/[*_~`]/);
  });

  it("warns in the text itself when the month is still running", () => {
    const text = collectionsReport(
      {
        month: "Agosto de 2026",
        clients: [{ name: "Ro", amount: "10,60 €" }],
        total: "10,60 €",
        provisional: "19 de agosto de 2026",
      },
      L,
    );
    expect(text).toBe(
      [
        "Cobros de Agosto de 2026",
        "Provisional a 19 de agosto de 2026 — el mes no ha acabado todavía.",
        "",
        "Esto es lo que tienen que pagar los clientes:",
        "- Ro: 10,60 €",
        "",
        "Total: 10,60 €",
      ].join("\n"),
    );
  });

  it("stamps the day it was taken, so a forwarded message stays traceable", () => {
    const text = collectionsReport(
      {
        month: "Agosto de 2026",
        clients: [{ name: "Ro", amount: "10,60 €" }],
        total: "10,60 €",
        provisional: "19 de agosto de 2026",
      },
      L,
    );
    expect(text).toContain("19 de agosto de 2026");
  });

  it("keeps the warning above the figures, where it is read first", () => {
    const text = collectionsReport(
      { month: "Agosto de 2026", clients: [{ name: "Ro", amount: "10,60 €" }], total: "10,60 €", provisional: "19 de agosto de 2026" },
      L,
    );
    expect(text.indexOf("Provisional")).toBeLessThan(text.indexOf("10,60 €"));
  });

  it("says nothing about provisional once the month is over", () => {
    const text = collectionsReport(
      { month: "Julio de 2026", clients: [{ name: "Ro", amount: "10,60 €" }], total: "10,60 €" },
      L,
    );
    expect(text).not.toContain("Provisional");
  });

  it("still warns when nobody owes anything yet", () => {
    const text = collectionsReport(
      { month: "Agosto de 2026", clients: [], total: "0,00 €", provisional: "19 de agosto de 2026" },
      L,
    );
    expect(text).toBe(
      "Nada pendiente de cobro en Agosto de 2026.\nProvisional a 19 de agosto de 2026 — el mes no ha acabado todavía.",
    );
  });
});
