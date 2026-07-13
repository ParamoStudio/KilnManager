/** Soft per-client accent palette. Assigned stably by first appearance order. */
export const clientColors = [
  "var(--violet)",
  "var(--green)",
  "var(--amber)",
  "var(--blue)",
  "#e0a3c8",
  "#9ad6d6",
  "#d6c98f",
  "#c8a3e0",
];

export function colorForName(name: string, names: string[]): string {
  const i = names.indexOf(name);
  return clientColors[(i < 0 ? 0 : i) % clientColors.length]!;
}
