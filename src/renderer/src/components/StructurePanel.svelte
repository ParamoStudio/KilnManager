<script lang="ts">
  import type { FiringResult } from "@core";
  import { planner, currentKiln, setKiln, setService, toggleModifier } from "../lib/firing.svelte";
  import { demoKilns } from "../lib/kilns";
  import { eur } from "../lib/format";
  import PriceSummary from "./PriceSummary.svelte";

  let { result }: { result: FiringResult } = $props();
  const kiln = $derived(currentKiln());
</script>

<div class="rail">
  <span class="rail-title">Structure</span>

  <div class="block">
    <span class="label">Kiln</span>
    <select value={planner.kilnId} onchange={(e) => setKiln(e.currentTarget.value)}>
      {#each demoKilns as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
    </select>
    <span class="faint sub">
      {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm}×${kiln.depthCm} cm`} · {kiln.usableHeightCm} cm
    </span>
  </div>

  <div class="block">
    <span class="label">Firing service</span>
    <select value={planner.serviceId} onchange={(e) => setService(e.currentTarget.value)}>
      {#each kiln.services as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
    </select>
  </div>

  <div class="block">
    <span class="label">Modifiers</span>
    {#each planner.modifiers as m (m.id)}
      <label class="mod">
        <input type="checkbox" checked={m.on} onchange={() => toggleModifier(m.id)} />
        <span>{m.label}</span>
        <span class="amt" class:neg={m.amount < 0}>{m.amount < 0 ? "−" : "+"}{eur(Math.abs(m.amount))}</span>
      </label>
    {/each}
  </div>

  <div class="foot">
    <PriceSummary {result} />
  </div>
</div>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
  }
  .rail-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  select {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
  }
  .sub {
    font-size: 11px;
  }
  .mod {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    padding: 3px 0;
  }
  .mod input {
    accent-color: var(--accent);
  }
  .amt {
    margin-left: auto;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .amt.neg {
    color: var(--green);
  }
  .foot {
    margin-top: auto;
  }
</style>
