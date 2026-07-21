/**
 * i18n runtime — same reactive-proxy pattern as the desktop app's
 * lib/i18n.svelte.ts (so this is a familiar file if you've touched that one).
 * Defaults to the phone's own language (navigator.language), persisted after
 * that; no in-app switcher yet (add one the same way desktop did, if wanted).
 */
import { storage } from "./storage";
import { en, type Dictionary } from "./i18n/en";
import { es } from "./i18n/es";

export type Locale = "en" | "es";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

const DICTS: Record<Locale, Dictionary> = { en, es };

function detectLocale(): Locale {
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

const state = $state<{ locale: Locale }>({ locale: detectLocale() });

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
