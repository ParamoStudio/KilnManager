# Kiln Cost Manager · integration handoff

For whoever is wiring this into **Páramo Ceramic Lab**.

This is the free web build of [Kiln Manager](https://github.com/ParamoStudio/KilnManager),
a desktop app that prices ceramic firings. It is not a demo or a mock-up: it is
the real application with the parts that need a real computer removed, so the
numbers it produces are the numbers the app produces.

Both are AGPL and free. The web build exists so the tool can be *used*, not just
advertised, and so the site doesn't carry a second, diverging copy of it.

---

## 1. What you receive

```
out/lab/
  index.html
  assets/
    index-*.css          82 KB   (12 KB gzipped)
    index-*.js          261 KB   (86 KB gzipped)
    …several *.js        780 KB   loaded ONLY when a user exports a firing
```

- **Static.** No server, no API, no build step on your side.
- **Relative paths** (`base: "./"`). Drop the folder anywhere — `/tools/kiln/`,
  `/kiln-cost-manager/`, the site root — and it works. No rewrite rules.
- **Single page, no router.** It never changes the URL, so it can't 404 on
  refresh and needs no SPA fallback.
- **No network requests.** Not on load, not ever. The only outbound thing in the
  whole build is a link to the app's release page, opened when the user clicks
  it. Safe under a strict CSP; no `connect-src` needed.
- **No webfonts, no external assets.** System font stack only.

Rebuild from source at any time with `npm run build:lab`.

---

## 2. Dropping it in

The simplest integration is a page that serves `index.html` as-is. If your
tool pages have a shell (header, "Return to tools"), two options:

**A · Full page, your chrome around it.** Copy the contents of `index.html`'s
`<body>` into your page and include the two asset files. The app mounts into
`<div id="app">` and takes the space it's given. It expects a wide viewport —
it is a desktop-shaped tool with a three-column firing view. Below ~900 px it
still renders but gets cramped; if your site needs a mobile story here, the
honest one is a line saying this tool wants a bigger screen.

**B · Iframe.** Zero integration risk, keeps styles isolated. You lose the
ability to restyle it from the host page (see §3), so only do this if you're
keeping the default dark theme.

### The "Return to tools" affordance

The app has no back button of its own — on the desktop it *is* the window. Your
shell should provide one, exactly like the floating pill on the other tools.
Nothing in the app fights a fixed-position element; it uses no `position:
fixed` chrome of its own except modals, which sit at `z-index: 60–61`. Keep
your pill above that if it must stay visible over a dialog.

---

## 3. Restyling it

**All colour lives in `:root` custom properties in one stylesheet.** There are
no meaningful hard-coded colours in the components. Include
[`lab-theme.css`](lab-theme.css) after the app's stylesheet and edit the values
there — it's commented variable by variable and ships as a monochrome starting
point close to the Lab's palette.

One thing to read before going fully black and white: **inside the kiln, clients
are identified by colour.** That palette is a 12-entry array in
`src/renderer/src/lib/colors.ts`, not a CSS variable, because it is assigned per
client in order of appearance. It's information, not decoration — with five
people in a load it's the only thing making the drawing legible. The
recommendation is a monochrome interface with the kiln keeping desaturated
colour. `lab-theme.css` explains the alternative if you disagree.

---

## 4. Storage — the one thing that can bite you

The tool keeps everything in `localStorage`, under keys prefixed **`kiln:`**
(`kiln:kilns`, `kiln:settings`, `kiln:PendingFirings`, `kiln:FiringsLog`,
`kiln:locale`, …).

- **Namespace collisions.** Every tool on the site shares one origin, so every
  tool shares one `localStorage`. Keep the `kiln:` prefix out of anything else.
  If another tool ever calls `localStorage.clear()`, it wipes this one's data
  too — worth checking across the site.
- **It can vanish.** Cleared browser data, private windows, iOS storage
  pressure. The tool is designed around that rather than against it: hard caps
  keep anyone from building something they'd mourn, and finished work leaves as
  a downloaded file. Don't add a "your data is safe here" reassurance anywhere —
  it isn't, and the design is honest about it.

---

## 5. What it does, and where it stops

**It does:** define a kiln in full detail (shape, dimensions, usable height,
shelf thickness, post heights, services and prices, cost items, price
modifiers, partner splits); build a firing visually by stacking shelves and
splitting them; assign clients to each zone with a complexity factor; and split
the cost fairly across everyone in the load by KLU (the app's "kiln litre unit"
— effective volume × complexity). It produces a per-client invoice and the
firing's internal accounting.

**Limits, all deliberate:**

| | Lab | App |
|---|---|---|
| Kilns | 1 | unlimited |
| Firings at once | 2 | unlimited |
| Closed firings kept | 5 | unlimited |
| Clients | typed per firing, not stored | a client book you own |
| Output | zip: invoices + spreadsheet, per firing | PDFs to disk, running workbook |
| Fuel prices | manual | manual + live market reference |
| Phone loading | — | load the kiln from your phone |
| Where data lives | this browser | a folder you choose |

Nothing is removed to force a download. Every limit has a reason a user can
read, and each one is explained in the app at the moment it's reached, with the
tone "here's what the app does" rather than "you can't".

**Reaching the log limit never destroys anything silently.** Closing a sixth
firing asks whether to export the oldest or discard it, and refuses to proceed
until the user chooses.

---

## 6. The export

Finishing a firing offers **Download this firing**: a zip containing one PDF
invoice per paying client, named `Client_50eur_2026-07-22.pdf`, plus an `.xlsx`
with the firing's figures (clients, share, charged, costs, partner cuts, net).

Worth knowing:

- The invoices are the same template the desktop app prints, **rasterised** at
  ~192 dpi. Text in the PDF is an image: not selectable, ~100 KB per page. That
  is a deliberate trade — it guarantees the PDF matches the preview exactly,
  where redrawing the layout in PDF primitives would mean maintaining the
  invoice twice and watching the two drift.
- The export machinery (~780 KB) is **dynamically imported**. A visitor who
  never exports never downloads it.
- The download is a blob + `<a download>`. If you embed in an iframe, give it
  `allow-downloads` in the sandbox attribute, or downloads will fail silently.

---

## 7. Pointing at the app

There is one permanent, quiet link in the header — *Get the app →* — and each
limit dialog offers the same. It points at
`https://github.com/ParamoStudio/KilnManager/releases/latest`.

If you'd rather it point at a page on the Lab site, it's one constant:
`APP_URL` in `src/renderer/src/lib/lab.ts`.

That's the whole of the advertising. Please don't add more — the tool earns the
download by being useful, and the site already says who made it.

---

## 8. Keeping it current

The lab build is generated from the same source as the desktop app, so it picks
up fixes automatically. When a new version ships, you'll get a fresh `out/lab/`
to replace the old one. Nothing else changes: same mount point, same storage
keys, same theme variables. If you've kept your theme override in a separate
file as recommended, an update is a straight folder swap.

Do **not** patch the copy you receive. If something needs changing — a label, a
limit, a colour that isn't reachable from the theme file — say so and it gets
changed at the source, so the next update doesn't undo it.

---

## 9. If something looks wrong

The parts most likely to surprise you, and what they mean:

| What you see | What it is |
|---|---|
| A tab called *Client Book* that opens an explanation instead of a list | Deliberate. It advertises a real app feature and says why it isn't here. |
| *Expenses* showing thin, near-empty months | It's a monthly view over at most five firings. It's real, just small. |
| The fuel panel with no live market prices | Those sources can't be read from a browser (no CORS). Manual prices work. |
| Prices ending in .50 | The app rounds a client's total up to the nearest 50 cents by design. |
| A firing showing less than 100% occupancy | Correct — the kiln is only as full as the shelves put in it. |
