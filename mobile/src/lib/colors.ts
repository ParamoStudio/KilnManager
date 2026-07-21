/**
 * 12 soft, translucent pastel accents — copied verbatim from the desktop app so
 * a client keeps the same colour on the phone as on the computer. Within a
 * firing, each client takes a distinct colour by order of appearance.
 */
export const clientColors = [
  "#a78bfa", // violet
  "#7fdca4", // green
  "#f4b880", // amber
  "#8ab6f0", // blue
  "#e0a3c8", // pink
  "#9ad6d6", // teal
  "#d6c98f", // gold
  "#c8a3e0", // lilac
  "#8fd0b5", // mint
  "#f0a89a", // coral
  "#a9b8e8", // periwinkle
  "#d9b38f", // sand
];

/** Colour for the i-th distinct client in a firing. i < 0 → neutral. */
export function colorForIndex(i: number): string {
  if (i < 0) return "var(--text-faint)";
  return clientColors[i % clientColors.length]!;
}
