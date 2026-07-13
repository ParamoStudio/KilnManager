<script lang="ts">
  import { onMount } from "svelte";
  import { computeFiring } from "@core";
  import {
    planner,
    ui,
    toCoreFiring,
    loadPlanner,
    loadContacts,
    savePlanner,
    seedDemo,
  } from "../lib/firing.svelte";
  import KilnSvg from "../components/KilnSvg.svelte";
  import StructurePanel from "../components/StructurePanel.svelte";
  import AssignPanel from "../components/AssignPanel.svelte";
  import CapacityStrip from "../components/CapacityStrip.svelte";

  const result = $derived(computeFiring(toCoreFiring()));

  let loaded = $state(false);
  onMount(async () => {
    await Promise.all([loadPlanner(), loadContacts()]);
    if (planner.levels.length === 0) seedDemo();
    loaded = true;
  });

  $effect(() => {
    $state.snapshot(planner);
    if (loaded) savePlanner();
  });
</script>

<div class="dash">
  <div class="main">
    <section class="stage">
      <KilnSvg />
    </section>

    <aside class="side">
      <div class="mode">
        <button class="mode-btn" class:active={ui.mode === "structure"} onclick={() => (ui.mode = "structure")}>
          1 · Structure
        </button>
        <button class="mode-btn" class:active={ui.mode === "assign"} onclick={() => (ui.mode = "assign")}>
          2 · Assign
        </button>
      </div>
      <div class="panel-scroll">
        {#if ui.mode === "structure"}
          <StructurePanel {result} />
        {:else}
          <AssignPanel {result} />
        {/if}
      </div>
    </aside>
  </div>

  <footer class="bottom panel">
    <CapacityStrip {result} />
  </footer>
</div>

<style>
  .dash {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }
  .main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 366px;
    gap: 16px;
    min-height: 0;
  }
  .stage {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 10px 16px;
    min-height: 0;
    overflow: hidden;
  }
  .side {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }
  .mode {
    display: flex;
    gap: 4px;
    background: var(--panel-2);
    border-radius: 9px;
    padding: 3px;
    flex-shrink: 0;
  }
  .mode-btn {
    flex: 1;
    background: none;
    border: none;
    border-radius: 7px;
    padding: 8px;
    font-size: 12px;
    color: var(--text-faint);
    letter-spacing: 0.02em;
  }
  .mode-btn.active {
    background: var(--panel);
    color: var(--text);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
  }
  .panel-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .bottom {
    height: 104px;
    flex-shrink: 0;
    padding: 14px 20px;
  }
</style>
