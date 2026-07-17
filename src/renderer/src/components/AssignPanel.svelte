<script lang="ts">
  import {
    ui,
    planner,
    contacts,
    selectionOwners,
    assignSelectionTo,
    assignSelectionToSelf,
    reassignTo,
    setZoneComplexity,
    applyComplexityToSelection,
    clearSelectedZones,
    clearPrimaryZone,
    recentContacts,
    newClientForAssign,
    clientNote,
    setClientNote,
    clientNames,
    zoneLabel,
    setHoverZone,
    modsForClient,
    removeClientMod,
    modSign,
    type ZoneRef,
  } from "../lib/firing.svelte";
  import { complexityKeys, type ComplexityKey } from "../lib/complexity";
  import { cx } from "../lib/settings.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur } from "../lib/format";

  const count = $derived(ui.selection.length);
  const owners = $derived(selectionOwners());
  const owner = $derived(owners.length === 1 ? owners[0]! : null); // client-edit mode

  let query = $state("");
  let reassignOpen = $state(false);
  let pending = $state<string | null>(null);

  const results = $derived(
    query.trim()
      ? contacts.list.filter((c) => `${c.name} ${c.surname ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
      : recentContacts(4),
  );

  const segOf = (z: ZoneRef): { contactName: string; complexity: ComplexityKey } | null =>
    planner.levels.find((l) => l.id === z.levelId)?.segments[z.segIdx] ?? null;

  const primaryLabel = $derived(
    ui.primaryZone ? zoneLabel(ui.primaryZone.levelId, ui.primaryZone.segIdx) : "",
  );
  const note = $derived(owner ? clientNote(owner) : "");

  // Signature of WHICH zones are selected (not their complexity/notes) — so
  // editing complexity or notes never collapses the reassign panel.
  const selKey = $derived(
    ui.selection
      .map((z) => `${z.levelId}:${z.segIdx}`)
      .sort()
      .join(","),
  );
  $effect(() => {
    void selKey;
    reassignOpen = false;
    pending = null;
    query = "";
  });
</script>

<div class="rail">
  <span class="rail-title">Assign</span>

  {#if count === 0}
    <p class="faint hint">Click shelves in the kiln to select them. Click a client's shelf to edit all of theirs.</p>

  {:else if owner}
    <!-- Client-edit mode -->
    <div class="pill">
      <span class="dot" style="--z:{colorForIndex(clientNames().indexOf(owner))}"></span>
      <span class="pn">{owner}</span>
      <span class="faint">{count} {count === 1 ? "shelf" : "shelves"}</span>
    </div>

    <!-- Reassign — now directly under the client name -->
    <div class="block">
      {#if !reassignOpen}
        <button class="collapsed" onclick={() => (reassignOpen = true)}>Assign to another client ▾</button>
      {:else}
        <button class="collapsed open" onclick={() => { reassignOpen = false; pending = null; }}>
          Assign to another client ▴
        </button>
        {#if pending}
          <div class="choice">
            <span class="move-h">Move to {pending}</span>
            <button class="mini" onclick={() => reassignTo(pending!, "primary")}>Only selected {primaryLabel}</button>
            <button class="mini" onclick={() => reassignTo(pending!, "all")}>Move all of {owner} to {pending}</button>
            <button class="backpill" onclick={() => (pending = null)}>← back</button>
          </div>
        {:else}
          <input class="search" bind:value={query} placeholder="Search clients…" />
          <div class="results">
            {#each results as c (c.id)}
              {#if c.name !== owner}
                <button class="client" onclick={() => (pending = c.name)}>
                  <span class="dot" style="--z:{colorForIndex(clientNames().indexOf(c.name))}"></span>
                  <span class="cn">{c.name}{c.surname ? ` ${c.surname}` : ""}</span>
                </button>
              {/if}
            {/each}
          </div>
          <button class="new" onclick={newClientForAssign}>+ New client</button>
          <button class="self" onclick={assignSelectionToSelf}>Assign to myself</button>
        {/if}
      {/if}
    </div>

    <div class="block">
      <span class="label">Complexity per zone</span>
      <div class="boxes">
        {#each ui.selection as z (z.levelId + ":" + z.segIdx)}
          {@const s = segOf(z)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="boxrow"
            role="group"
            onmouseenter={() => setHoverZone(z)}
            onmouseleave={() => setHoverZone(null)}
          >
            <span class="bid">{zoneLabel(z.levelId, z.segIdx)}</span>
            <div class="cx">
              {#each complexityKeys as key (key)}
                <button
                  class="cx-btn"
                  class:active={s?.complexity === key}
                  onclick={() => setZoneComplexity(z.levelId, z.segIdx, key)}
                >
                  <span class="cxl">{cx(key).label[0]}</span>
                  <span class="cxf">×{cx(key).factor.toFixed(2)}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    {#if modsForClient(owner).length > 0}
      <div class="block">
        <span class="label">Modifiers · {owner}</span>
        <div class="cmods">
          {#each modsForClient(owner) as m (m.id)}
            <div class="cmrow">
              <span class="cmname">{m.name}</span>
              <span class="cmval" class:disc={modSign(m) < 0}>{modSign(m) > 0 ? "+" : "−"}{m.mode === "percent" ? `${m.value}%` : eur(m.value)}</span>
              <button class="cmx" onclick={() => removeClientMod(owner, m.id)} aria-label="Remove modifier">×</button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="block">
      <span class="label">Note · {owner}</span>
      <textarea
        class="note"
        maxlength="240"
        rows="2"
        placeholder="Optional note for this firing"
        value={note}
        oninput={(e) => setClientNote(owner!, e.currentTarget.value)}
      ></textarea>
    </div>

    <div class="actions col">
      <button class="ghost danger" onclick={clearPrimaryZone} disabled={!ui.primaryZone}>
        Empty selection ({primaryLabel})
      </button>
      <button class="ghost danger" onclick={clearSelectedZones}>Empty all of {owner}</button>
    </div>

  {:else}
    <!-- Free shelves → assign directly -->
    <div class="sel"><span class="sel-n">{count} {count === 1 ? "shelf" : "shelves"} selected</span><span class="faint">Currently free</span></div>

    <div class="block">
      <span class="label">Complexity</span>
      <div class="cx wide">
        {#each complexityKeys as key (key)}
          <button class="cx-btn" class:active={ui.complexity === key} onclick={() => applyComplexityToSelection(key)}>
            {cx(key).label}<span class="f">×{cx(key).factor.toFixed(2)}</span>
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
        {#if results.length === 0}<p class="faint none">No match.</p>{/if}
      </div>
      <button class="new" onclick={newClientForAssign}>+ New client</button>
      <button class="self" onclick={assignSelectionToSelf}>Assign to myself</button>
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
  .pill {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 9px;
  }
  .pn {
    font-size: 15px;
    font-weight: 600;
  }
  .pill .faint {
    margin-left: auto;
    font-size: 11px;
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
  .boxes {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-height: 200px;
    overflow-y: auto;
  }
  .boxrow {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border-radius: 7px;
    border-bottom: 1px solid var(--line-soft);
  }
  .boxrow:last-child {
    border-bottom: none;
  }
  .boxrow:hover {
    background: var(--panel-2);
  }
  .bid {
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    width: 40px;
    flex-shrink: 0;
  }
  .cx {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .cx-btn {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 6px;
    padding: 6px 0;
    color: var(--text-dim);
    font-size: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .cx-btn.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .cxl {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .cx-btn:not(.active) .cxl {
    color: var(--text-dim);
  }
  .cxf {
    font-size: 9px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .cx.wide .cx-btn {
    display: flex;
    flex-direction: column;
    gap: 1px;
    align-items: center;
    padding: 7px 2px;
  }
  .f {
    font-size: 9px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
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
  .cmods {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .cmrow {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 7px 10px;
  }
  .cmname {
    flex: 1;
    font-size: 13px;
    min-width: 0;
  }
  .cmval {
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .cmval.disc {
    color: var(--green);
  }
  .cmx {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 16px;
    padding: 0 2px;
  }
  .cmx:hover {
    color: #e88;
  }
  .collapsed {
    background: none;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .collapsed:hover,
  .collapsed.open {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .choice {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .move-h {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .mini {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-size: 13px;
    font-weight: 600;
  }
  .backpill {
    align-self: center;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--text-dim);
    font-size: 12px;
    padding: 7px 18px;
    margin-top: 2px;
  }
  .backpill:hover {
    color: var(--text);
    border-color: var(--text-faint);
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
    max-height: 150px;
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
    margin: 0;
    padding: 2px;
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
  .self {
    background: none;
    border: 1px solid color-mix(in srgb, var(--amber) 40%, var(--line));
    border-radius: 8px;
    padding: 8px;
    color: var(--text-dim);
    font-size: 12px;
    margin-top: 2px;
  }
  .self:hover {
    color: var(--text);
    border-color: var(--amber);
  }
  .actions {
    display: flex;
    margin-top: auto;
  }
  .actions.col {
    flex-direction: column;
    gap: 7px;
  }
  .ghost:disabled {
    opacity: 0.4;
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
  .ghost.danger {
    border-color: color-mix(in srgb, var(--amber) 40%, var(--line));
  }
  .ghost.danger:hover {
    color: var(--amber);
    border-color: var(--amber);
    box-shadow: 0 0 8px color-mix(in srgb, var(--amber) 30%, transparent);
  }
</style>
