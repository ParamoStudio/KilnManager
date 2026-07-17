import { ipcMain, BrowserWindow, shell } from "electron";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { getVaultPath } from "./storage.js";

/** Render a self-contained HTML document to a PDF buffer (offscreen window). */
async function renderPdf(html: string): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, sandbox: false },
  });
  try {
    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    return await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { marginType: "none" },
    });
  } finally {
    win.destroy();
  }
}

/** Keep path segments safe for the filesystem. */
function safe(seg: string): string {
  return seg.replace(/[^\p{L}\p{N} ._-]/gu, "").trim() || "untitled";
}

export function registerOutputs(): void {
  // Save one ticket PDF under <vault>/outputs/<...relPath>. Returns the abs path.
  ipcMain.handle("outputs:savePdf", async (_e, html: string, relParts: string[]) => {
    const vault = getVaultPath();
    if (!vault) return null;
    const abs = join(vault, "outputs", ...relParts.map(safe));
    await fs.mkdir(dirname(abs), { recursive: true });
    await fs.writeFile(abs, await renderPdf(html));
    return abs;
  });

  ipcMain.handle("outputs:reveal", async (_e, absPath: string) => {
    if (absPath) shell.showItemInFolder(absPath);
  });

  ipcMain.handle("outputs:openFolder", async () => {
    const vault = getVaultPath();
    if (vault) await shell.openPath(join(vault, "outputs"));
  });

  // Native macOS share sheet for a saved file (Mail, Messages, WhatsApp/…).
  ipcMain.handle("outputs:share", async (_e, absPath: string) => {
    if (process.platform !== "darwin" || !absPath) {
      if (absPath) shell.showItemInFolder(absPath); // fallback elsewhere
      return;
    }
    try {
      const { ShareMenu } = await import("electron");
      const menu = new (ShareMenu as unknown as new (o: { filePaths: string[] }) => { popup: (o: { window: BrowserWindow }) => void })({
        filePaths: [absPath],
      });
      const win = BrowserWindow.getFocusedWindow();
      if (win) menu.popup({ window: win });
    } catch {
      shell.showItemInFolder(absPath);
    }
  });
}
