<script lang="ts">
  import {
    ui,
    contacts,
    clientNames,
    selectionOwners,
    assignSelectionTo,
    applyComplexityToSelection,
    clearSelectedZones,
    clearSelection,
  } from "../lib/firing.svelte";
  import { COMPLEXITY, complexityKeys } from "../lib/complexity";
  import { colorForName } from "../lib/colors";

  const names = $derived(clientNames());
  const pickable = $derived(Array.from(new Set([...names, ...contacts.list.map((c) => c.name)])));
  const count = $derived(ui.selection.length);
  const owners = $derived(selectionOwners());

  let newName = $state("");
  function addNew(): void {
    const n = newName.trim();
    if (!n) return;
    assignSelectionTo(n);
    newName = "";
  }
</script>

<div class="rail">
  <span class="rail-title">Assign</span>

  {#if count === 0}
    <p class="faint hint">Click zones in the kiln to select them (click several for one client), then choose who they belong to.</p>
  {:else}
    <div class="sel">
      <span class="sel-n">{count} zone{count === 1 ? "" : "s"} selected</span>
      {#if owners.length}
        <span class="faint">Currently: {owners.join(", ")}</span>
      {:else}
        <span class="faint">Currently free</span>
      {/if}
    </div>

    <div class="block">
      <span class="label">Complexity</span>
      <div class="cx">
        {#each complexityKeys as key (key)}
          <button class="cx-btn" class:active={ui.complexity === key} onclick={() => applyComplexityToSelection(key)}>
            {COMPLEXITY[key].label}
            <span class="f">×{COMPLEXITY[key].factor.toFixed(2)}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="block">
      <span class="label">Assign to</span>
      <div class="clients">
        {#each pickable as name (name)}
          <button class="client" onclick={() => assignSelectionTo(name)}>
            <span class="dot" style="--z:{colorForName(name, names)}"></span>
            <span class="cn">{name}</span>
          </button>
        {/each}
      </div>
      <div class="new">
        <input bind:value={newName} placeholder="New client" onkeydown={(e) => e.key === "Enter" && addNew()} />
        <button class="mini" onclick={addNew} disabled={!newName.trim()}>Assign</button>
      </div>
    </div>

    <div class="actions">
      <button class="ghost" onclick={clearSelection}>Deselect</button>
      <button class="ghost danger" onclick={clearSelectedZones}>Empty zones</button>
    </div>
  {/if}
</div>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
  }
  .rail-title {
    font-size: 13px;
    font-weight: 600;
  }
  .hint {
    font-size: 12px;
    line-height: 1.55;
    margin: 0;
  }
  .sel {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 9px;
  }
  .sel-n {
    font-size: 13px;
    font-weight: 500;
  }
  .sel .faint {
    font-size: 11px;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 7px;
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
    padding: 7px 2px;
    color: var(--text-dim);
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    align-items: center;
  }
  .cx-btn.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .f {
    font-size: 9px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .clients {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 200px;
    overflow-y: auto;
  }
  .client {
    display: flex;
    align-items: center;
    gap: 9px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 8px 11px;
    color: var(--text);
    font-size: 13px;
    text-align: left;
  }
  .client:hover {
    border-color: var(--text-faint);
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--z, var(--text-faint));
    flex-shrink: 0;
  }
  .cn {
    flex: 1;
  }
  .new {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }
  .new input {
    flex: 1;
    min-width: 0;
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
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
  }
  .mini:disabled {
    opacity: 0.4;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
  }
  .ghost {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px;
    color: var(--text-dim);
    font-size: 12px;
  }
  .ghost.danger:hover {
    color: #e88;
    border-color: #e88;
  }
</style>
