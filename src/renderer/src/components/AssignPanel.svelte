<script lang="ts">
  import type { FiringResult } from "@core";
  import {
    ui,
    contacts,
    setActiveClient,
    setActiveComplexity,
    zoneCountForClient,
    clearClient,
    clientNames,
  } from "../lib/firing.svelte";
  import { COMPLEXITY, complexityKeys } from "../lib/complexity";
  import { colorForName } from "../lib/colors";
  import { eur, pct, num } from "../lib/format";
  import PriceSummary from "./PriceSummary.svelte";

  let { result }: { result: FiringResult } = $props();

  let newName = $state("");
  const names = $derived(clientNames());
  const active = $derived(ui.activeClient);
  const zoneCount = $derived(active ? zoneCountForClient(active) : 0);
  const review = $derived(active ? result.clients.find((c) => c.contactName === active) : undefined);
  // Everyone you can pick: clients already in this firing + saved contacts.
  const pickable = $derived(Array.from(new Set([...names, ...contacts.names])));

  function startNew(): void {
    const n = newName.trim();
    if (!n) return;
    setActiveClient(n);
    newName = "";
  }
</script>

<div class="panel-body">
  {#if !active}
    <div class="block">
      <span class="label">Assign — pick a client</span>
      <p class="faint hint">Select who occupies zones in the kiln, then paint their zones.</p>

      {#if pickable.length}
        <div class="clients">
          {#each pickable as name (name)}
            <button class="client-row" onclick={() => setActiveClient(name)}>
              <span class="dot" style="--z: {colorForName(name, names)}"></span>
              <span class="cname">{name}</span>
              {#if zoneCountForClient(name) > 0}
                <span class="faint tag">{zoneCountForClient(name)} zones</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}

      <div class="new">
        <input bind:value={newName} placeholder="New client name" onkeydown={(e) => e.key === "Enter" && startNew()} />
        <button class="mini" onclick={startNew} disabled={!newName.trim()}>Add</button>
      </div>
    </div>
  {:else}
    <div class="assigning">
      <div class="who">
        <span class="dot big" style="--z: {colorForName(active, names)}"></span>
        <div>
          <span class="label">Assigning</span>
          <div class="who-name">{active}</div>
        </div>
        <button class="mini ghost" onclick={() => setActiveClient(null)}>Change</button>
      </div>

      <div class="step">
        <span class="step-n">1</span>
        <div class="step-body">
          <span class="step-t">Select occupied zones</span>
          <span class="faint">{zoneCount} zone{zoneCount === 1 ? "" : "s"} — click zones in the kiln</span>
        </div>
      </div>

      <div class="step">
        <span class="step-n">2</span>
        <div class="step-body">
          <div class="cx-head">
            <span class="step-t">Complexity</span>
            <label class="same">
              <input type="checkbox" checked={ui.sameComplexity} onchange={() => (ui.sameComplexity = !ui.sameComplexity)} />
              same for all
            </label>
          </div>
          <div class="cx">
            {#each complexityKeys as key (key)}
              <button class="cx-btn" class:active={ui.activeComplexity === key} onclick={() => setActiveComplexity(key)}>
                {COMPLEXITY[key].label}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="step">
        <span class="step-n">3</span>
        <div class="step-body">
          <span class="step-t">Review</span>
          <div class="review">
            <div class="rrow"><span class="muted">Share</span><span>{review ? pct(review.sharePct) : "—"}</span></div>
            <div class="rrow"><span class="muted">Price</span><span class="price">{review ? eur(review.price) : "—"}</span></div>
            <div class="rrow small"><span class="faint">Load units</span><span class="faint">{review ? num(review.klu) : "—"}</span></div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="ghost-btn" onclick={() => clearClient(active)} disabled={zoneCount === 0}>Clear</button>
        <button class="primary" onclick={() => setActiveClient(null)}>Done · next client →</button>
      </div>
    </div>
  {/if}

  <div class="foot">
    <PriceSummary {result} />
    <button class="back" onclick={() => (ui.mode = "structure")}>← Back to structure</button>
  </div>
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
    gap: 8px;
  }
  .hint {
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .clients {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 240px;
    overflow-y: auto;
  }
  .client-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font-size: 13px;
    text-align: left;
  }
  .client-row:hover {
    border-color: var(--text-faint);
  }
  .cname {
    flex: 1;
  }
  .tag {
    font-size: 11px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--z, var(--text-faint));
    flex-shrink: 0;
  }
  .dot.big {
    width: 12px;
    height: 12px;
  }
  .new {
    display: flex;
    gap: 6px;
  }
  .new input {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
  }
  .mini {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
  }
  .mini.ghost {
    background: var(--panel-2);
    color: var(--text-dim);
    border: 1px solid var(--line);
    margin-left: auto;
    font-weight: 400;
  }
  .mini:disabled {
    opacity: 0.4;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .who-name {
    font-size: 17px;
    font-weight: 600;
  }
  .step {
    display: flex;
    gap: 11px;
  }
  .step-n {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text-faint);
    flex-shrink: 0;
  }
  .step-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .step-t {
    font-size: 13px;
    font-weight: 500;
  }
  .cx-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .same {
    font-size: 11px;
    color: var(--text-faint);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .same input {
    accent-color: var(--accent);
  }
  .cx {
    display: flex;
    gap: 5px;
  }
  .cx-btn {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 8px 0;
    color: var(--text-dim);
    font-size: 12px;
  }
  .cx-btn.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .review {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .rrow {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .rrow .price {
    font-weight: 600;
  }
  .rrow.small {
    font-size: 11px;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .ghost-btn {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .ghost-btn:disabled {
    opacity: 0.4;
  }
  .primary {
    flex: 1;
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-weight: 600;
    font-size: 13px;
  }
  .foot {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .back {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 12px;
    text-align: left;
    padding: 0;
  }
  .back:hover {
    color: var(--text-dim);
  }
</style>
