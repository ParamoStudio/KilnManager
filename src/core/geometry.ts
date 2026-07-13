import type { KilnProfile, ShelfLevel } from "./types.js";

/**
 * Loadable footprint area of the kiln in cm².
 *
 * The footprint is constant across all levels of a given kiln, so it cancels
 * out when splitting one firing's price. It only matters for making the KLU an
 * ABSOLUTE, portable unit (comparable across kilns) and for the "% full" display.
 */
export function footprintAreaCm2(profile: KilnProfile): number {
  const factor = profile.usableFootprintFactor ?? 1;
  if (profile.shape === "cylinder") {
    if (profile.diameterCm == null) {
      throw new Error(`Cylinder kiln "${profile.name}" is missing diameterCm`);
    }
    const r = profile.diameterCm / 2;
    return Math.PI * r * r * factor;
  }
  if (profile.widthCm == null || profile.depthCm == null) {
    throw new Error(`Box kiln "${profile.name}" is missing widthCm/depthCm`);
  }
  return profile.widthCm * profile.depthCm * factor;
}

/** Total loadable kiln volume in litres (footprint × usable height). */
export function usableVolumeLiters(profile: KilnProfile): number {
  return (footprintAreaCm2(profile) * profile.usableHeightCm) / 1000;
}

/** Vertical band a level consumes: post height + shelf thickness (cm). */
export function consumedHeightCm(level: ShelfLevel): number {
  return level.supportHeightCm + level.shelfThicknessCm;
}
