export const eur = (n: number): string =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export const pct = (n: number): string =>
  `${(n * 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })}%`;

export const num = (n: number, digits = 2): string =>
  n.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Dates in English (day-first). When the bilingual selector lands, this locale
// becomes dynamic; for now the app defaults to English.
export const fmtDay = (ts: number): string =>
  new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const fmtFull = (ts: number): string =>
  new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
