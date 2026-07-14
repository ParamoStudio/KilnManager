<script lang="ts">
  import type { FiringResult } from "@core";
  import {
    planner,
    app,
    currentKiln,
    setService,
    toggleModifier,
    activeFiring,
    setActiveTitle,
    closeActiveFiring,
  } from "../lib/firing.svelte";
  import { eur } from "../lib/format";
  import PriceSummary from "./PriceSummary.svelte";

  let { result }: { result: FiringResult } = $props();
  const kiln = $derived(currentKiln());
  const title = $derived(activeFiring()?.title ?? "");

  let confirming = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function closeClick(): void {
    if (!confirming) {
      confirming = true;
      timer = setTimeout(() => (confirming = false), 4000);
      return;
    }
    clearTimeout(timer);
    confirming = false;
    closeActiveFiring();
    app.exportOpen = true;
  }
</script>

<div class="rail">
  <div class="block">
    <span class="label">Firing</span>
    <input
      class="title"
      value={title}
      placeholder="Untitled firing"
      oninput={(e) => setActiveTitle(e.currentTarget.value)}
    />
    <span class="faint sub">
      {kiln.name} · {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm}×${kiln.depthCm} cm`} · {kiln.usableHeightCm} cm
    </span>
  </div>

  <div class="block">
    <span class="label">Firing service</span>
    <select value={planner.serviceId} onchange={(e) => setService(e.currentTarget.value)}>
      {#each kiln.services as s (s.id)}<option value={s.id}>{s.name} — {eur(s.basePrice)}</option>{/each}
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
    <button class="close" class:confirming onclick={closeClick}>
      {confirming ? "Click again to confirm — closes the firing" : "Confirm firing & invoice"}
    </button>
  </div>
</div>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .title {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
    font-size: 15px;
    font-weight: 600;
  }
  .title:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .sub {
    font-size: 11px;
  }
  select {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
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
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .close {
    background: color-mix(in srgb, var(--amber) 16%, var(--panel-2));
    border: 1px solid color-mix(in srgb, var(--amber) 55%, var(--line));
    color: var(--amber);
    border-radius: 9px;
    padding: 11px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.15s ease;
  }
  .close:hover {
    background: color-mix(in srgb, var(--amber) 26%, var(--panel-2));
  }
  .close.confirming {
    background: var(--amber);
    color: #1a1200;
    border-color: var(--amber);
  }
</style>
