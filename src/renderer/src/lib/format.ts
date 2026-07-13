export const eur = (n: number): string =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export const pct = (n: number): string =>
  `${(n * 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })}%`;

export const num = (n: number, digits = 2): string =>
  n.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });
