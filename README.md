# Kiln Manager

Internal studio tool for the Páramo ecosystem. Visual kiln load planner + fair
cost distribution + transparent internal accounting. Local-first, offline, no
telemetry. See `../Docs/` for the full guidelines, the calculation core spec and
the phased plan.

## Status

**T1 — Electron shell + persistence + navigation.** The app runs; engine is
wired into the UI. Visual builder arrives in T2.

## Run

```bash
cd KilnManager
npm install

npm run dev        # launch the Electron desktop app (dev)
npm run dev:web    # OR run the frontend in a plain browser (localhost:5173)
npm run build      # build the Electron app
npm run build:web  # build the plain-web version (future Páramo web)

npm test           # engine test suite (25 tests)
npm run typecheck  # Node + Svelte type check
```

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
src/renderer/   Svelte 5 frontend (App shell, routes, storage adapter)
tests/          Vitest suite, including the agreed worked example
```
