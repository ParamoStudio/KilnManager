/**
 * Client firing ticket — a clean, informal "semi-professional" receipt.
 * One HTML generator used for BOTH the in-app preview (iframe) and the printed
 * PDF (Electron printToPDF), so what you see is exactly what you send.
 */
import { t } from "./i18n.svelte";

export interface TicketLine {
  label: string;
  value: string;
  strong?: boolean;
}
export interface TicketData {
  studioName: string;
  logoTop?: string; // data URI (optional) — shown in the header
  logoBottom?: string; // data URI (optional) — shown in the footer
  note?: string; // free note/message printed on the ticket (optional)
  client: string;
  date: string;
  firingType: string;
  firingTotal: string; // total price of the whole firing (this service/tier)
  sharePct: number; // 0..1 — the client's slice of the firing
  shape: "cylinder" | "box";
  extras: { label: string; value: string }[]; // optional extra fields
  lines: TicketLine[]; // Service, surcharges, discounts
  total: string;
  thanks: string;
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}
const escBr = (s: string): string => esc(s).replace(/\n/g, "<br/>");

/**
 * One stylesheet for every document the studio sends out.
 *
 * The invoice and the monthly statement are the same piece of stationery in
 * two lengths, and a client receives both. Shared rather than copied so a
 * change to one can't quietly leave the other looking like a different studio.
 */
const SHEET = `    * { box-sizing: border-box; }
    html,body { margin:0; padding:0; background:#fff; color:#111;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; margin: 0 auto; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 22px; }
    h1 { font-size: 30px; font-weight: 600; letter-spacing: 0.02em; margin: 0; }
    .sub { font-size: 15px; color:#555; margin-top: 4px; }
    .logo-top { max-width: 210px; max-height: 96px; object-fit: contain; display:block; }
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
    /* The share reads as one sentence: the number is emphasis, not a headline,
       so it sits in a pill at text size rather than shouting in 20px. */
    .share .pctbig { font-size: 13px; font-weight:700; color:#111;
      border:1px solid #cfcfcf; border-radius: 999px; padding: 2px 8px; margin: 0 2px;
      white-space: nowrap; }
    .note { font-size: 14px; color:#222; margin: 2px 2px 18px; line-height:1.6; white-space: pre-line; }
    .thanks { font-size: 14px; color:#333; margin: 4px 2px 0; line-height:1.6; }
    .foot { margin-top: 40px; padding-top: 16px; border-top: 1.5px solid #111; text-align:center; }
    .foot img { max-width: 130px; max-height: 72px; object-fit: contain; display:inline-block; }
`;

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
    { k: t.ticket.client, v: d.client },
    { k: t.ticket.date, v: d.date },
  ];
  const infoRight = [
    { k: t.ticket.firingType, v: d.firingType },
    { k: t.ticket.firingTotal, v: d.firingTotal },
    ...d.extras.map((e) => ({ k: e.label, v: e.value })),
  ];

  const infoCol = (items: { k: string; v: string }[]): string =>
    items.map((i) => `<div class="field"><div class="k">${esc(i.k)}</div><div class="v">${esc(i.v)}</div></div>`).join("");

  const lineRows = d.lines
    .map(
      (l) =>
        `<div class="line ${l.strong ? "strong" : ""}"><span>${esc(l.label)}</span><span class="amt">${esc(l.value)}</span></div>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${SHEET}  </style></head><body><div class="page">
    <div class="top">
      <div><h1>${esc(t.ticket.heading)}</h1><div class="sub">${esc(d.studioName)}</div></div>
      ${d.logoTop ? `<img class="logo-top" src="${d.logoTop}" alt=""/>` : ""}
    </div>
    <div class="box info">
      <div>${infoCol(infoLeft)}</div>
      <div>${infoCol(infoRight)}</div>
    </div>
    <div class="box items">${lineRows}</div>
    <div class="share">
      ${miniKiln(d.shape, d.sharePct)}
      <div class="txt">${esc(t.ticket.yourPiecesFilled)} <span class="pctbig">${Math.round(d.sharePct * 100)}%</span> ${esc(t.ticket.ofThisFiring)}</div>
    </div>
    <div class="thanks">${escBr(d.note || d.thanks)}</div>
    ${d.logoBottom ? `<div class="foot"><img src="${d.logoBottom}" alt=""/></div>` : ""}
  </div></body></html>`;
}

