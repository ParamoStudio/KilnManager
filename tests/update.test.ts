import { describe, it, expect } from "vitest";
import { isNewer } from "../src/renderer/src/lib/semver";

describe("version comparison", () => {
  it("spots a newer version", () => {
    expect(isNewer("1.0.2", "1.0.3")).toBe(true);
    expect(isNewer("1.0.2", "1.1.0")).toBe(true);
    expect(isNewer("1.9.9", "2.0.0")).toBe(true);
  });

  it("doesn't nag when you're current or ahead", () => {
    expect(isNewer("1.0.2", "1.0.2")).toBe(false);
    expect(isNewer("1.0.3", "1.0.2")).toBe(false);
    expect(isNewer("2.0.0", "1.9.9")).toBe(false);
  });

  it("compares numerically, not as text — 1.0.10 beats 1.0.9", () => {
    expect(isNewer("1.0.9", "1.0.10")).toBe(true);
    expect(isNewer("1.0.10", "1.0.9")).toBe(false);
  });

  it("tolerates a leading v and missing parts", () => {
    expect(isNewer("1.0.2", "v1.0.3")).toBe(true);
    expect(isNewer("v1.0.2", "1.0.2")).toBe(false);
    expect(isNewer("1.0", "1.0.1")).toBe(true);
    expect(isNewer("1.0.0", "1.0")).toBe(false);
  });

  it("doesn't crash on nonsense, and doesn't claim an update either", () => {
    expect(isNewer("1.0.2", "")).toBe(false);
    expect(isNewer("1.0.2", "banana")).toBe(false);
  });
});
