<script lang="ts">
  /**
   * The assignment sheet — a touch port of the desktop AssignPanel. It reads the
   * live zone selection and renders one of two modes, exactly like the desktop
   * rail: free zones → assign to a client; one client's zones → edit them.
   */
  import {
    draft,
    sel,
    synced,
    selectionOwners,
    assignSelectionTo,
    assignSelectionToSelf,
    applyComplexityToSelection,
    setZoneComplexity,
    clearSelectedZones,
    clearPrimaryZone,
    reassignTo,
    segmentAt,
    zoneLabel,
    clientNames,
    clientNote,
    setClientNote,
    complexityFactor,
    complexityKeys,
    MYSELF,
    type ComplexityKey,
  } from "../lib/loader.svelte";
  import { t } from "../lib/i18n.svelte";
  import { colorForIndex } from "../lib/colors";
  import { fly, fade } from "svelte/transition";

  let { onclose }: { onclose: () => void } = $props();

  const count = $derived(sel.selection.length);
  const owners = $derived(selectionOwners());
  const owner = $derived(owners.length === 1 ? owners[0]! : null);

  let query = $state("");
  let showHelp = $state(false);
  let reassignOpen = $state(false);
  let pending = $state<string | null>(null);

  const cxLabel: Record<ComplexityKey, string> = $derived({
    simple: t.loader.complexitySimple,
    medium: t.loader.complexityMedium,
    complex: t.loader.complexityComplex,
  });
  const factor = (k: ComplexityKey): string => `×${complexityFactor(k).toFixed(2)}`;

  const results = $derived(
    query.trim()
      ? synced.contacts.filter((c) => `${c.name} ${c.surname ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
      : synced.contacts,
  );

  const primaryLabel = $derived(sel.primaryZone ? zoneLabel(draft.planner, sel.primaryZone.levelId, sel.primaryZone.segIdx) : "");
  const note = $derived(owner ? clientNote(owner) : "");
  const dotColor = (name: string): string => (name === MYSELF ? "#ffffff" : colorForIndex(clientNames().filter((n) => n !== MYSELF).indexOf(name)));

  function assign(name: string): void {
    assignSelectionTo(name);
    onclose();
  }
  function assignSelf(): void {
    assignSelectionToSelf();
    onclose();
  }
  function doReassign(scope: "primary" | "all"): void {
    if (pending) reassignTo(pending, scope);
    onclose();
  }
  function emptyPrimary(): void {
    clearPrimaryZone();
    if (sel.selection.length === 0) onclose();
  }
  function emptyAll(): void {
    clearSelectedZones();
    onclose();
  }
</script>

<div class="scrim" role="presentation" onclick={onclose} transition:fade={{ duration: 180 }}></div>
<div class="sheet" role="dialog" aria-label={owner ? t.assign.editTitle : t.assign.assignTitle} transition:fly={{ y: 360, duration: 260 }}>
  <div class="handle"></div>
  <div class="head">
    <span class="title">{owner ? t.assign.editTitle : t.assign.assignTitle}</span>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
  </div>

  {#if owner}
    <!-- ── Client-edit mode ─────────────────────────────────────────── -->
    <div class="pill">
      <span class="dot" style="--z:{dotColor(owner)}"></span>
      <span class="pn">{owner === MYSELF ? t.loader.myself : owner}</span>
      <span class="faint">{t.assign.shelvesCount(count)}</span>
    </div>

    <div class="block">
      {#if !reassignOpen}
        <button class="collapsed" onclick={() => (reassignOpen = true)}>{t.assign.reassign}</button>
      {:else}
        <button class="collapsed open" onclick={() => { reassignOpen = false; pending = null; }}>{t.assign.reassign} ✕</button>
        {#if pending}
          <div class="choice">
            <span class="move-h">{t.assign.moveTo(pending)}</span>
            <button class="mini" onclick={() => doReassign("primary")}>{t.assign.onlyThis(primaryLabel)}</button>
            <button class="mini" onclick={() => doReassign("all")}>{t.assign.moveAllOf(owner, pending)}</button>
          </div>
        {:else}
          <input class="search" bind:value={query} placeholder={t.assign.searchClientsPlaceholder} />
          <div class="results">
            {#each results as c (c.id)}
              {#if c.name !== owner}
                <button class="client" onclick={() => (pending = c.name)}>
                  <span class="dot" style="--z:{dotColor(c.name)}"></span>
                  <span class="cn">{c.name}{c.surname ? ` ${c.surname}` : ""}</span>
                </button>
              {/if}
            {/each}
          </div>
          <button class="self" onclick={assignSelf}>{t.assign.assignToMyself}</button>
        {/if}
      {/if}
    </div>

    <div class="block">
      <span class="label">{t.assign.complexityPerZone}</span>
      <div class="boxes">
        {#each sel.selection as z (z.levelId + ":" + z.segIdx)}
          {@const s = segmentAt(z)}
          <div class="boxrow">
            <span class="bid">{zoneLabel(draft.planner, z.levelId, z.segIdx)}</span>
            <div class="cx">
              {#each complexityKeys as key (key)}
                <button class="cx-btn" class:active={s?.complexity === key} onclick={() => setZoneComplexity(z.levelId, z.segIdx, key)}>
                  <span class="cxl">{cxLabel[key][0]}</span>
                  <span class="cxf">{factor(key)}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="block">
      <span class="label">{t.assign.note}</span>
      <textarea class="note" maxlength="240" rows="2" placeholder={t.assign.notePlaceholder} value={note} oninput={(e) => setClientNote(owner!, e.currentTarget.value)}></textarea>
    </div>

    <div class="danger">
      <button class="ghost danger" onclick={emptyPrimary} disabled={!sel.primaryZone}>{t.assign.emptyZone(primaryLabel)}</button>
      <button class="ghost danger" onclick={emptyAll}>{t.assign.emptyAllOf(owner)}</button>
    </div>

  {:else}
    <!-- ── Free-assign mode ─────────────────────────────────────────── -->
    <div class="sel">
      <span class="sel-n">{t.assign.shelvesSelected(count)}</span>
      <span class="faint">{t.assign.currentlyFree}</span>
    </div>

    <div class="cxrow">
      <span class="label">{t.assign.complexity}</span>
      <button class="help" onclick={() => (showHelp = !showHelp)} aria-label={t.assign.complexityHelp}>?</button>
    </div>
    {#if showHelp}
      <div class="helpbox">
        <span>{t.assign.complexityHelpSimple}</span>
        <span>{t.assign.complexityHelpMedium}</span>
        <span>{t.assign.complexityHelpComplex}</span>
      </div>
    {/if}
    <div class="cxwide">
      {#each complexityKeys as key (key)}
        <button class="cx-btn wide" class:active={sel.complexity === key} onclick={() => applyComplexityToSelection(key)}>
          <span class="cxl">{cxLabel[key]}</span>
          <span class="cxf">{factor(key)}</span>
        </button>
      {/each}
    </div>

    <div class="block">
      <span class="label">{t.assign.assignTo}</span>
      <input class="search" bind:value={query} placeholder={t.assign.searchClientsPlaceholder} />
      <div class="results">
        {#each results as c (c.id)}
          <button class="client" onclick={() => assign(c.name)}>
            <span class="dot" style="--z:{dotColor(c.name)}"></span>
            <span class="cn">{c.name}{c.surname ? ` ${c.surname}` : ""}</span>
          </button>
        {/each}
        {#if results.length === 0}<p class="faint none">{t.assign.noMatch}</p>{/if}
      </div>
      <button class="self" onclick={assignSelf}>{t.assign.assignToMyself}</button>
    </div>
  {/if}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 60;
  }
  .sheet {
    position: fixed;
    z-index: 61;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px 18px 0 0;
    padding: 10px 18px calc(22px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
  }
  .handle {
    width: 36px;
    height: 4px;
    border-radius: 4px;
    background: var(--line);
    align-self: center;
    margin-bottom: 4px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .title {
    font-size: 15px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 22px;
    padding: 2px 6px;
  }
  .pill {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
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
    border-radius: 10px;
  }
  .sel-n {
    font-size: 14px;
    font-weight: 600;
  }
  .sel .faint {
    font-size: 11px;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .cxrow {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .help {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--text-faint);
    background: none;
    color: var(--text-faint);
    font-size: 11px;
    line-height: 1;
  }
  .helpbox {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
    color: var(--text-dim);
    line-height: 1.5;
  }
  .cxwide {
    display: flex;
    gap: 8px;
  }
  .cx {
    display: flex;
    gap: 5px;
    flex: 1;
  }
  .cx-btn {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    padding: 8px 2px;
    color: var(--text-dim);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .cx-btn.wide {
    padding: 12px 2px;
  }
  .cx-btn.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .cxl {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .cx-btn:not(.active) .cxl {
    color: var(--text-dim);
  }
  .cxf {
    font-size: 10px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .boxes {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 34vh;
    overflow-y: auto;
  }
  .boxrow {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .bid {
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    width: 34px;
    flex-shrink: 0;
  }
  .note {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 12px;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    resize: none;
  }
  .collapsed {
    background: none;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 11px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .collapsed.open {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .choice {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }
  .move-h {
    font-size: 14px;
    font-weight: 600;
  }
  .mini {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-size: 13px;
    font-weight: 600;
  }
  .search {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 14px;
    color: var(--text);
    font: inherit;
    font-size: 15px;
  }
  .results {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 30vh;
    overflow-y: auto;
  }
  .client {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 13px 14px;
    color: var(--text);
    font-size: 15px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--z, var(--text-faint));
    flex-shrink: 0;
  }
  .cn {
    flex: 1;
  }
  .none {
    text-align: center;
    padding: 10px;
    margin: 0;
  }
  .self {
    background: none;
    border: 1px solid color-mix(in srgb, var(--amber, #f4b880) 45%, var(--line));
    border-radius: 10px;
    padding: 12px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .danger {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ghost {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .ghost:disabled {
    opacity: 0.4;
  }
  .ghost.danger {
    border-color: color-mix(in srgb, #e88 40%, var(--line));
    color: #e88;
  }
</style>
