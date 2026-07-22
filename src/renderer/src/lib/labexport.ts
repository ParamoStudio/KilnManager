/**
 * Lab export — a firing leaves as a zip of client invoices plus its figures.
 *
 * The desktop app writes PDFs through Electron and keeps a running set of
 * books. A browser can do neither, so the lab build exports one firing at a
 * time and hands the file straight to the user. That is the whole storage
 * story here: work you want to keep, you export.
 *
 * The invoice is rendered from the same `ticket.ts` template the app prints,
 * rasterised at print resolution. Text in the PDF is therefore an image —
 * fine for a receipt sent over WhatsApp, and worth it to guarantee the page
 * looks exactly like the one on screen rather than maintaining a second
 * layout that would drift.
 *
 * Everything heavy here is imported dynamically: someone who never exports
 * never downloads any of it.
 */
import { xlsxParts, type Sheet } from "./xlsx";

export interface TicketFile {
  /** File name inside the zip, without extension. */
  name: string;
  /** A complete HTML document, from `buildTicketHtml`. */
  html: string;
}

const A4_W_MM = 210;
const A4_H_MM = 297;
/** 210 mm at 96 dpi — the width the ticket's own CSS is laid out against. */
const A4_W_PX = 794;

/** Render a standalone HTML document to a canvas, off-screen. */
async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_W_PX}px;height:1123px;border:0;`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("Could not prepare the invoice for export");
    doc.open();
    doc.write(html);
    doc.close();
    // Let the iframe lay out (and decode any logo) before measuring.
    await new Promise((r) => setTimeout(r, 60));
    if (doc.fonts?.ready) await doc.fonts.ready;

    const target = (doc.querySelector(".page") as HTMLElement | null) ?? doc.body;
    return await html2canvas(target, {
      scale: 2, // ~192 dpi: crisp in print, still a sane file size
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: A4_W_PX,
    });
  } finally {
    frame.remove();
  }
}

/** One canvas → a PDF, split across A4 pages if the invoice runs long. */
async function canvasToPdf(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const fullHeightMm = (canvas.height / canvas.width) * A4_W_MM;
  if (fullHeightMm <= A4_H_MM + 1) {
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W_MM, fullHeightMm);
  } else {
    // Taller than a page: slice the canvas rather than squashing it.
    const pxPerMm = canvas.width / A4_W_MM;
    const sliceHeightPx = Math.floor(A4_H_MM * pxPerMm);
    for (let y = 0, page = 0; y < canvas.height; y += sliceHeightPx, page++) {
      const h = Math.min(sliceHeightPx, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = h;
      slice.getContext("2d")?.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W_MM, h / pxPerMm);
    }
  }
  return new Uint8Array(pdf.output("arraybuffer"));
}

/** Strip anything a file system would object to, keeping it readable. */
export function safeName(s: string): string {
  return (
    s
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "untitled"
  );
}

export interface Bundle {
  /** Zip file name, without extension. */
  name: string;
  tickets: TicketFile[];
  sheet: Sheet;
}

/**
 * Build the zip and hand it to the browser. Resolves once the download has
 * been triggered; throws with a readable message if anything failed, so the
 * caller can say so rather than leaving a spinner running.
 */
export async function downloadFiringBundle(bundle: Bundle): Promise<void> {
  const { zipSync, strToU8 } = await import("fflate");

  const files: Record<string, Uint8Array> = {};

  for (const ticket of bundle.tickets) {
    const canvas = await renderToCanvas(ticket.html);
    files[`${safeName(ticket.name)}.pdf`] = await canvasToPdf(canvas);
  }

  // A spreadsheet is itself a zip, so it's zipped on its own first and goes in
  // as one entry — adding its parts directly would produce a folder, not a file.
  const sheetParts: Record<string, Uint8Array> = {};
  for (const [path, text] of Object.entries(xlsxParts([bundle.sheet]))) {
    sheetParts[path] = strToU8(text);
  }
  files[`${safeName(bundle.name)}.xlsx`] = zipSync(sheetParts);

  const zipped = zipSync(files);
  const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(bundle.name)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before dropping the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
