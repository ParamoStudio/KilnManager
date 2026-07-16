import { app, dialog, ipcMain, shell } from "electron";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Local-first storage. All user data lives as plain JSON files in a folder the
 * user chooses (the "vault") — the app is a viewer/generator of that format. A
 * marker file (`.paramo-kiln.json`) identifies the folder; a small pointer next
 * to Electron's own config remembers where the vault is, so we can detect if it
 * was moved or deleted and re-prompt.
 */
const MARKER = ".paramo-kiln.json";

let vaultPath: string | null = null;

function pointerFile(): string {
  return join(app.getPath("userData"), "vault-pointer.json");
}
async function readPointer(): Promise<string | null> {
  try {
    const p = JSON.parse(await fs.readFile(pointerFile(), "utf8")) as { path?: string };
    return typeof p.path === "string" ? p.path : null;
  } catch {
    return null;
  }
}
async function writePointer(path: string): Promise<void> {
  await fs.writeFile(pointerFile(), JSON.stringify({ path }, null, 2), "utf8");
}

function markerFile(dir: string): string {
  return join(dir, MARKER);
}
async function hasMarker(dir: string): Promise<boolean> {
  try {
    const m = JSON.parse(await fs.readFile(markerFile(dir), "utf8")) as { app?: string };
    return m.app === "paramo-kiln-manager";
  } catch {
    return false;
  }
}
async function ensureMarker(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  if (await hasMarker(dir)) return;
  const marker = {
    app: "paramo-kiln-manager",
    vaultId: randomUUID(),
    version: 1,
    createdAt: new Date().toISOString(),
    note: "This folder holds your Páramo Kiln Manager data. Keep this file — the app uses it to recognise the folder.",
  };
  await fs.writeFile(markerFile(dir), JSON.stringify(marker, null, 2), "utf8");
}

function fileFor(key: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error(`Invalid storage key: ${key}`);
  if (!vaultPath) throw new Error("No vault selected");
  return join(vaultPath, `${key}.json`);
}

async function status(): Promise<{ configured: boolean; path: string | null; valid: boolean }> {
  const p = vaultPath ?? (await readPointer());
  if (!p) return { configured: false, path: null, valid: false };
  return { configured: true, path: p, valid: await hasMarker(p) };
}

export function registerStorage(): void {
  // ---- Vault management ----
  ipcMain.handle("vault:status", async () => {
    const s = await status();
    if (s.valid && s.path) vaultPath = s.path; // adopt a valid vault on startup
    return s;
  });

  ipcMain.handle("vault:pick", async (_e, mode: "create" | "locate") => {
    const res = await dialog.showOpenDialog({
      title: mode === "create" ? "Choose where to keep your Páramo data" : "Locate your Páramo data folder",
      properties: ["openDirectory", "createDirectory"],
      buttonLabel: mode === "create" ? "Create here" : "Use this folder",
    });
    const dir = res.filePaths[0];
    if (res.canceled || !dir) return { ok: false, reason: "canceled" };
    if (mode === "locate" && !(await hasMarker(dir))) return { ok: false, reason: "not-a-vault" };
    if (mode === "create") await ensureMarker(dir);
    vaultPath = dir;
    await writePointer(dir);
    return { ok: true, path: dir };
  });

  ipcMain.handle("vault:reveal", async () => {
    if (vaultPath) await shell.openPath(vaultPath);
  });

  // ---- Data read/write/list — all go to the vault ----
  ipcMain.handle("storage:read", async (_e, key: string) => {
    const target = fileFor(key);
    let raw: string;
    try {
      raw = await fs.readFile(target, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt or hand-edited JSON — keep a copy aside and start that key fresh
      // so a single bad file never bricks the whole app.
      try {
        await fs.rename(target, `${target}.corrupt-${Date.now()}`);
      } catch {
        /* ignore — worst case the next write overwrites it */
      }
      return null;
    }
  });

  ipcMain.handle("storage:write", async (_e, key: string, value: unknown) => {
    if (!vaultPath) return; // not ready yet — the onboarding gates this
    await fs.mkdir(vaultPath, { recursive: true });
    // Write atomically: a UNIQUE temp file + rename, so a crash never corrupts
    // data and two near-simultaneous writes to the same key can't interleave.
    const target = fileFor(key);
    const tmp = `${target}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(tmp, target);
  });

  ipcMain.handle("storage:list", async () => {
    try {
      if (!vaultPath) return [];
      const files = await fs.readdir(vaultPath);
      return files.filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5));
    } catch {
      return [];
    }
  });
}
