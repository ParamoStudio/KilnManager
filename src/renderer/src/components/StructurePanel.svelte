<script lang="ts">
  import type { FiringResult } from "@core";
  import type { KilnModifier } from "@core";
  import {
    planner,
    ui,
    app,
    currentKiln,
    currentService,
    setService,
    fullKilnMods,
    clientScopeMods,
    toggleKilnMod,
    setCustomDiscount,
    clearCustomDiscount,
    startClientMod,
    modSign,
    activeFiring,
    setActiveTitle,
    closeActiveFiring,
  } from "../lib/firing.svelte";
  import { eur } from "../lib/format";
  import PriceSummary from "./PriceSummary.svelte";

  let { result }: { result: FiringResult } = $props();
  const kiln = $derived(currentKiln());
  const svc = $derived(currentService());
  const title = $derived(activeFiring()?.title ?? "");

  const fmtMod = (m: { mode: "percent" | "fixed"; value: number }): string =>
    m.mode === "percent" ? `${m.value}%` : eur(m.value);
  const signGlyph = (m: KilnModifier): string => (modSign(m) > 0 ? "+" : "−");

  let kilnOpen = $state(false);
  let clientOpen = $state(false);
  let customOpen = $state(false);
  let customVal = $state<number>(0);
  let customMode = $state<"percent" | "fixed">("percent");
  function applyCustom(): void {
    setCustomDiscount(customMode, customVal || 0);
    customOpen = false;
  }

  let svcOpen = $state(false);
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
    <input class="title" value={title} placeholder="Untitled firing" oninput={(e) => setActiveTitle(e.currentTarget.value)} />
    <span class="faint sub">
      {kiln.name} · {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm}×${kiln.depthCm} cm`} · {kiln.usableHeightCm} cm
    </span>
  </div>

  <div class="block">
    <span class="label">Firing service</span>
    <div class="acc">
      <button class="acc-head" onclick={() => (svcOpen = !svcOpen)}>
        <span class="svc-name">{svc.name}</span>
        <span class="svc-price">{eur(svc.basePrice)}</span>
        <span class="chev" class:open={svcOpen}>⌄</span>
      </button>
      {#if svcOpen}
        <div class="acc-list">
          {#each kiln.services as s (s.id)}
            <button class="acc-item" class:active={s.id === planner.serviceId} onclick={() => { setService(s.id); svcOpen = false; }}>
              <span>{s.name}</span>
              <span class="svc-price">{eur(s.basePrice)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="block">
    <span class="label">Price Modifiers</span>

    <!-- Full-kiln: tick any combination -->
    <button class="acc-btn" onclick={() => (kilnOpen = !kilnOpen)}>
      <span>Kiln Modifier</span><span class="chev" class:open={kilnOpen}>⌄</span>
    </button>
    {#if kilnOpen}
      <div class="acc-body">
        {#each fullKilnMods() as m (m.id)}
          <button class="mod" onclick={() => toggleKilnMod(m.id)}>
            <span class="box" class:checked={planner.kilnMods.includes(m.id)}></span>
            <span class="ml">{m.name}</span>
            <span class="amt">{signGlyph(m)}{fmtMod(m)}</span>
          </button>
        {/each}
        {#if fullKilnMods().length === 0}<span class="faint none">None defined for this kiln.</span>{/if}

        <button class="mod" onclick={() => (customOpen = !customOpen)}>
          <span class="box" class:checked={!!planner.customDiscount}></span>
          <span class="ml">Custom discount</span>
          {#if planner.customDiscount}
            <span class="amt">−{planner.customDiscount.mode === "percent" ? `${planner.customDiscount.value}%` : eur(planner.customDiscount.value)}</span>
          {/if}
        </button>
        {#if customOpen}
          <div class="custom">
            <input type="number" min="0" step="0.5" bind:value={customVal} placeholder="0" />
            <div class="modeseg">
              <button class:active={customMode === "percent"} onclick={() => (customMode = "percent")}>%</button>
              <button class:active={customMode === "fixed"} onclick={() => (customMode = "fixed")}>€</button>
            </div>
            <button class="applyc" onclick={applyCustom}>Apply</button>
            {#if planner.customDiscount}<button class="clearc" onclick={clearCustomDiscount} aria-label="Clear">×</button>{/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Client-scope: pick a client's cubicle to apply -->
    <button class="acc-btn" onclick={() => (clientOpen = !clientOpen)}>
      <span>Client Modifier</span><span class="chev" class:open={clientOpen}>⌄</span>
    </button>
    {#if clientOpen}
      <div class="acc-body">
        {#each clientScopeMods() as m (m.id)}
          <button class="cmod" class:armed={ui.pendingClientMod === m.id} onclick={() => startClientMod(m.id)}>
            <span class="ml">{m.name}</span>
            <span class="amt">{signGlyph(m)}{fmtMod(m)}</span>
          </button>
        {/each}
        {#if clientScopeMods().length === 0}<span class="faint none">None defined for this kiln.</span>{/if}
        {#if ui.pendingClientMod}<span class="hint faint">Click a client's cubicle in the kiln to apply.</span>{/if}
      </div>
    {/if}
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

  .acc {
    border: 1px solid var(--line);
    border-radius: 9px;
    overflow: hidden;
    background: var(--panel-2);
  }
  .acc-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text);
  }
  .svc-name {
    font-size: 14px;
    font-weight: 500;
  }
  .svc-price {
    margin-left: auto;
    color: var(--green);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }
  .chev {
    color: var(--text-faint);
    transition: transform 0.18s ease;
    margin-left: 8px;
  }
  .chev.open {
    transform: rotate(180deg);
  }
  .acc-list {
    border-top: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
  }
  .acc-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 13px;
  }
  .acc-item:hover {
    background: var(--panel);
    color: var(--text);
  }
  .acc-item.active {
    color: var(--text);
  }
  .acc-item .svc-price {
    color: var(--green);
  }

  .mod {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    background: none;
    border: none;
    color: var(--text);
    font-size: 13px;
    text-align: left;
  }
  .box {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    flex-shrink: 0;
    position: relative;
    transition: all 0.15s ease;
  }
  .box.checked {
    background: var(--accent);
    border-color: var(--accent);
  }
  .box.checked::after {
    content: "";
    position: absolute;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid #111;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .ml {
    flex: 1;
  }
  .amt {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }

  .acc-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 13px;
  }
  .acc-btn:hover {
    border-color: var(--text-faint);
  }
  .chev {
    color: var(--text-faint);
    transition: transform 0.18s ease;
  }
  .chev.open {
    transform: rotate(180deg);
  }
  .acc-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 2px 6px;
  }
  .none {
    font-size: 12px;
    padding: 2px 0;
  }
  .hint {
    font-size: 11px;
    color: var(--amber);
    padding: 2px 0;
  }
  .cmod {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 8px 11px;
    color: var(--text);
    font-size: 13px;
    text-align: left;
  }
  .cmod:hover {
    border-color: var(--text-faint);
  }
  .cmod.armed {
    border-color: var(--amber);
    background: color-mix(in srgb, var(--amber) 12%, var(--panel-2));
  }
  .cmod .amt,
  .mod .amt {
    color: var(--text-dim);
  }
  .clearc {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 16px;
    padding: 0 4px;
  }
  .clearc:hover {
    color: #e88;
  }
  .custom {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    align-items: center;
  }
  .custom input {
    flex: 1;
    min-width: 0;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 10px;
    color: var(--text);
    font: inherit;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .custom input:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .modeseg {
    display: flex;
  }
  .modeseg button {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    color: var(--text-dim);
    padding: 7px 10px;
    font-size: 12px;
  }
  .modeseg button:first-child {
    border-radius: 8px 0 0 8px;
  }
  .modeseg button:last-child {
    border-radius: 0 8px 8px 0;
    border-left: none;
  }
  .modeseg button.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .applyc {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 600;
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
