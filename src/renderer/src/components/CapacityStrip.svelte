<script lang="ts">
  import type { FiringResult } from "@core";
  import { roundUp50 } from "@core";
  import { occupiedVolumeFraction, remainingCm, selectClientZones } from "../lib/firing.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();
  const occFill = $derived(occupiedVolumeFraction());
  // Client-facing amounts round up to 0.50; the exact figure is kept for you.
  const finalTotal = $derived(
    result.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0),
  );
</script>

<div class="strip">
  <div class="head">
    <span class="label">Client breakdown</span>
    <span class="faint">
      {pct(occFill)} loaded · {Math.round(remainingCm())} cm free · total {eur(finalTotal)}
      <span class="real">({eur(result.accounting.revenue)})</span>
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
          {#if c.charged}
            <span class="pr">{eur(roundUp50(c.price))}<span class="real">({eur(c.price)})</span></span>
          {:else}
            <span class="pr own">own</span>
          {/if}
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
  .pr.own {
    color: var(--text-faint);
    font-weight: 400;
    font-style: italic;
  }
  .real {
    color: var(--text-faint);
    font-weight: 400;
    font-size: 11px;
    margin-left: 4px;
  }
  .empty {
    font-size: 13px;
  }
</style>
