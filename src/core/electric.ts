import type { ElectricSystem } from "./types.js";

/**
 * What an electric firing actually costs to run.
 *
 * A kiln's elements are not drawing power for the whole firing: the controller
 * switches them on and off to hold the ramp, so the real consumption is the
 * kiln's rated power × the time the elements are *actually* on. That fraction
 * is the efficiency factor, and it depends on two things:
 *
 *  - **How hot it gets.** Higher peak temperature means the elements spend more
 *    of the cycle on, because losses grow with temperature.
 *  - **How the elements are switched.** A thyristor modulates the current; a
 *    relay can only be fully on or fully off, so it overshoots and corrects,
 *    spending marginally more.
 *
 * So the ceramicist supplies what they actually know — the kiln's kW, how long
 * the firing runs, how hot it goes — and this turns that into money. Which is a
 * far more honest number than asking someone to guess a kWh figure per service.
 */

/** Peak-temperature bands, in °C. */
export type TempBand = "low" | "medium" | "high";

/**
 * The band a peak temperature falls in. Deliberately clamped rather than
 * validated: a firing below 600 °C or above 1320 °C is unusual but not wrong,
 * and refusing to price it would be worse than pricing it at the nearest band.
 */
export function tempBand(maxTempC: number): TempBand {
  if (maxTempC < 900) return "low";
  if (maxTempC <= 1150) return "medium";
  return "high";
}

/**
 * Fraction of the firing the elements are drawing power for.
 * Thyristor is the lower (more efficient) figure in every band.
 */
const FACTORS: Record<TempBand, Record<ElectricSystem, number>> = {
  low: { relay: 0.4, thyristor: 0.38 },
  medium: { relay: 0.55, thyristor: 0.52 },
  high: { relay: 0.75, thyristor: 0.72 },
};

export function efficiencyFactor(maxTempC: number, system: ElectricSystem): number {
  return FACTORS[tempBand(maxTempC)][system];
}

/** kWh an electric firing consumes: power × time × the fraction actually drawn. */
export function electricKWh(powerKw: number, hours: number, maxTempC: number, system: ElectricSystem): number {
  if (!(powerKw > 0) || !(hours > 0)) return 0;
  return powerKw * hours * efficiencyFactor(maxTempC, system);
}

/** …and what that costs at a given €/kWh. */
export function electricFiringCost(
  powerKw: number,
  hours: number,
  maxTempC: number,
  system: ElectricSystem,
  pricePerKWh: number,
): number {
  return electricKWh(powerKw, hours, maxTempC, system) * (pricePerKWh || 0);
}
