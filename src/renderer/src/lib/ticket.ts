/**
 * Client firing ticket — a clean, informal "semi-professional" receipt.
 * One HTML generator used for BOTH the in-app preview (iframe) and the printed
 * PDF (Electron printToPDF), so what you see is exactly what you send.
 */
export interface TicketLine {
  label: string;
  value: string;
  strong?: boolean;
}
export interface TicketData {
  studioName: string;
  wordmarkSvg: string; // inline SVG markup
  emblemSvg: string; // inline SVG markup
  client: string;
  date: string;
  firingType: string;
  load: string; // "Shared kiln load" | "Sole load"
  complexity: string;
  sharePct: number; // 0..1 — the client's slice of the firing
  shape: "cylinder" | "box";
  extras: { label: string; value: string }[]; // Cone / Pieces / Pickup (optional)
  lines: TicketLine[]; // Service, surcharges, discounts
  total: string;
  thanks: string;
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

/** A small line-art kiln filled to the client's share (materiality, amiable). */
function miniKiln(shape: "cylinder" | "box", frac: number): string {
  const f = Math.max(0, Math.min(1, frac));
  if (shape === "box") {
    const topY = 16;
    const botY = 74;
    const fillTop = botY - (botY - topY) * f;
    return `<svg viewBox="0 0 72 86" width="58" height="70">
      <clipPath id="cb"><path d="M8 ${topY} L46 ${topY} L46 ${botY} L8 ${botY} Z"/></clipPath>
      <rect x="8" y="${fillTop}" width="38" height="${botY - fillTop}" fill="#e7e7e7" clip-path="url(#cb)"/>
      <path d="M8 ${topY} L46 ${topY} L46 ${botY} L8 ${botY} Z" fill="none" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M8 ${topY} L20 8 L58 8 L46 ${topY}" fill="none" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M46 ${topY} L58 8 L58 66 L46 ${botY}" fill="none" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>`;
  }
  const topY = 14;
  const botY = 74;
  const fillTop = botY - (botY - topY) * f;
  return `<svg viewBox="0 0 64 86" width="52" height="70">
    <clipPath id="cc"><path d="M8 ${topY} L8 ${botY} A24 7 0 0 0 56 ${botY} L56 ${topY} Z"/></clipPath>
    <rect x="8" y="${fillTop}" width="48" height="${botY - fillTop + 8}" fill="#e7e7e7" clip-path="url(#cc)"/>
    <ellipse cx="32" cy="${topY}" rx="24" ry="7" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <path d="M8 ${topY} L8 ${botY}" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M56 ${topY} L56 ${botY}" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M8 ${botY} A24 7 0 0 0 56 ${botY}" stroke="#111" stroke-width="1.4" fill="none"/>
  </svg>`;
}

export function buildTicketHtml(d: TicketData): string {
  const infoLeft = [
    { k: "Client", v: d.client },
    { k: "Date", v: d.date },
    { k: "Firing type", v: d.firingType },
  ];
  const infoRight = [{ k: "Load", v: d.load }, { k: "Complexity", v: d.complexity }, ...d.extras.map((e) => ({ k: e.label, v: e.value }))];

  const infoCol = (items: { k: string; v: string }[]): string =>
    items.map((i) => `<div class="field"><div class="k">${esc(i.k)}</div><div class="v">${esc(i.v)}</div></div>`).join("");

  const lineRows = d.lines
    .map(
      (l) =>
        `<div class="line ${l.strong ? "strong" : ""}"><span>${esc(l.label)}</span><span class="amt">${esc(l.value)}</span></div>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    html,body { margin:0; padding:0; background:#fff; color:#111;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; margin: 0 auto; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 22px; }
    h1 { font-size: 30px; font-weight: 600; letter-spacing: 0.02em; margin: 0; }
    .sub { font-size: 15px; color:#555; margin-top: 4px; }
    .wordmark { width: 210px; }
    .wordmark svg { width: 100%; height: auto; display:block; }
    .box { border: 1.5px solid #111; border-radius: 16px; padding: 20px 24px; }
    .info { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 40px; margin-bottom: 18px; }
    .field { margin-bottom: 10px; }
    .k { font-size: 13px; font-weight: 700; }
    .v { font-size: 15px; margin-top: 2px; }
    .items { margin-bottom: 22px; }
    .line { display:flex; justify-content:space-between; padding: 12px 2px; border-bottom: 1px dotted #bbb; font-size: 15px; }
    .line:last-child { border-bottom: none; }
    .line.strong { border-top: 1.5px solid #111; border-bottom: none; font-weight: 700; font-size: 18px; padding-top: 14px; }
    .amt { font-variant-numeric: tabular-nums; }
    .share { display:flex; align-items:center; gap: 16px; margin: 6px 2px 26px; }
    .share .txt { font-size: 13px; color:#444; line-height:1.5; }
    .share .pctbig { font-size: 20px; font-weight:700; color:#111; }
    .thanks { font-size: 14px; color:#333; margin: 4px 2px 0; line-height:1.6; }
    .foot { margin-top: 40px; padding-top: 16px; border-top: 1.5px solid #111; text-align:center; }
    .foot svg { width: 54px; height: auto; }
  </style></head><body><div class="page">
    <div class="top">
      <div><h1>FIRING TICKET</h1><div class="sub">${esc(d.studioName)}</div></div>
      <div class="wordmark">${d.wordmarkSvg}</div>
    </div>
    <div class="box info">
      <div>${infoCol(infoLeft)}</div>
      <div>${infoCol(infoRight)}</div>
    </div>
    <div class="box items">${lineRows}</div>
    <div class="share">
      ${miniKiln(d.shape, d.sharePct)}
      <div class="txt">Your pieces filled <span class="pctbig">${Math.round(d.sharePct * 100)}%</span><br/>of this firing.</div>
    </div>
    <div class="thanks">${esc(d.thanks)}</div>
    <div class="foot">${d.emblemSvg}</div>
  </div></body></html>`;
}
