import { ipcMain, BrowserWindow, shell } from "electron";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { getVaultPath } from "./storage.js";

// ---- Expenses Log workbooks (one file per month) ---------------------------
// Plain (serialisable) shapes sent from the renderer's expenses derivation.
interface CostRow {
  title: string;
  at: number;
  clients: string[];
  revenue: number;
  fuelCost: number;
  fixedCost: number;
  kilnCosts: number;
  grossProfit: number;
  partnerCuts: { partner: string; tier: string; amount: number }[];
  net: number;
}
interface CostKiln {
  kilnName: string;
  firings: CostRow[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
}
interface CostPartner {
  name: string;
  total: number;
  tiers: { tier: string; amount: number }[];
  paid: boolean;
  paidAt: string | null; // ISO date (YYYY-MM-DD)
}
interface CostMonth {
  key: string; // "2026-07"
  label: string; // "Julio 2026"
  kilns: CostKiln[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
  partners: CostPartner[];
}

const INK = "FF141414";
const FAINT = "FF8A8A8A";
const RULE = "FFDDDDDD";
const GREEN = "FF1B7A3D";
const AMBER = "FFB56A00";
const eur = "#,##0.00 €";

const isoToDMY = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

/** One workbook for a single month: a sheet per kiln + a "Socios" sheet. */
function buildMonthWorkbook(m: CostMonth): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kiln Manager";
  wb.created = new Date();

  for (const kiln of m.kilns) {
    const ws = wb.addWorksheet((kiln.kilnName || "Horno").slice(0, 31));
    ws.columns = [
      { width: 14 }, // Fecha
      { width: 26 }, // Horneada
      { width: 30 }, // Clientes
      { width: 13 }, // Ingresos
      { width: 13 }, // Combustible
      { width: 13 }, // Fijos
      { width: 13 }, // Coste total
      { width: 14 }, // Bruto
      { width: 14 }, // Socios
      { width: 13 }, // Neto
    ];
    let r = 1;

    const title = ws.getCell(r, 1);
    title.value = `${kiln.kilnName} · ${m.label}`;
    title.font = { bold: true, size: 15, color: { argb: INK } };
    ws.mergeCells(r, 1, r, 10);
    r += 2;

    const headers = ["Fecha", "Horneada", "Clientes", "Ingresos", "Combustible", "Fijos", "Coste total", "Bruto", "Socios", "Neto"];
    const hrow = ws.getRow(r);
    headers.forEach((h, i) => {
      const c = hrow.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 10, color: { argb: FAINT } };
      c.alignment = { horizontal: i >= 3 ? "right" : "left" };
      c.border = { bottom: { style: "thin", color: { argb: RULE } } };
    });
    r += 1;

    for (const f of kiln.firings) {
      const row = ws.getRow(r);
      row.getCell(1).value = new Date(f.at);
      row.getCell(1).numFmt = "dd/mm/yyyy";
      row.getCell(2).value = f.title;
      row.getCell(3).value = f.clients.join(", ");
      row.getCell(3).font = { size: 10, color: { argb: FAINT } };
      const partnerTotal = f.partnerCuts.reduce((s, p) => s + p.amount, 0);
      const nums = [f.revenue, f.fuelCost, f.fixedCost, f.kilnCosts, f.grossProfit, partnerTotal, f.net];
      nums.forEach((n, i) => {
        const c = row.getCell(4 + i);
        c.value = n;
        c.numFmt = eur;
        c.alignment = { horizontal: "right" };
      });
      r += 1;
    }

    // Kiln month totals.
    const tr = ws.getRow(r);
    tr.getCell(2).value = "Total del mes";
    tr.getCell(2).font = { bold: true, color: { argb: INK } };
    const totals = [kiln.revenue, null, null, kiln.kilnCosts, kiln.grossProfit, null, kiln.net];
    totals.forEach((n, i) => {
      const c = tr.getCell(4 + i);
      if (n !== null) {
        c.value = n;
        c.numFmt = eur;
      }
      c.font = { bold: true, color: { argb: INK } };
      c.alignment = { horizontal: "right" };
      c.border = { top: { style: "thin", color: { argb: INK } } };
    });
  }

