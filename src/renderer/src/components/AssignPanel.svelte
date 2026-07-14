<script lang="ts">
  import {
    ui,
    contacts,
    selectionOwners,
    assignSelectionTo,
    applyComplexityToSelection,
    clearSelectedZones,
    clearSelection,
    recentContacts,
    newClientForAssign,
    clientNote,
    setClientNote,
    clientNames,
  } from "../lib/firing.svelte";
  import { COMPLEXITY, complexityKeys } from "../lib/complexity";
  import { colorForIndex } from "../lib/colors";

  const count = $derived(ui.selection.length);
  const owners = $derived(selectionOwners());
  const singleOwner = $derived(owners.length === 1 ? owners[0]! : null);

  let query = $state("");
  const results = $derived(
    query.trim()
      ? contacts.list.filter((c) =>
          `${c.name} ${c.surname ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : recentContacts(4),
  );

  const note = $derived(singleOwner ? clientNote(singleOwner) : "");
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
            {COMPLEXITY[key].label}<span class="f">×{COMPLEXITY[key].factor.toFixed(2)}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="block">
      <span class="label">Assign to</span>
      <input class="search" bind:value={query} placeholder="Search clients…" />
      <div class="results">
        {#each results as c (c.id)}
          <button class="client" onclick={() => assignSelectionTo(c.name)}>
            <span class="dot" style="--z:{colorForIndex(clientNames().indexOf(c.name))}"></span>
            <span class="cn">{c.name}{c.surname ? ` ${c.surname}` : ""}</span>
          </button>
        {/each}
        {#if results.length === 0}
          <p class="faint none">No match.</p>
        {/if}
      </div>
      <button class="new" onclick={newClientForAssign}>+ New client</button>
    </div>

    {#if singleOwner}
      <div class="block">
        <span class="label">Note · {singleOwner}</span>
        <textarea
          class="note"
          maxlength="240"
          rows="2"
          placeholder="Optional note for this firing"
          value={note}
          oninput={(e) => setClientNote(singleOwner, e.currentTarget.value)}
        ></textarea>
      </div>
    {/if}

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
  .search {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 11px;
    color: var(--text);
    font: inherit;
  }
  .search:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .results {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 168px;
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
  .none {
    font-size: 12px;
    padding: 4px 2px;
    margin: 0;
  }
  .new {
    background: none;
    border: 1px dashed color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 8px;
    color: var(--text);
    font-size: 13px;
  }
  .new:hover {
    border-color: var(--accent);
  }
  .note {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 11px;
    color: var(--text);
    font: inherit;
    resize: none;
  }
  .note:focus {
    outline: none;
    border-color: var(--text-faint);
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
