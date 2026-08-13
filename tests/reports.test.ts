import { describe, it, expect } from "vitest";
import { firingReport, monthReport } from "../src/renderer/src/lib/reports";

const FL = {
  firing: "Horneada",
  fullKiln: "el horno completo",
  toCollect: "A cobrar:",
  nothingToCollect: "Nada que cobrar — esta horneada era toda obra mía.",
  owePartner: (a: string) => `Os deberé ${a} de esta horneada.`,
  owePartners: (a: string) => `Os deberé ${a} de esta horneada:`,
};

const ML = {
  summary: (m: string) => `Resumen de ${m}`,
  gross: "Bruto del mes:",
  toPartners: "A socios:",
  net: "Neto reportado:",
  noPartners: "Sin socios este mes.",
};

const firing = {
  kilnName: "Tecnopiro 75 Gas",
  serviceName: "Bizcocho",
  firingPrice: "65,00 €",
  date: "11 de agosto de 2026",
  toCollect: "8,40 €",
  clients: [
    { name: "Esther Alumna", amount: "4,20 €" },
    { name: "Ro", amount: "4,20 €" },
  ],
  partners: [{ name: "Ranxo Taller · Su cliente", amount: "1,83 €" }],
  partnersTotal: "1,83 €",
};

describe("firing report", () => {
  it("tells a partner what to charge, to whom, and what they're owed", () => {
    const text = firingReport(firing, FL);
    expect(text).toBe(
      [
        "Horneada · Tecnopiro 75 Gas",
        "Bizcocho — 65,00 € el horno completo",
        "11 de agosto de 2026",
        "",
        "A cobrar: 8,40 €",
        "- Esther Alumna: 4,20 €",
        "- Ro: 4,20 €",
        "",
        "Os deberé 1,83 € de esta horneada.",
      ].join("\n"),
    );
  });

  it("never names the studio's own work — that isn't anyone's to collect", () => {
    const text = firingReport(firing, FL);
    expect(text).not.toContain("Myself");
    expect(text).not.toContain("propio");
  });

  it("says so plainly when there is nothing to collect", () => {
    const text = firingReport({ ...firing, clients: [], toCollect: "0,00 €" }, FL);
    expect(text).toContain("Nada que cobrar");
    expect(text).not.toContain("A cobrar:");
  });

  it("lists partners individually only when there are several", () => {
    const one = firingReport(firing, FL);
    expect(one).not.toContain("- Ranxo Taller · Su cliente: 1,83 €"); // no redundant list

    const two = firingReport(
      {
        ...firing,
        partners: [
          { name: "Ranxo Taller", amount: "1,83 €" },
          { name: "Otro Taller", amount: "0,90 €" },
        ],
        partnersTotal: "2,73 €",
      },
      FL,
    );
    expect(two).toContain("Os deberé 2,73 € de esta horneada:");
    expect(two).toContain("- Ranxo Taller: 1,83 €");
    expect(two).toContain("- Otro Taller: 0,90 €");
  });

  it("leaves the owing line out entirely when nobody is owed", () => {
    const text = firingReport({ ...firing, partners: [], partnersTotal: "0,00 €" }, FL);
    expect(text).not.toContain("deberé");
    expect(text).toContain("A cobrar: 8,40 €"); // still useful without partners
  });

  it("carries no formatting characters WhatsApp would reinterpret", () => {
    const text = firingReport(firing, FL);
    expect(text).not.toMatch(/[*_~`]/);
  });
});

describe("month report", () => {
  const month = {
    month: "Agosto de 2026",
    gross: "76,90 €",
    net: "53,82 €",
    partners: [{ name: "Ranxo Taller", amount: "23,08 €" }],
    partnersTotal: "23,08 €",
  };

  it("reads as a short settlement note", () => {
    expect(monthReport(month, ML)).toBe(
      [
        "Resumen de Agosto de 2026",
        "",
        "Bruto del mes: 76,90 €",
        "A socios: 23,08 €",
        "- Ranxo Taller: 23,08 €",
        "Neto reportado: 53,82 €",
      ].join("\n"),
    );
  });

  it("still reports the month when no partner is owed", () => {
    const text = monthReport({ ...month, partners: [], partnersTotal: "0,00 €" }, ML);
    expect(text).toContain("Sin socios este mes.");
    expect(text).toContain("Bruto del mes: 76,90 €");
    expect(text).toContain("Neto reportado: 53,82 €");
  });

  it("adds up every partner owed, not just the first", () => {
    const text = monthReport(
      {
        ...month,
        partners: [
          { name: "A", amount: "10,00 €" },
          { name: "B", amount: "5,00 €" },
        ],
        partnersTotal: "15,00 €",
      },
      ML,
    );
    expect(text).toContain("A socios: 15,00 €");
    expect(text).toContain("- A: 10,00 €");
    expect(text).toContain("- B: 5,00 €");
  });
});
