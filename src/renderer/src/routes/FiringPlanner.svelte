<script lang="ts">
  import { computeFiring } from "@core";
  import { ui, toCoreFiring, clearSelection } from "../lib/firing.svelte";
  import KilnSvg from "../components/KilnSvg.svelte";
  import StructurePanel from "../components/StructurePanel.svelte";
  import AssignPanel from "../components/AssignPanel.svelte";
  import CapacityStrip from "../components/CapacityStrip.svelte";
  import ShelfEditor from "../components/ShelfEditor.svelte";

  // The working `planner` drives the live view; it's synced back into the active
  // firing record when leaving the screen (see go() / closeActiveFiring).
  const result = $derived(computeFiring(toCoreFiring()));
</script>

<div class="dash">
  <div class="main">
    <aside class="rail"><StructurePanel {result} /></aside>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <section class="stage" role="presentation" onclick={clearSelection}><KilnSvg /></section>
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
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 8px 14px;
    min-height: 0;
    overflow: hidden;
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