// ---- Monthly statement ------------------------------------------------------

export interface StatementFiring {
  title: string; // what the firing was called
  sub: string; // kiln · date
  value: string; // what this client was billed for it
  paid: boolean; // already settled — shown, but not billed again
}

export interface StatementData {
  studioName: string;
  logoTop?: string;
  logoBottom?: string;
  note?: string;
  client: string;
  month: string; // already localized ("Agosto de 2026")
  firings: StatementFiring[];
  /** Shown only when part of the month was already settled. */
  paidTotal?: string;
  /**
   * Set when the month hasn't ended: the day this was drawn up, localized.
   * A statement taken mid-month is out of date the next time this client fires,
   * and unlike the app's own screens a PDF has no way of refreshing itself —
   * so it has to say when it was true. Doubles as the flag, so a provisional
   * statement can never go out without its date.
   */
  provisional?: string;
  /** What is actually owed — the paid firings are not in here. */
  total: string;
  thanks: string;
}

/**
 * A month's firings on one page, for a client who settles monthly.
 *
 * It lists the whole month, paid firings included, and bills only what is still
 * outstanding. Showing only the unpaid ones would be shorter but leaves the
 * client unable to check the month against their own memory; billing the paid
 * ones would be asking twice for the same money. So: full story, honest total.
 *
 * No per-firing rounding happens here. Each amount was already rounded up to
 * the studio's invoicing step when the client was first told what to pay, and
 * rounding the sum again would charge cents nobody was ever quoted.
 */
export function buildStatementHtml(d: StatementData): string {
  const rows = d.firings
    .map(
      (f) =>
        `<div class="line"><span class="what"><span class="ttl">${esc(f.title)}${
          f.paid ? `<span class="pill">${esc(t.statement.paidPill)}</span>` : ""
        }</span><span class="sub2">${esc(f.sub)}</span></span><span class="amt${
          f.paid ? " struck" : ""
        }">${esc(f.value)}</span></div>`,
    )
    .join("");

  const paidRow = d.paidTotal
    ? `<div class="line muted"><span>${esc(t.statement.alreadyPaid)}</span><span class="amt">${esc(d.paidTotal)}</span></div>`
    : "";

  const totalRow = `<div class="line strong"><span>${esc(
    d.firings.every((f) => f.paid) ? t.statement.allPaid : t.statement.total,
  )}</span><span class="amt">${esc(d.total)}</span></div>`;

  const field = (k: string, v: string): string =>
    `<div class="field"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${SHEET}
    .what { display:flex; flex-direction:column; gap:2px; }
    .ttl { font-weight: 600; }
    .sub2 { font-size: 12px; color:#666; }
    .pill { font-size: 11px; font-weight:600; color:#555; border:1px solid #cfcfcf;
      border-radius: 999px; padding: 1px 7px; margin-left: 8px; white-space: nowrap; }
    .amt.struck { color:#888; text-decoration: line-through; }
    .line.muted { color:#666; font-size: 14px; }
    .intro { font-size: 15px; margin: 0 2px 18px; line-height:1.6; }
    /* Sits between the greeting and the figures, so it is read before them.
       Quiet rather than alarming: it is a caveat on a bill, not a warning. */
    .provisional { font-size: 13px; color:#666; margin: -8px 2px 18px;
      border-left: 2px solid #cfcfcf; padding-left: 10px; line-height:1.5; }
  </style></head><body><div class="page">
    <div class="top">
      <div><h1>${esc(t.statement.heading)}</h1><div class="sub">${esc(d.studioName)}</div></div>
      ${d.logoTop ? `<img class="logo-top" src="${d.logoTop}" alt=""/>` : ""}
    </div>
    <div class="box info">
      <div>${field(t.statement.client, d.client)}</div>
      <div>${field(t.statement.month, d.month)}${field(t.statement.firingCount, String(d.firings.length))}</div>
    </div>
    <div class="intro">${esc(t.statement.intro(d.client, d.firings.length))}</div>
    ${d.provisional ? `<div class="provisional">${esc(t.statement.provisional(d.provisional))}</div>` : ""}
    <div class="box items">${rows}${paidRow}${totalRow}</div>
    <div class="thanks">${escBr(d.note || d.thanks)}</div>
    ${d.logoBottom ? `<div class="foot"><img src="${d.logoBottom}" alt=""/></div>` : ""}
  </div></body></html>`;
}
