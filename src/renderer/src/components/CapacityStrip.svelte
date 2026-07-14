<script lang="ts">
  import type { FiringResult } from "@core";
  import { occupiedVolumeFraction, remainingCm, selectClientZones } from "../lib/firing.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();
  const occFill = $derived(occupiedVolumeFraction());
</script>

<div class="strip">
  <div class="head">
    <span class="label">Client breakdown</span>
    <span class="faint">
      {pct(occFill)} loaded · {Math.round(remainingCm())} cm free · total {eur(result.accounting.revenue)}
    </span>
  </div>

  {#if result.clients.length === 0}
    <span class="faint empty">No clients assigned yet — select zones and assign them.</span>
  {:else}
    <div class="clients">
      {#each result.clients as c, i (c.contactName)}
        <button class="chip" onclick={() => selectClientZones(c.contactName)} title="Select this client's zones">
          <span class="dot" style="--z:{colorForIndex(i)}"></span>
          <span class="cn">{c.contactName}</span>
          <span class="sh faint">{pct(c.sharePct)}</span>
          <span class="pr">{eur(c.price)}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .strip {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 9px;
    justify-content: center;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
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
    padding: 7px 14px;
    color: var(--text);
    font-size: 13px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .chip:hover {
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
