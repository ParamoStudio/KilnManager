import { describe, it, expect } from "vitest";
import { footprintAreaCm2, usableVolumeLiters, consumedHeightCm } from "../src/core/geometry.js";
import type { KilnProfile } from "../src/core/types.js";

const cylinder: KilnProfile = {
  id: "k1",
  name: "Technopyro 75L",
  shape: "cylinder",
  diameterCm: 40,
  usableHeightCm: 62,
  defaultShelfThicknessCm: 1.5,
  standardPostHeightsCm: [5, 8, 10, 13, 15],
  services: [],
  defaultCostItems: [],
};

describe("geometry", () => {
  it("cylinder footprint = pi r^2", () => {
    expect(footprintAreaCm2(cylinder)).toBeCloseTo(Math.PI * 20 * 20, 4);
  });

  it("box footprint = w x d", () => {
    const box: KilnProfile = { ...cylinder, shape: "box", widthCm: 30, depthCm: 40, diameterCm: undefined };
    expect(footprintAreaCm2(box)).toBeCloseTo(1200, 6);
  });

  it("usable footprint factor scales the area", () => {
    expect(footprintAreaCm2({ ...cylinder, usableFootprintFactor: 0.9 })).toBeCloseTo(
      Math.PI * 400 * 0.9,
      4,
    );
  });

  it("usable volume in litres", () => {
    expect(usableVolumeLiters(cylinder)).toBeCloseTo((Math.PI * 400 * 62) / 1000, 4);
  });

  it("consumed height = support + shelf thickness", () => {
    expect(consumedHeightCm({ supportHeightCm: 8.5, shelfThicknessCm: 1.5, allocations: [] })).toBe(10);
  });

  it("throws if cylinder is missing its diameter", () => {
    expect(() => footprintAreaCm2({ ...cylinder, diameterCm: undefined })).toThrow();
  });
});
