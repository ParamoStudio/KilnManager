<script lang="ts">
  import type { FiringResult } from "@core";
  import {
    planner,
    currentKiln,
    currentService,
    setKiln,
    setService,
    toggleModifier,
  } from "../lib/firing.svelte";
  import { demoKilns } from "../lib/kilns";
  import { eur, pct, num } from "../lib/format";

  let { result } = $props<{ result: FiringResult }>();

  const kiln = $derived(currentKiln());
  const service = $derived(currentService());
  const modsPositive = $derived(
    planner.modifiers.filter((m) => m.on && m.amount > 0).reduce((a, m) => a + m.amount, 0),
  );
  const modsNegative = $derived(
    planner.modifiers.filter((m) => m.on && m.amount < 0).reduce((a, m) => a + m.amount, 0),
  );
</script>

<div class="panel service">
  <div class="selectors">
    <label>
      <span class="label">Kiln</span>
      <select value={planner.kilnId} onchange={(e) => setKiln(e.currentTarget.value)}>
        {#each demoKilns as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
      </select>
      <span class="faint sub">{kiln.shape === "cylinder" ? "Cylindrical" : "Box"} · {kiln.usableHeightCm} cm</span>
    </label>
  </div>

  <span class="label mt">Firing service</span>
  <select class="service-select" value={planner.serviceId} onchange={(e) => setService(e.currentTarget.value)}>
    {#each kiln.services as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
  </select>
  <div class="base">{eur(service.basePrice)} <span class="faint">base (full kiln)</span></div>

  <span class="label mt">Modifiers</span>
  <div class="mods">
    {#each planner.modifiers as m (m.id)}
      <label class="mod">
        <input type="checkbox" checked={m.on} onchange={() => toggleModifier(m.id)} />
        <span>{m.label}</span>
        <span class="amt" class:neg={m.amount < 0}>
          {m.amount < 0 ? "−" : "+"}{eur(Math.abs(m.amount))}
        </span>
      </label>
    {/each}
  </div>

  <span class="label mt">Summary</span>
  <div class="row"><span class="muted">Base price</span><span>{eur(service.basePrice)}</span></div>
  <div class="row"><span class="muted">Modifiers</span><span>+{eur(modsPositive)}</span></div>
  <div class="row"><span class="muted">Discounts</span><span>{modsNegative < 0 ? "−" : ""}{eur(Math.abs(modsNegative))}</span></div>
  <div class="divider"></div>
  <div class="row total"><span>Total firing price</span><span>{eur(result.accounting.revenue)}</span></div>

  <div class="note faint">
    Distributed among clients by load units (KLU) and complexity.
  </div>
  <div class="fill">
    <div class="fill-track"><div class="fill-bar" style="width: {Math.min(100, result.fillFraction * 100)}%"></div></div>
    <span class="faint">{pct(result.fillFraction)} of kiln volume · {num(result.totalKLU)} KLU</span>
  </div>
</div>

<style>
  .service {
    padding: 20px;
    display: flex;
    flex-direction: column;
  }
  .mt {
    margin-top: 18px;
  }
  label {
    display: block;
  }
  select {
    width: 100%;
    margin-top: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
  }
  .sub {
    display: block;
    font-size: 11px;
    margin-top: 6px;
  }
  .base {
    font-size: 20px;
    font-weight: 600;
    margin-top: 10px;
  }
  .base .faint {
    font-size: 12px;
    font-weight: 400;
  }
  .mods {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }
  .mod {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    font-size: 13px;
  }
  .mod input {
    accent-color: var(--accent);
    width: 15px;
    height: 15px;
  }
  .amt {
    margin-left: auto;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .amt.neg {
    color: var(--green);
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-variant-numeric: tabular-nums;
  }
  .row.total {
    font-weight: 600;
    font-size: 15px;
  }
  .divider {
    height: 1px;
    background: var(--line-soft);
    margin: 8px 0;
  }
  .note {
    font-size: 12px;
    margin-top: 12px;
    line-height: 1.5;
  }
  .fill {
    margin-top: 16px;
  }
  .fill-track {
    height: 6px;
    background: var(--panel-2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .fill-bar {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.35s ease;
  }
</style>
