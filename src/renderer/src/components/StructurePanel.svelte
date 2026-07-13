<script lang="ts">
  import type { FiringResult } from "@core";
  import {
    planner,
    ui,
    currentKiln,
    setKiln,
    setService,
    toggleModifier,
    addLevel,
    removeLevel,
    setDivision,
    setSupportHeight,
    remainingCm,
  } from "../lib/firing.svelte";
  import { demoKilns } from "../lib/kilns";
  import { eur } from "../lib/format";
  import PriceSummary from "./PriceSummary.svelte";

  let { result }: { result: FiringResult } = $props();

  const kiln = $derived(currentKiln());
  const selected = $derived(planner.levels.find((l) => l.id === ui.selectedShelfId) ?? null);
  const splits = [
    { n: 1, label: "Full" },
    { n: 2, label: "½" },
    { n: 3, label: "⅓" },
    { n: 4, label: "¼" },
  ];
</script>

<div class="panel-body">
  <!-- Kiln + service -->
  <div class="block">
    <span class="label">Kiln profile</span>
    <select value={planner.kilnId} onchange={(e) => setKiln(e.currentTarget.value)}>
      {#each demoKilns as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
    </select>
    <span class="faint sub">
      {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm}×${kiln.depthCm} cm`}
      · {kiln.usableHeightCm} cm high
    </span>
  </div>

  <div class="block">
    <span class="label">Firing service</span>
    <select value={planner.serviceId} onchange={(e) => setService(e.currentTarget.value)}>
      {#each kiln.services as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
    </select>
  </div>

  <div class="block">
    <span class="label">Modifiers</span>
    {#each planner.modifiers as m (m.id)}
      <label class="mod">
        <input type="checkbox" checked={m.on} onchange={() => toggleModifier(m.id)} />
        <span>{m.label}</span>
        <span class="amt" class:neg={m.amount < 0}>{m.amount < 0 ? "−" : "+"}{eur(Math.abs(m.amount))}</span>
      </label>
    {/each}
  </div>

  <PriceSummary {result} />

  <!-- Structure setup -->
  <div class="block setup">
    <span class="label">Structure setup</span>
    <button class="add" onclick={addLevel} disabled={remainingCm() < 3}>+ Add shelf / level</button>

    {#if selected}
      <div class="edit">
        <div class="edit-head">
          <span class="faint">Shelf height</span>
          <button class="rm" onclick={() => removeLevel(selected.id)}>Remove</button>
        </div>
        <div class="presets">
          {#each kiln.standardPostHeightsCm as p (p)}
            <button class="chip" class:active={Math.round(selected.supportHeightCm) === p} onclick={() => setSupportHeight(selected.id, p)}>{p}</button>
          {/each}
        </div>
        <input
          class="slider"
          type="range"
          min="2"
          max={kiln.usableHeightCm}
          step="0.5"
          value={selected.supportHeightCm}
          oninput={(e) => setSupportHeight(selected.id, +e.currentTarget.value)}
        />
        <div class="faint drag-hint">{Math.round(selected.supportHeightCm + selected.shelfThicknessCm)} cm total · drag to adjust</div>

        <span class="faint sub2">Split shelf</span>
        <div class="splits">
          {#each splits as s (s.n)}
            <button class="split" class:active={selected.division === s.n} onclick={() => setDivision(selected.id, s.n)}>{s.label}</button>
          {/each}
        </div>
      </div>
    {:else}
      <p class="faint hint">Select a shelf in the kiln to set its height and split, or add one.</p>
    {/if}
  </div>

  <button class="primary next" onclick={() => (ui.mode = "assign")} disabled={planner.levels.length === 0}>
    Assign clients →
  </button>
</div>

<style>
  .panel-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  select {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
  }
  .sub {
    font-size: 11px;
  }
  .mod {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    padding: 3px 0;
  }
  .mod input {
    accent-color: var(--accent);
  }
  .amt {
    margin-left: auto;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .amt.neg {
    color: var(--green);
  }
  .setup {
    margin-top: auto;
  }
  .add {
    background: var(--panel-2);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--line));
    border-radius: 8px;
    padding: 9px;
    color: var(--text);
    font-size: 13px;
  }
  .add:disabled {
    opacity: 0.4;
  }
  .edit {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .edit-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  .rm {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 12px;
  }
  .rm:hover {
    color: #e88;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .chip {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 5px 9px;
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .chip.active {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .slider {
    width: 100%;
    accent-color: var(--accent);
  }
  .drag-hint {
    font-size: 11px;
  }
  .sub2 {
    font-size: 11px;
    margin-top: 4px;
  }
  .splits {
    display: flex;
    gap: 5px;
  }
  .split {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 8px 0;
    color: var(--text-dim);
    font-size: 13px;
  }
  .split.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .hint {
    font-size: 12px;
    line-height: 1.5;
    margin: 8px 0 0;
  }
  .primary {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 9px;
    padding: 11px;
    font-weight: 600;
    font-size: 13px;
  }
  .primary:disabled {
    opacity: 0.4;
  }
</style>
