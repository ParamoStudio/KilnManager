<script lang="ts">
  import { onMount } from "svelte";
  import { computeFiring } from "@core";
  import {
    planner,
    toCoreFiring,
    loadPlanner,
    savePlanner,
    seedDemo,
  } from "../lib/firing.svelte";
  import KilnBuilder from "../components/KilnBuilder.svelte";
  import ServicePanel from "../components/ServicePanel.svelte";
  import LiveBreakdown from "../components/LiveBreakdown.svelte";
  import AssignPopover from "../components/AssignPopover.svelte";
  import HeightPopover from "../components/HeightPopover.svelte";

  const result = $derived(computeFiring(toCoreFiring()));

  let loaded = $state(false);
  onMount(async () => {
    await loadPlanner();
    if (planner.levels.length === 0) seedDemo();
    loaded = true;
  });

  // Persist on any change (proves the storage adapter round-trips).
  $effect(() => {
    $state.snapshot(planner);
    if (loaded) savePlanner();
  });

  type Editing =
    | { kind: "assign"; levelId: string; segIdx: number; x: number; y: number }
    | { kind: "height"; levelId: string; x: number; y: number };
  let editing = $state<Editing | null>(null);

  const clampX = (x: number): number => Math.max(12, Math.min(x, window.innerWidth - 260));
  const clampY = (y: number): number => Math.max(12, Math.min(y, window.innerHeight - 280));

  function openAssign(levelId: string, segIdx: number, rect: DOMRect): void {
    editing = { kind: "assign", levelId, segIdx, x: clampX(rect.left), y: clampY(rect.bottom + 6) };
  }
  function openHeight(levelId: string, rect: DOMRect): void {
    editing = { kind: "height", levelId, x: clampX(rect.left), y: clampY(rect.bottom + 6) };
  }
  function currentSegment(levelId: string, segIdx: number) {
    return planner.levels.find((l) => l.id === levelId)?.segments[segIdx] ?? null;
  }
</script>

<div class="planner">
  <section class="left panel">
    <KilnBuilder onassign={openAssign} onheight={openHeight} />
  </section>
  <aside class="right">
    <ServicePanel {result} />
  </aside>
  <section class="bd">
    <LiveBreakdown {result} />
  </section>
</div>

{#if editing}
  {#if editing.kind === "assign"}
    <AssignPopover
      levelId={editing.levelId}
      segIdx={editing.segIdx}
      current={currentSegment(editing.levelId, editing.segIdx)}
      x={editing.x}
      y={editing.y}
      onclose={() => (editing = null)}
    />
  {:else}
    <HeightPopover
      levelId={editing.levelId}
      x={editing.x}
      y={editing.y}
      onclose={() => (editing = null)}
    />
  {/if}
{/if}

<style>
  .planner {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 16px;
    align-items: start;
  }
  .left {
    padding: 20px;
  }
  .bd {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 16px;
    align-items: start;
  }

  @media (max-width: 900px) {
    .planner,
    .bd {
      grid-template-columns: 1fr;
    }
  }
</style>