  // Partners sheet: what you owe each partner this month + tier breakdown + status.
  const ps = wb.addWorksheet("Socios");
  ps.columns = [{ width: 26 }, { width: 22 }, { width: 15 }, { width: 24 }];
  let r = 1;
  const t = ps.getCell(r, 1);
  t.value = `Socios · ${m.label}`;
  t.font = { bold: true, size: 15, color: { argb: INK } };
  ps.mergeCells(r, 1, r, 4);
  r += 2;

  if (m.partners.length === 0) {
    ps.getCell(r, 1).value = "Sin socios este mes.";
    ps.getCell(r, 1).font = { color: { argb: FAINT } };
  }

  for (const p of m.partners) {
    const hrow = ps.getRow(r);
    hrow.getCell(1).value = p.name;
    hrow.getCell(1).font = { bold: true, size: 12, color: { argb: INK } };
    const totalCell = hrow.getCell(3);
    totalCell.value = p.total;
    totalCell.numFmt = eur;
    totalCell.font = { bold: true, size: 12, color: { argb: INK } };
    totalCell.alignment = { horizontal: "right" };
    const statusCell = hrow.getCell(4);
    const paidDate = p.paid && p.paidAt ? isoToDMY(p.paidAt) : "";
    statusCell.value = p.paid ? (paidDate ? `PAGADO · ${paidDate}` : "PAGADO") : "PENDIENTE";
    statusCell.font = { bold: true, color: { argb: p.paid ? GREEN : AMBER } };
    statusCell.alignment = { horizontal: "right" };
    r += 1;
    // Tier breakdown lines.
    for (const tb of p.tiers) {
      const dr = ps.getRow(r);
      dr.getCell(2).value = tb.tier || "—";
      dr.getCell(2).font = { size: 10, color: { argb: FAINT } };
      const c = dr.getCell(3);
      c.value = tb.amount;
      c.numFmt = eur;
      c.alignment = { horizontal: "right" };
      c.font = { size: 10, color: { argb: FAINT } };
      r += 1;
    }
    r += 1; // gap between partners
  }
  return wb;
}

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

  // Rebuild <vault>/Expenses Log/<key label>.xlsx — one file per month.
  // Returns the abs path of the Expenses Log folder.
  ipcMain.handle("outputs:saveCosts", async (_e, months: CostMonth[]) => {
    const vault = getVaultPath();
    if (!vault) return null;
    const dir = join(vault, "Expenses Log");
    await fs.mkdir(dir, { recursive: true });
    for (const m of months) {
      const abs = join(dir, `${safe(m.label.replace(/\s+/g, "-"))}.xlsx`); // "Julio-2026.xlsx"
      await buildMonthWorkbook(m).xlsx.writeFile(abs);
    }
    return dir;
  });

  // Reveal (open) the Expenses Log folder.
  ipcMain.handle("outputs:openExpenses", async () => {
    const vault = getVaultPath();
    if (!vault) return;
    const dir = join(vault, "Expenses Log");
    await fs.mkdir(dir, { recursive: true });
    await shell.openPath(dir);
  });

  ipcMain.handle("outputs:reveal", async (_e, absPath: string) => {
    if (absPath) shell.showItemInFolder(absPath);
  });

  // Open a file in its default app (e.g. the ticket PDF in Preview).
  // Returns "" on success, or an error string so the renderer can fall back.
  ipcMain.handle("outputs:openFile", async (_e, absPath: string) => {
    if (!absPath) return "no-path";
    const err = await shell.openPath(absPath); // "" on success
    if (err) {
      try {
        await shell.openExternal(pathToFileURL(absPath).href);
        return "";
      } catch {
        return err;
      }
    }
    return "";
  });

  // Open an external https link in the user's browser (e.g. the Ko-fi page).
  ipcMain.handle("app:openExternal", async (_e, url: string) => {
    if (typeof url === "string" && /^https?:\/\//.test(url)) await shell.openExternal(url);
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
