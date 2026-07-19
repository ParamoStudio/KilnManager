/**
 * Formatting helpers — locale- and currency-aware. The formatting locale and
 * the currency symbol both follow the user's display preferences (see
 * i18n.svelte.ts). Amounts are never converted: only the symbol/locale of the
 * presentation changes (the numbers are user input).
 */
import { localeTag, getCurrency } from "./i18n.svelte";

/** Money in the active currency + locale (e.g. "€94.00", "$94.00", "94,00 €"). */
export const eur = (n: number): string =>
  n.toLocaleString(localeTag(), { style: "currency", currency: getCurrency(), currencyDisplay: "narrowSymbol" });

export const pct = (n: number): string =>
  `${(n * 100).toLocaleString(localeTag(), { maximumFractionDigits: 0 })}%`;

export const num = (n: number, digits = 2): string =>
  n.toLocaleString(localeTag(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtDay = (ts: number): string =>
  new Date(ts).toLocaleDateString(localeTag(), { day: "numeric", month: "short" });

export const fmtFull = (ts: number): string =>
  new Date(ts).toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" });
