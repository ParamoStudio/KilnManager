# Kiln Manager

Internal studio tool for the Páramo ecosystem. Visual kiln load planner + fair
cost distribution + transparent internal accounting. Local-first, offline, no
telemetry. See `../Docs/` for the full guidelines, the calculation core spec and
the phased plan.

## Status

**T0 — calculation core + accounting.** Pure TypeScript engine, no UI yet.

## Run the tests

```bash
cd KilnManager
npm install
npm test          # run the engine test suite once
npm run test:watch
npm run typecheck  # TypeScript, no emit
```

## Layout

```
src/core/     Pure calculation engine (framework- and storage-agnostic)
  types.ts        Domain model
  geometry.ts     Kiln footprint / volume / consumed height
  engine.ts       KLU, client split, accounting
  rounding.ts     Cent-exact money splitting
  validation.ts   Layout checks (overfilled shelf, overstacked kiln…)
tests/        Vitest suite, including the agreed worked example
```
