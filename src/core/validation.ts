import type { Firing } from "./types.js";
import { consumedHeightCm } from "./geometry.js";

export type IssueLevel = "error" | "warning";

export interface Issue {
  level: IssueLevel;
  levelIndex?: number;
  message: string;
}

const EPS = 1e-6;

/**
 * Structural checks on a firing layout. The engine will still compute a result
 * for an invalid layout (so the UI can show live feedback), but these issues
 * should block export / be surfaced to the user.
 */
export function validateFiring(firing: Firing): Issue[] {
  const issues: Issue[] = [];

  // Overfilled shelves: allocations on one level must not exceed 100%.
  firing.levels.forEach((level, i) => {
    const used = level.allocations.reduce((a, al) => a + al.fraction, 0);
    if (used > 1 + EPS) {
      issues.push({
        level: "error",
        levelIndex: i,
        message: `Level ${i + 1} is overfilled: ${(used * 100).toFixed(0)}% assigned (max 100%).`,
      });
    }
    level.allocations.forEach((al) => {
      if (al.fraction <= 0) {
        issues.push({
          level: "error",
          levelIndex: i,
          message: `Level ${i + 1}: "${al.contactName}" has a non-positive shelf fraction.`,
        });
      }
      if (al.complexity <= 0) {
        issues.push({
          level: "error",
          levelIndex: i,
          message: `Level ${i + 1}: "${al.contactName}" has a non-positive complexity factor.`,
        });
      }
    });
  });

  // Overstacked: consumed height must fit in the usable kiln height.
  const totalConsumed = firing.levels.reduce((a, l) => a + consumedHeightCm(l), 0);
  if (totalConsumed > firing.kiln.usableHeightCm + EPS) {
    issues.push({
      level: "error",
      message: `Levels consume ${totalConsumed} cm but the kiln only has ${firing.kiln.usableHeightCm} cm usable.`,
    });
  }

  if (firing.levels.every((l) => l.allocations.length === 0)) {
    issues.push({ level: "warning", message: "No clients assigned yet." });
  }

  const partnerTotal = firing.partners.reduce((a, p) => a + p.pct, 0);
  if (partnerTotal > 1 + EPS) {
    issues.push({
      level: "error",
      message: `Partner cuts add up to ${(partnerTotal * 100).toFixed(0)}% of gross profit (max 100%).`,
    });
  }

  return issues;
}
