/**
 * Ticket logos.
 *
 * They live as real image files in `<vault>/Brand/` (see `main/brand.ts`) and
 * are held here as data URIs, which is what both the live preview and the PDF
 * need to embed them.
 *
 * They used to be stored inside `settings.json`. That lost them: every
 * unrelated settings save carried the whole image, and two saves racing wrote
 * whichever snapshot happened to land last — so a logo could vanish on the next
 * restart with nothing having gone visibly wrong. Keeping them as files also
 * means the user can see and replace them in their own folder.
 *
 * On the web build there is no vault, so they fall back to storage (which is
 * localStorage there) and behave as before.
 */
import { storage, isDesktop } from "./storage";

export const brand = $state<{ top: string; bottom: string; loaded: boolean }>({
  top: "",
  bottom: "",
  loaded: false,
});

export type LogoKind = "top" | "bottom";

const WEB_KEY: Record<LogoKind, string> = { top: "brandLogoTop", bottom: "brandLogoBottom" };

export async function loadBrand(): Promise<void> {
  if (isDesktop && window.kilnAPI) {
    try {
      const got = await window.kilnAPI.brandRead();
      brand.top = got.top;
      brand.bottom = got.bottom;
    } catch {
      /* no vault yet, or unreadable — the ticket simply prints without a logo */
    }
  } else {
    brand.top = (await storage.read<string>(WEB_KEY.top)) ?? "";
    brand.bottom = (await storage.read<string>(WEB_KEY.bottom)) ?? "";
  }
  brand.loaded = true;
}

/** Returns false if it couldn't be stored — the caller must say so, not close. */
export async function setBrandLogo(kind: LogoKind, dataUri: string): Promise<boolean> {
  try {
    if (isDesktop && window.kilnAPI) await window.kilnAPI.brandWrite(kind, dataUri);
    else await storage.write(WEB_KEY[kind], dataUri);
  } catch (e) {
    console.error("Could not save the logo", e);
    return false;
  }
  brand[kind] = dataUri;
  return true;
}

export async function clearBrandLogo(kind: LogoKind): Promise<boolean> {
  try {
    if (isDesktop && window.kilnAPI) await window.kilnAPI.brandClear(kind);
    else await storage.write(WEB_KEY[kind], "");
  } catch (e) {
    console.error("Could not remove the logo", e);
    return false;
  }
  brand[kind] = "";
  return true;
}

/**
 * One-time move of logos that are still sitting inside settings.json. Runs
 * after both settings and brand have loaded; only acts when there's something
 * to move and the Brand folder hasn't got one already.
 */
export async function migrateLogosFromSettings(
  settingsTop: string,
  settingsBottom: string,
  clear: () => void,
): Promise<boolean> {
  let moved = false;
  if (settingsTop && !brand.top) moved = (await setBrandLogo("top", settingsTop)) || moved;
  if (settingsBottom && !brand.bottom) moved = (await setBrandLogo("bottom", settingsBottom)) || moved;
  // Clear them from settings either way once they're safely out — leaving a
  // copy behind means the next settings save keeps dragging it around.
  if (settingsTop || settingsBottom) clear();
  return moved;
}
