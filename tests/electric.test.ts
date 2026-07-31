import { describe, it, expect } from "vitest";
import { tempBand, efficiencyFactor, electricKWh, electricFiringCost } from "../src/core/electric.js";

describe("electric firing cost", () => {
  it("bands a peak temperature", () => {
    expect(tempBand(700)).toBe("low");
    expect(tempBand(899)).toBe("low");
    expect(tempBand(900)).toBe("medium");
    expect(tempBand(1150)).toBe("medium");
    expect(tempBand(1151)).toBe("high");
    expect(tempBand(1280)).toBe("high");
  });

  it("prices a firing outside the usual range instead of refusing", () => {
    expect(tempBand(400)).toBe("low");
    expect(tempBand(1400)).toBe("high");
  });

  it("costs a thyristor slightly less than a relay at every temperature", () => {
    for (const temp of [700, 1000, 1250]) {
      expect(efficiencyFactor(temp, "thyristor")).toBeLessThan(efficiencyFactor(temp, "relay"));
    }
  });

  it("gets hungrier the hotter it goes", () => {
    expect(efficiencyFactor(700, "relay")).toBeLessThan(efficiencyFactor(1000, "relay"));
    expect(efficiencyFactor(1000, "relay")).toBeLessThan(efficiencyFactor(1250, "relay"));
  });

  it("matches the agreed worked example: 3.6 kW, 9 h, high temp, thyristor", () => {
    // 3.6 × 9 × 0.72 = 23.328 kWh
    expect(electricKWh(3.6, 9, 1250, "thyristor")).toBeCloseTo(23.328, 5);
    // …at 0.15 €/kWh
    expect(electricFiringCost(3.6, 9, 1250, "thyristor", 0.15)).toBeCloseTo(3.4992, 5);
  });

  it("prices each band from the agreed table", () => {
    const kwh = (t: number, s: "relay" | "thyristor") => electricKWh(10, 10, t, s);
    expect(kwh(700, "relay")).toBeCloseTo(40, 6); // 10 × 10 × 0.40
    expect(kwh(700, "thyristor")).toBeCloseTo(38, 6);
    expect(kwh(1000, "relay")).toBeCloseTo(55, 6);
    expect(kwh(1000, "thyristor")).toBeCloseTo(52, 6);
    expect(kwh(1250, "relay")).toBeCloseTo(75, 6);
    expect(kwh(1250, "thyristor")).toBeCloseTo(72, 6);
  });

  it("returns nothing rather than a wrong number when the kiln isn't set up yet", () => {
    expect(electricKWh(0, 9, 1250, "relay")).toBe(0);
    expect(electricKWh(3.6, 0, 1250, "relay")).toBe(0);
    expect(electricFiringCost(3.6, 9, 1250, "relay", 0)).toBe(0);
  });
});
