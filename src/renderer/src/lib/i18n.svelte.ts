/**
 * i18n runtime — one reactive `t` that always points at the active language's
 * dictionary. Components read `t.home.currentFirings` (etc.); when `locale`
 * changes, every reader re-renders because reading `t.<ns>` goes through the
 * proxy, which reads the `locale` rune.
 *
 * Adding a language later = drop an `es.ts` next to `en.ts` (same shape as the
 * `Dictionary` type), register it in `DICTS`, add it to `LOCALES`. No component
 * changes needed. A settings selector then just calls `setLocale(...)`.
 */
import { storage } from "./storage";
import { en, type Dictionary } from "./i18n/en";
import { es } from "./i18n/es";

export type Locale = "en" | "es";
export type Currency = "EUR" | "USD";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];
export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
];

const DICTS: Record<Locale, Dictionary> = { en, es };

const state = $state<{ locale: Locale; currency: Currency }>({ locale: "en", currency: "EUR" });

/** BCP-47 tag used for number/date formatting — follows the active language. */
export function localeTag(): string {
  return state.locale === "en" ? "en-GB" : "es-ES";
}

/** Active dictionary as a reactive proxy: reading any namespace tracks `locale`. */
export const t: Dictionary = new Proxy({} as Dictionary, {
  get(_target, prop: string) {
    return (DICTS[state.locale] ?? en)[prop as keyof Dictionary];
  },
});

export function getLocale(): Locale {
  return state.locale;
}

export function setLocale(locale: Locale): void {
  if (!DICTS[locale]) return;
  state.locale = locale;
  void storage.write("locale", locale);
}

export async function loadLocale(): Promise<void> {
  const saved = await storage.read<Locale>("locale");
  if (saved && DICTS[saved]) state.locale = saved;
  const cur = await storage.read<Currency>("currency");
  if (cur === "EUR" || cur === "USD") state.currency = cur;
}

// ---- Currency (display symbol only; user-entered amounts never change) --------
export function getCurrency(): Currency {
  return state.currency;
}
export function setCurrency(currency: Currency): void {
  state.currency = currency;
  void storage.write("currency", currency);
}
