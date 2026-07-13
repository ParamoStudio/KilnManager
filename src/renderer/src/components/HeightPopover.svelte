<script lang="ts">
  import Popover from "./Popover.svelte";
  import { setSupportHeight, currentKiln, planner } from "../lib/firing.svelte";

  let { levelId, x, y, onclose } = $props<{
    levelId: string;
    x: number;
    y: number;
    onclose: () => void;
  }>();

  const level = $derived(planner.levels.find((l) => l.id === levelId));
  const presets = currentKiln().standardPostHeightsCm;

  let custom = $state(level?.supportHeightCm ?? 10);
  $effect(() => {
    if (level) custom = Math.round(level.supportHeightCm);
  });

  function pick(cm: number): void {
    setSupportHeight(levelId, cm);
  }
</script>

<Popover {x} {y} {onclose}>
  <div class="label">Support height</div>
  <div class="faint sub">Standard posts</div>
  <div class="presets">
    {#each presets as p (p)}
      <button
        class="preset"
        class:active={Math.round(level?.supportHeightCm ?? 0) === p}
        onclick={() => pick(p)}
      >
        {p} cm
      </button>
    {/each}
  </div>

  <div class="faint sub mt">Custom</div>
  <div class="custom">
    <input type="number" min="2" max={currentKiln().usableHeightCm} bind:value={custom} />
    <span class="unit">cm</span>
    <button class="btn" onclick={() => pick(custom)}>Set</button>
  </div>
</Popover>

<style>
  .sub {
    font-size: 11px;
    margin: 10px 0 6px;
  }
  .mt {
    margin-top: 14px;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .preset {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 7px 11px;
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .preset.active {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .custom {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .custom input {
    width: 72px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
  }
  .unit {
    color: var(--text-faint);
    font-size: 12px;
  }
  .btn {
    margin-left: auto;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    background: var(--accent);
    color: #111;
    font-weight: 600;
  }
</style>
