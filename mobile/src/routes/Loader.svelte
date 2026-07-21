<script lang="ts">
  import {
    draft,
    sel,
    currentKiln,
    remainingCm,
    closeDraft,
    clearSelection,
    selectionOwners,
    zoneLabel,
  } from "../lib/loader.svelte";
  import { t } from "../lib/i18n.svelte";
  import KilnCanvas from "../components/KilnCanvas.svelte";
  import AddShelfSheet from "../components/AddShelfSheet.svelte";
  import AssignSheet from "../components/AssignSheet.svelte";

  let { onexit }: { onexit: () => void } = $props();

  const kiln = $derived(currentKiln(draft.planner));
  const remaining = $derived(remainingCm(draft.planner));

  const count = $derived(sel.selection.length);
  const owner = $derived(selectionOwners().length === 1 ? selectionOwners()[0]! : null);
  const selLabels = $derived(sel.selection.map((z) => zoneLabel(draft.planner, z.levelId, z.segIdx)).join(" · "));

  let sheet = $state<"none" | "add" | "assign">("none");

  // Nothing to "save": every edit is already written to the list and uploaded.
  // Going back just closes the editor (an untouched, empty firing is dropped).
  function back(): void {
    closeDraft();
    onexit();
  }
</script>

<div class="wrap">
  <div class="head">
    <button class="back" onclick={back}>{t.common.back}</button>
    <span class="kname">{kiln?.name ?? ""}</span>
    <span class="rem faint">{remaining.toFixed(1)} cm</span>
  </div>

  <input class="ftitle" bind:value={draft.title} placeholder={t.loader.firingTitlePlaceholder} />

  {#if kiln}
    <div class="svcfield">
      <select class="svc" value={draft.planner.serviceId} onchange={(e) => (draft.planner.serviceId = e.currentTarget.value)} disabled={kiln.services.length <= 1}>
        {#each kiln.services as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
      </select>
      {#if kiln.services.length > 1}<span class="chev" aria-hidden="true">▾</span>{/if}
    </div>
  {/if}

  <div class="canvas">
    <KilnCanvas onAddShelf={() => (sheet = "add")} />
  </div>
</div>

<!-- Bottom action bar — appears only for a selection, mirroring the desktop
     assign rail: free zones → assign; one client's zones → edit. Nothing
     selected → no bar (going Back auto-saves). -->
{#if count > 0}
  <div class="bar">
    <div class="selinfo">
      <span class="seln">{owner ?? t.assign.shelvesSelected(count)}</span>
      <span class="faint sellabels">{selLabels}</span>
    </div>
    <button class="ghost" onclick={clearSelection} aria-label={t.common.close}>×</button>
    <button class="primary" onclick={() => (sheet = "assign")}>
      {owner ? t.assign.editTitle : t.assign.assignSelection(count)}
    </button>
  </div>
{/if}

{#if sheet === "add" && kiln}
  <AddShelfSheet {kiln} onclose={() => (sheet = "none")} />
{/if}
{#if sheet === "assign"}
  <AssignSheet onclose={() => (sheet = "none")} />
{/if}

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 2px 4px 24px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .back {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 14px;
    flex-shrink: 0;
  }
  .kname {
    flex: 1;
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    min-width: 0;
  }
  /* Same visual language as the title input: a full-width rounded rectangle. */
  .svcfield {
    position: relative;
  }
  .svc {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 40px 12px 14px;
    color: var(--text);
    font: inherit;
    font-size: 15px;
  }
  .svc:disabled {
    opacity: 1;
    color: var(--text-dim);
  }
  .chev {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-faint);
    font-size: 11px;
    pointer-events: none;
  }
  .rem {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .ftitle {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 11px 14px;
    color: var(--text);
    font: inherit;
    font-size: 15px;
    font-weight: 600;
  }
  .canvas {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 14px;
    padding: 6px 4px;
  }
  .bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--panel) 92%, transparent);
    border-top: 1px solid var(--line-soft);
    backdrop-filter: blur(8px);
  }
  .selinfo {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .seln {
    font-size: 13px;
    font-weight: 600;
  }
  .sellabels {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .primary {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 12px;
    padding: 14px 18px;
    font-size: 15px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .ghost {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    width: 34px;
    height: 34px;
    color: var(--text-faint);
    font-size: 18px;
    flex-shrink: 0;
  }
</style>
