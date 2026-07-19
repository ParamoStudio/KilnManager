<script lang="ts">
  import type { FiringResult, KilnModifier } from "@core";
  import { roundUp50 } from "@core";
  import { planner, currentService, occupiedVolumeFraction, fullKilnMods, modSign } from "../lib/firing.svelte";
  import { t } from "../lib/i18n.svelte";
  import { eur, pct } from "../lib/format";

  let { result }: { result: FiringResult } = $props();

  const service = $derived(currentService());
  const occFill = $derived(occupiedVolumeFraction());
  const fmtMod = (m: { mode: "percent" | "fixed"; value: number }): string =>
    m.mode === "percent" ? `${m.value}%` : eur(m.value);

  const activeKilnMods = $derived(fullKilnMods().filter((m: KilnModifier) => planner.kilnMods.includes(m.id)));
  const hasClientMods = $derived(Object.values(planner.clientMods ?? {}).some((a) => a.length > 0));
  // What is actually collected: each charged amount rounded up to the next 0.50.
  const roundedTotal = $derived(result.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0));
</script>

<div class="summary">
  <div class="row"><span class="muted">{t.priceSummary.base(service.name)}</span><span>{eur(service.basePrice)}</span></div>
  {#each activeKilnMods as m (m.id)}
    <div class="row"><span class="muted">{m.name}</span><span class:disc={modSign(m) < 0}>{modSign(m) > 0 ? "+" : "−"}{fmtMod(m)}</span></div>
  {/each}
  {#if planner.customDiscount}
    <div class="row"><span class="muted">{t.priceSummary.customDiscount}</span><span class="disc">−{planner.customDiscount.mode === "percent" ? `${planner.customDiscount.value}%` : eur(planner.customDiscount.value)}</span></div>
  {/if}
  {#if hasClientMods}
    <div class="row"><span class="muted">{t.priceSummary.clientModifiers}</span><span class="muted">{t.priceSummary.applied}</span></div>
  {/if}
  <div class="row"><span class="muted">{t.priceSummary.occupancy}</span><span class="muted">{pct(occFill)} {t.priceSummary.loaded}</span></div>
  <div class="row total"><span>{t.priceSummary.totalFiring}</span><span>{eur(roundedTotal)} <span class="real">({eur(result.accounting.revenue)})</span></span></div>
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
