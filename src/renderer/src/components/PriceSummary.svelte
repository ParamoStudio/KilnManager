<script lang="ts">
  import type { FiringResult, KilnModifier } from "@core";
  import { roundUp50 } from "@core";
  import { planner, currentService, occupiedVolumeFraction, surcharges, discountTiers } from "../lib/firing.svelte";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();

  const service = $derived(currentService());
  const occFill = $derived(occupiedVolumeFraction());
  const fmtMod = (m: { mode: "percent" | "fixed"; value: number }): string =>
    m.mode === "percent" ? `${m.value}%` : eur(m.value);

  const activeSurcharges = $derived(surcharges().filter((m: KilnModifier) => planner.surcharges.includes(m.id)));
  const discountLine = $derived.by(() => {
    const d = planner.discount;
    if (!d) return null;
    if ("tierId" in d) {
      const t = discountTiers().find((x) => x.id === d.tierId);
      return t ? { name: t.name, mode: t.mode, value: t.value } : null;
    }
    return { name: "Custom", mode: d.custom.mode, value: d.custom.value };
  });
  // What is actually collected: each charged amount rounded up to the next 0.50.
  const roundedTotal = $derived(result.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0));
</script>

<div class="summary">
  <div class="row"><span class="muted">Base · {service.name}</span><span>{eur(service.basePrice)}</span></div>
  {#each activeSurcharges as m (m.id)}
    <div class="row"><span class="muted">{m.name}</span><span>+{fmtMod(m)}</span></div>
  {/each}
  {#if discountLine}
    <div class="row"><span class="muted">{discountLine.name}</span><span class="disc">−{fmtMod(discountLine)}</span></div>
  {/if}
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
