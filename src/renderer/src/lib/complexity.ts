export type ComplexityKey = "simple" | "medium" | "complex";

/** Default complexity factors — a modifiable constant, to be refined (see Docs). */
export const COMPLEXITY: Record<ComplexityKey, { label: string; factor: number }> = {
  simple: { label: "Simple", factor: 1.0 },
  medium: { label: "Medium", factor: 1.15 },
  complex: { label: "Complex", factor: 1.3 },
};

export const complexityKeys: ComplexityKey[] = ["simple", "medium", "complex"];
