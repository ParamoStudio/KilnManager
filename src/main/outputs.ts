import { ipcMain, BrowserWindow, shell } from "electron";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import ExcelJS from "exceljs";
import { getVaultPath } from "./storage.js";

// ---- KilnCosts workbook ----------------------------------------------------
// Plain (serialisable) shape sent from the renderer's expenses derivation.
interface CostRow {
  title: string;
  at: number;
  clients: string[];
  revenue: number;
  fuelCost: number;
  fixedCost: number;
  kilnCosts: number;
  grossProfit: number;
  partnerCuts: { name: string; amount: number }[];
  net: number;
}
interface CostMonth {
  label: string;
  firings: CostRow[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
  partnerDebt: { name: string; amount: number }[];
}
interface CostKiln {
  kilnName: string;
  months: CostMonth[];
  revenue: number;
  kilnCosts: number;
  grossProfit: number;
  net: number;
}

const INK = "FF141414";
const FAINT = "FF8A8A8A";
const RULE = "FFDDDDDD";
const eur = "#,##0.00 €";

function buildCostsWorkbook(data: CostKiln[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kiln Manager";
  wb.created = new Date();

  if (data.length === 0) {
    const ws = wb.addWorksheet("Sin datos");
    ws.getCell("A1").value = "Aún no hay horneadas cerradas.";
    return wb;
  }

  for (const kiln of data) {
    const ws = wb.addWorksheet(kiln.kilnName.slice(0, 31) || "Horno");
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

    // Kiln title + grand totals.
    const title = ws.getCell(r, 1);
    title.value = kiln.kilnName;
    title.font = { bold: true, size: 16, color: { argb: INK } };
    ws.mergeCells(r, 1, r, 3);
    const totCell = ws.getCell(r, 4);
    totCell.value = { richText: [{ text: "Neto acumulado  ", font: { color: { argb: FAINT } } }] };
    ws.getCell(r, 8).value = "Bruto";
    ws.getCell(r, 8).font = { color: { argb: FAINT }, size: 10 };
    ws.getCell(r, 8).alignment = { horizontal: "right" };
    ws.getCell(r, 9).value = kiln.grossProfit;
    ws.getCell(r, 9).numFmt = eur;
    ws.getCell(r, 10).value = kiln.net;
    ws.getCell(r, 10).numFmt = eur;
    ws.getCell(r, 10).font = { bold: true, color: { argb: INK } };
    r += 2;

    for (const m of kiln.months) {
      // Month banner.
      const banner = ws.getCell(r, 1);
      banner.value = m.label;
      banner.font = { bold: true, size: 12, color: { argb: INK } };
      ws.mergeCells(r, 1, r, 10);
      r += 1;

      // Column header.
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

      // Firing rows.
      for (const f of m.firings) {
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

      // Month totals row.
      const tr = ws.getRow(r);
      tr.getCell(2).value = "Total del mes";
      tr.getCell(2).font = { bold: true, color: { argb: INK } };
      const partnerMonth = m.partnerDebt.reduce((s, p) => s + p.amount, 0);
      const totals = [m.revenue, null, null, m.kilnCosts, m.grossProfit, partnerMonth, m.net];
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
      r += 1;

      // Per-partner debt for the month.
      if (m.partnerDebt.length) {
        for (const p of m.partnerDebt) {
          const dr = ws.getRow(r);
          dr.getCell(2).value = `Debes a ${p.name}`;
          dr.getCell(2).font = { italic: true, size: 10, color: { argb: FAINT } };
          const c = dr.getCell(9);
          c.value = p.amount;
          c.numFmt = eur;
          c.alignment = { horizontal: "right" };
          c.font = { size: 10, color: { argb: FAINT } };
          r += 1;
        }
      }
      r += 1; // gap between months
    }
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

  // Rebuild <vault>/KilnCosts.xlsx from the renderer's cost data. Returns abs path.
  ipcMain.handle("outputs:saveCosts", async (_e, data: CostKiln[]) => {
    const vault = getVaultPath();
    if (!vault) return null;
    const abs = join(vault, "KilnCosts.xlsx");
    const wb = buildCostsWorkbook(data);
    await wb.xlsx.writeFile(abs);
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
