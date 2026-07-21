# Kiln Manager

A lightweight, local-first Electron app for ceramic studios to track kiln costs,
manage firings, and issue clear client tickets. Open source. No subscriptions.
No telemetry. No bullshit.

Build a firing visually — stack shelves, split them, assign each zone to a
client — and the app splits the real cost fairly across everyone in the load,
then produces a clean ticket for each of them.

## Load a kiln from your phone

Loading a kiln means standing at the kiln, not at a computer. The companion
**Kiln Loader** is an installable web app for the phone: build the firing on the
shelves as you load them, then sync it to the computer to finish pricing and
invoicing there.

- Works **offline** once installed — the studio's Wi-Fi doesn't have to reach.
- Pairs by scanning a QR from the desktop app. No accounts, ever.
- The phone never sees or computes prices; it only records structure.

## Layout

```
src/core/       Pure calculation engine (framework- and storage-agnostic)
  types.ts        Domain model
  geometry.ts     Kiln footprint / volume / consumed height
  engine.ts       KLU, client split, accounting
  rounding.ts     Cent-exact money splitting
  validation.ts   Layout checks (overfilled shelf, overstacked kiln…)
src/main/       Electron main process (window + local JSON storage)
src/preload/    Safe bridge exposed to the renderer (window.kilnAPI)
src/renderer/   Svelte 5 desktop frontend
mobile/         The phone loader (PWA, published to GitHub Pages)
relay/          Tiny Cloudflare Worker that passes data between the two
tests/          Vitest suite, including the agreed worked example
```

The relay is a dumb, token-keyed mailbox: it holds client first names and firing
structure (**never prices, never payment data**), and everything self-expires
after 7 days. Páramo runs one for everybody, so there's nothing to set up — and
because it's open source, you can host your own by changing `RELAY_BASE` in
`src/renderer/src/lib/syncconfig.ts` and deploying `relay/worker.js`.

## Run

```bash
npm install

npm run dev          # launch the Electron desktop app (dev)
npm run dev:web      # OR run the desktop frontend in a plain browser
npm run dev:mobile   # the phone loader, for testing in a browser
npm run build        # build the Electron app
npm run build:mobile # build the phone loader

npm test             # engine test suite
npm run typecheck    # Node + Svelte type check
```

## Your data

Everything lives in a folder you choose and own — plain JSON, readable and
backup-able. Nothing is uploaded anywhere except what you explicitly sync to
your own phone.
