<script lang="ts">
  import type { FiringResult } from "@core";
  import { roundUp50 } from "@core";
  import { MYSELF, selectClientZones } from "../lib/firing.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();

  // Paying clients keep their distinct colours by order; "Myself" is always
  // white (it never consumes a colour slot) and is anchored to the right.
  const ordered = $derived.by(() => {
    const paying = result.clients.filter((c) => c.contactName !== MYSELF);
    const mine = result.clients.filter((c) => c.contactName === MYSELF);
    return [
      ...paying.map((c, i) => ({ c, color: colorForIndex(i) })),
      ...mine.map((c) => ({ c, color: "#ffffff" })),
    ];
  });
  // For an uncharged (studio-own) zone, this is the value it would have billed —
  // the money absorbed — shown negative for the internal invoice trail.
  const lostFor = (sharePct: number): number => result.serviceRevenue * sharePct;
</script>

<div class="strip">
  <div class="head">
    <span class="label">Client breakdown</span>
  </div>

  {#if result.clients.length === 0}
    <span class="faint empty">No clients assigned yet — select zones and assign them.</span>
  {:else}
    <div class="clients">
      {#each ordered as { c, color } (c.contactName)}
        <button class="chip" class:mine={c.contactName === MYSELF} onclick={() => selectClientZones(c.contactName)} title="Select this client's zones">
          <span class="dot" style="--z:{color}"></span>
          <span class="cn">{c.contactName}</span>
          <span class="sh faint">{pct(c.sharePct)}</span>
          {#if c.charged}
            <span class="pr">{eur(roundUp50(c.price))}<span class="real">({eur(c.price)})</span></span>
          {:else}
            <span class="pr own">own<span class="real">(−{eur(lostFor(c.sharePct))})</span></span>
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
  .chip.mine {
    border-color: rgba(255, 255, 255, 0.22);
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
