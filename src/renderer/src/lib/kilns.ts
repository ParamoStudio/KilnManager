import type { KilnProfile } from "@core";

/**
 * Seed kiln profiles. The app ships CLEAN — no demo kilns — so the studio adds
 * its own on first run (guided by the "add your first kiln" prompt). Kept as an
 * (empty) seed so the store has a single, obvious starting point.
 */
export const demoKilns: KilnProfile[] = [];
