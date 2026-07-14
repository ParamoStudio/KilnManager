<script lang="ts">
  import type { FiringResult } from "@core";
  import { planner, currentService } from "../lib/firing.svelte";
  import { eur } from "../lib/format";

  let { result }: { result: FiringResult } = $props();

  const service = $derived(currentService());
  const modsPos = $derived(planner.modifiers.filter((m) => m.on && m.amount > 0).reduce((a, m) => a + m.amount, 0));
  const modsNeg = $derived(planner.modifiers.filter((m) => m.on && m.amount < 0).reduce((a, m) => a + m.amount, 0));
</script>

<div class="summary">
  <div class="row"><span class="muted">Base · {service.name}</span><span>{eur(service.basePrice)}</span></div>
  {#if modsPos > 0}<div class="row"><span class="muted">Modifiers</span><span>+{eur(modsPos)}</span></div>{/if}
  {#if modsNeg < 0}<div class="row"><span class="muted">Discounts</span><span class="disc">−{eur(Math.abs(modsNeg))}</span></div>{/if}
  <div class="row total"><span>Total firing</span><span>{eur(result.serviceRevenue)}</span></div>
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
</style>
