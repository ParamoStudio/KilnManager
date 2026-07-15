<script lang="ts">
  import type { FiringResult } from "@core";
  import { roundUp50 } from "@core";
  import { planner, currentService, occupiedVolumeFraction } from "../lib/firing.svelte";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();

  const service = $derived(currentService());
  const modsPos = $derived(planner.modifiers.filter((m) => m.on && m.amount > 0).reduce((a, m) => a + m.amount, 0));
  const modsNeg = $derived(planner.modifiers.filter((m) => m.on && m.amount < 0).reduce((a, m) => a + m.amount, 0));
  const occFill = $derived(occupiedVolumeFraction());
  // What is actually collected: each charged amount rounded up to the next 0.50.
  const roundedTotal = $derived(result.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0));
</script>

<div class="summary">
  <div class="row"><span class="muted">Base · {service.name}</span><span>{eur(service.basePrice)}</span></div>
  {#if modsPos > 0}<div class="row"><span class="muted">Modifiers</span><span>+{eur(modsPos)}</span></div>{/if}
  {#if modsNeg < 0}<div class="row"><span class="muted">Discounts</span><span class="disc">−{eur(Math.abs(modsNeg))}</span></div>{/if}
  <div class="row"><span class="muted">Occupancy</span><span class="muted">{pct(occFill)} loaded</span></div>
  <div class="row total"><span>Total firing</span><span>{eur(roundedTotal)} <span class="real">({eur(result.accounting.revenue)})</span></span></div>
</div>

<style>
  .summary {
    border-top: 1px solid var(--line-soft);
    padding-top: 10px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .row.total {
    font-weight: 600;
    font-size: 15px;
    margin-top: 2px;
  }
  .disc {
    color: var(--green);
  }
  .real {
    color: var(--text-faint);
    font-weight: 400;
    font-size: 12px;
    margin-left: 2px;
  }
</style>
