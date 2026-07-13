import { app, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import { join } from "node:path";

/** All private user data lives here: <userData>/data/<key>.json */
function dataDir(): string {
  return join(app.getPath("userData"), "data");
}

function fileFor(key: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return join(dataDir(), `${key}.json`);
}

export function registerStorage(): void {
  ipcMain.handle("storage:read", async (_e, key: string) => {
    try {
      const raw = await fs.readFile(fileFor(key), "utf8");
      return JSON.parse(raw);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  });

  ipcMain.handle("storage:write", async (_e, key: string, value: unknown) => {
    await fs.mkdir(dataDir(), { recursive: true });
    // Write atomically: temp file + rename, so a crash never corrupts data.
    const target = fileFor(key);
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(tmp, target);
  });

  ipcMain.handle("storage:list", async () => {
    try {
      const files = await fs.readdir(dataDir());
      return files.filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5));
    } catch {
      return [];
    }
  });
}
