<script lang="ts">
  import { computeFiring } from "@core";
  import { ui, toCoreFiring, clearSelection, clientScopeMods, cancelClientMod } from "../lib/firing.svelte";
  import KilnSvg from "../components/KilnSvg.svelte";
  import StructurePanel from "../components/StructurePanel.svelte";
  import AssignPanel from "../components/AssignPanel.svelte";
  import CapacityStrip from "../components/CapacityStrip.svelte";
  import ShelfEditor from "../components/ShelfEditor.svelte";

  // The working `planner` drives the live view; it's synced back into the active
  // firing record when leaving the screen (see go() / closeActiveFiring).
  const result = $derived(computeFiring(toCoreFiring()));

  const pendingMod = $derived(clientScopeMods().find((m) => m.id === ui.pendingClientMod) ?? null);
  function stageClick(): void {
    if (ui.pendingClientMod) cancelClientMod();
    else clearSelection();
  }
</script>

<div class="dash">
  <div class="main">
    <aside class="rail"><StructurePanel {result} /></aside>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <section class="stage" role="presentation" onclick={stageClick}>
      {#if pendingMod}
        <div class="pick-banner">
          <span class="ptext">Pick an assigned shelf to apply:&nbsp;<b>{pendingMod.name}</b>&nbsp;to that client</span>
          <button class="pcancel" onclick={(e) => { e.stopPropagation(); cancelClientMod(); }}>Cancel</button>
        </div>
      {/if}
      <KilnSvg />
    </section>
    <aside class="rail"><AssignPanel /></aside>
  </div>
  <footer class="bottom"><CapacityStrip {result} /></footer>
</div>

{#if ui.shelfEditor}
  <ShelfEditor />
{/if}

<style>
  .dash {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }
  .main {
    flex: 1;
    display: grid;
    grid-template-columns: 264px 1fr 300px;
    gap: 14px;
    min-height: 0;
  }
  .rail {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 16px;
    overflow-y: auto;
    min-height: 0;
  }
  .stage {
    position: relative;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 8px 14px;
    min-height: 0;
    overflow: hidden;
  }
  .pick-banner {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: calc(100% - 24px);
    background: color-mix(in srgb, var(--amber) 18%, var(--panel));
    border: 1px solid var(--amber);
    border-radius: 999px;
    padding: 7px 7px 7px 16px;
    color: var(--text);
    font-size: 13px;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .ptext {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pcancel {
    background: var(--amber);
    color: #1a1200;
    border: none;
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
  }
  .bottom {
    height: 92px;
    flex-shrink: 0;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 12px 20px;
  }
</style>
