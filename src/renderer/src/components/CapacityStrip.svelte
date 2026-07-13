<script lang="ts">
  import type { FiringResult } from "@core";
  import {
    planner,
    ui,
    structureFillFraction,
    occupiedVolumeFraction,
    remainingCm,
    clientNames,
    setActiveClient,
  } from "../lib/firing.svelte";
  import { colorForName } from "../lib/colors";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();
  const names = $derived(clientNames());
  const structFill = $derived(structureFillFraction());
  const occFill = $derived(occupiedVolumeFraction());
</script>

<div class="strip">
  {#if ui.mode === "structure"}
    <div class="cap">
      <div class="cap-head">
        <span class="label">Structure</span>
        <span class="faint">{planner.levels.length} shelves · {Math.round(remainingCm())} cm remaining</span>
      </div>
      <div class="track"><div class="bar" style="width: {Math.min(100, structFill * 100)}%"></div></div>
      <span class="faint pc">{pct(structFill)} of usable height shelved</span>
    </div>
  {:else}
    <div class="breakdown">
      <div class="cap-head">
        <span class="label">Client breakdown</span>
        <span class="faint">{pct(occFill)} of volume loaded · total {eur(result.accounting.revenue)}</span>
      </div>
      {#if result.clients.length === 0}
        <span class="faint empty">No clients assigned yet.</span>
      {:else}
        <div class="clients">
          {#each result.clients as c (c.contactName)}
            <button class="chip" class:active={ui.activeClient === c.contactName} onclick={() => setActiveClient(c.contactName)}>
              <span class="dot" style="--z: {colorForName(c.contactName, names)}"></span>
              <span class="cn">{c.contactName}</span>
              <span class="sh faint">{pct(c.sharePct)}</span>
              <span class="pr">{eur(c.price)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .strip {
    height: 100%;
    display: flex;
    align-items: center;
  }
  .cap,
  .breakdown {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .cap-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .track {
    height: 6px;
    background: var(--panel-2);
    border-radius: 4px;
    overflow: hidden;
  }
  .bar {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.35s ease;
  }
  .pc {
    font-size: 11px;
  }
  .clients {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 7px 13px;
    color: var(--text);
    font-size: 13px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .chip.active {
    border-color: var(--text-faint);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--z);
  }
  .sh {
    font-variant-numeric: tabular-nums;
  }
  .pr {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .empty {
    font-size: 13px;
  }
</style>
