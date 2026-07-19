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

export type Locale = "en"; // extend as languages are added, e.g. "en" | "es"

export const LOCALES: { code: Locale; label: string }[] = [{ code: "en", label: "English" }];

const DICTS: Record<Locale, Dictionary> = { en };

const state = $state<{ locale: Locale }>({ locale: "en" });

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
}
