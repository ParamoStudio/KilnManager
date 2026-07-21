# Kiln Manager

A lightweight, local-first Electron app for ceramic studios to track kiln costs,
manage firings, and issue clear client tickets. Open source. No subscriptions.
No telemetry. No bullshit.

Build a firing visually — stack shelves, split them, assign each zone to a
client — and the app splits the real cost fairly across everyone in the load,
then produces a clean ticket for each of them.

## Install

**[→ Download the latest version](https://github.com/ParamoStudio/KilnManager/releases/latest)**

| Your computer      | Download                                              |
| ------------------ | ----------------------------------------------------- |
| Mac (Apple Silicon) | `Páramo Kiln Manager-x.y.z-arm64.dmg`                |
| Mac (Intel)         | `Páramo Kiln Manager-x.y.z-x64.dmg`                  |
| Windows             | `Páramo Kiln Manager Setup x.y.z.exe`                |
| Linux               | `Páramo Kiln Manager-x.y.z.AppImage`                 |

On **Mac**, open the `.dmg` and drag the app into Applications. The first time
you open it, macOS will say it can't check the app for malicious software: this
is because the app isn't signed with a paid Apple Developer certificate, not
because anything is wrong with it. **Right-click the app → Open**, then confirm.
You only have to do this once. (If macOS refuses outright, run
`xattr -dr com.apple.quarantine "/Applications/Páramo Kiln Manager.app"`.)

On **Windows**, SmartScreen will warn for the same reason: *More info → Run
anyway*.

### Or run it from source

If you'd rather build it yourself (or you're on a platform without a build):

```bash
git clone https://github.com/ParamoStudio/KilnManager.git
cd KilnManager
npm install
npm run package   # builds an installable app for your platform into release/
```

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
