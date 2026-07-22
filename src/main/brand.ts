import { ipcMain } from "electron";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { getVaultPath } from "./storage.js";

/**
 * Ticket logos, stored as real image files in `<vault>/Brand/`.
 *
 * They used to live inside `settings.json` as data URIs, which was wrong twice
 * over: every unrelated settings save had to carry the whole image (and could
 * lose it — two saves racing would write whichever snapshot landed last), and
 * the user's own logo was buried in a JSON blob instead of sitting in their
 * folder where they can see and replace it.
 *
 * One file per slot. Uploading a new one replaces it.
 */

export type LogoKind = "top" | "bottom";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};
const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
};

function brandDir(): string | null {
  const vault = getVaultPath();
  return vault ? join(vault, "Brand") : null;
}

function baseName(kind: LogoKind): string {
  return kind === "top" ? "logo-top" : "logo-bottom";
}

/** Any extension: the user may have replaced a png with an svg. */
async function findLogo(kind: LogoKind): Promise<string | null> {
  const dir = brandDir();
  if (!dir) return null;
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return null;
  }
  const stem = baseName(kind);
  const hit = names.find((n) => n.startsWith(`${stem}.`) && EXT_MIME[n.split(".").pop()!.toLowerCase()]);
  return hit ? join(dir, hit) : null;
}

async function readLogo(kind: LogoKind): Promise<string> {
  const file = await findLogo(kind);
  if (!file) return "";
  try {
    const ext = file.split(".").pop()!.toLowerCase();
    const buf = await fs.readFile(file);
    return `data:${EXT_MIME[ext]};base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

async function clearLogo(kind: LogoKind): Promise<void> {
  const file = await findLogo(kind);
  if (file) await fs.rm(file, { force: true });
}

export function registerBrand(): void {
  ipcMain.handle("brand:read", async () => ({
    top: await readLogo("top"),
    bottom: await readLogo("bottom"),
  }));

  ipcMain.handle("brand:write", async (_e, kind: LogoKind, dataUri: string) => {
    const dir = brandDir();
    if (!dir) throw new Error("No vault selected — the logo was not saved");
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUri);
    if (!m) throw new Error("That is not an image");
    const ext = MIME_EXT[m[1]!.toLowerCase()];
    if (!ext) throw new Error(`Unsupported image type: ${m[1]}`);

    await fs.mkdir(dir, { recursive: true });
    // Replace: drop whatever is there first, so changing format doesn't leave
    // two files fighting over the same slot.
    await clearLogo(kind);

    const body = m[2] ? Buffer.from(m[3]!, "base64") : Buffer.from(decodeURIComponent(m[3]!), "utf8");
    const target = join(dir, `${baseName(kind)}.${ext}`);
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, body);
    await fs.rename(tmp, target);
    return true;
  });

  ipcMain.handle("brand:clear", async (_e, kind: LogoKind) => {
    await clearLogo(kind);
    return true;
  });
}
