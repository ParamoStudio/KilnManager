<script lang="ts">
  import { onMount } from "svelte";
  import type { FuelKind } from "@core";
  import { kilnStore } from "../lib/kilns.svelte";
  import { settings, recordFuelPrice, fuelKeyForKiln, BIDDING_ZONES, setBiddingZone } from "../lib/settings.svelte";
  import { market, isDesktop, type ElectricityRef, type PropaneRef } from "../lib/storage";
  import { eur, num, fmtDay } from "../lib/format";

  // Only the fuels the studio actually burns (across its kilns).
  const usedFuels = $derived([...new Set(kilnStore.list.map((k) => fuelKeyForKiln(k)))] as FuelKind[]);
  const usesElectricity = $derived(usedFuels.includes("electricity"));
  const gasFuels = $derived(usedFuels.filter((f) => f === "propane" || f === "butane"));

  let draft = $state<Record<string, string>>({});

  function apply(fuel: FuelKind): void {
    const v = parseFloat(draft[fuel] ?? "");
    if (!Number.isNaN(v) && v >= 0) recordFuelPrice(fuel, v);
    draft[fuel] = "";
  }

  const recent = $derived(settings.priceHistory.slice(0, 4));

  // Live electricity reference (wholesale day-ahead) for the chosen zone.
  let elec = $state<ElectricityRef | { ok: false } | null>(null);
  let loadingElec = $state(false);
  async function loadElec(): Promise<void> {
    if (!isDesktop) {
      elec = { ok: false };
      return;
    }
    loadingElec = true;
    elec = await market.electricity(settings.biddingZone);
    loadingElec = false;
  }
  function onZone(e: Event): void {
    setBiddingZone((e.currentTarget as HTMLSelectElement).value);
    void loadElec();
    void loadGasRef();
  }
  const fmtAsOf = (unix: number): string =>
    new Date(unix * 1000).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // Typical bottle estimates from the user's own €/kg (price per bottle ÷ kg).
  const BOTTLES = [11, 35];
  const perKg = (fk: FuelKind): number => {
    const f = settings.fuels[fk];
    return f.bottleKg && f.bottleKg > 0 ? f.price / f.bottleKg : 0;
  };

  // Propane/butane market reference (maintained, dated — not a live fetch).
  let gasRef = $state<PropaneRef | { ok: false } | null>(null);
  const refFor = (fk: FuelKind): number | undefined =>
    gasRef && gasRef.ok ? (fk === "butane" ? gasRef.butaneKg : gasRef.propaneKg) : undefined;
  async function loadGasRef(): Promise<void> {
    gasRef = isDesktop ? await market.propane(settings.biddingZone.slice(0, 2)) : { ok: false };
  }

  onMount(() => {
    void loadElec();
    void loadGasRef();
  });
</script>

<div class="fuel">
  <div class="fhead">
    <span class="ftitle">Fuel control</span>
  </div>

  <div class="fcols">
    <!-- Left: log what you last paid -->
    <section class="fcol">
      <span class="csub">Log what you last paid — updates every kiln on that fuel</span>
      <div class="rows">
        {#each usedFuels as fk (fk)}
          {@const f = settings.fuels[fk]}
          <div class="frow">
            <div class="fmeta">
              <span class="fname">{f.label}</span>
              <span class="fnow">{eur(f.price)}<span class="funit">/{f.unit}</span></span>
            </div>
            <div class="fin">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="just paid…"
                bind:value={draft[fk]}
                onkeydown={(e) => { if (e.key === "Enter") apply(fk); }}
              />
              <button onclick={() => apply(fk)} disabled={!draft[fk]}>Save</button>
            </div>
          </div>
        {/each}
      </div>
      {#if recent.length}
        <div class="hist">
          {#each recent as h (h.id)}
            <span class="hitem">{settings.fuels[h.fuel].label} {eur(h.price)} · {fmtDay(h.at)}</span>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Right: live market reference (context only — not what you actually pay) -->
    <section class="fcol market">
      <div class="mkhead">
        <span class="csub">Market reference · live</span>
        {#if usesElectricity}
          <button class="refresh" onclick={loadElec} disabled={loadingElec} title="Refresh">↻</button>
        {/if}
      </div>

      {#if usesElectricity}
        <div class="mkblock">
          <div class="mkrow">
            <span class="mkname">Electricity · wholesale</span>
            <select class="zonesel" value={settings.biddingZone} onchange={onZone}>
              {#each BIDDING_ZONES as z (z.code)}<option value={z.code}>{z.label}</option>{/each}
            </select>
          </div>
          {#if loadingElec && !elec}
            <span class="faint small">Loading…</span>
          {:else if elec && elec.ok}
            <div class="mkval">{num(elec.currentKwh, 3)} <span class="unit">€/kWh now</span></div>
            <span class="faint small">Day avg {num(elec.avgKwh, 3)} · {fmtAsOf(elec.asOf)} · {elec.source}</span>
            <p class="caveat">Wholesale — retail adds taxes & fees; check your bill.</p>
          {:else}
            <span class="faint small">Reference unavailable right now.</span>
          {/if}
        </div>
      {/if}

      {#if gasFuels.length}
        <div class="mkblock">
          <span class="mkname">Bottle estimate</span>
          {#each gasFuels as fk (fk)}
            {@const k = perKg(fk)}
            {@const ref = refFor(fk)}
            <div class="botrow">
              <span class="botlabel">{settings.fuels[fk].label} · {num(k, 2)} €/kg <span class="yours">(yours)</span></span>
              <span class="botest">
                {#each BOTTLES as kg (kg)}<span class="bot">{kg} kg ≈ {eur(k * kg)}</span>{/each}
              </span>
              {#if ref !== undefined && gasRef && gasRef.ok}
                <span class="refline">Market ref · {gasRef.approx ? "~" : ""}{num(ref, 2)} €/kg · {gasRef.region} {gasRef.asOf}{gasRef.approx ? " · approx" : ""}</span>
              {/if}
            </div>
          {/each}
          <p class="caveat">“Yours” = what you paid. Market ref is orientative — check your supplier.</p>
        </div>
      {/if}

      {#if !usesElectricity && gasFuels.length === 0}
        <p class="faint small">No live references for your fuels (wood prices are local — enter what you pay).</p>
      {/if}
    </section>
  </div>
</div>

<style>
  .fuel {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 15px 16px;
  }
  .fhead {
    display: flex;
    justify-content: center;
  }
  .ftitle {
    font-size: 12.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text);
    font-weight: 600;
    text-align: center;
  }
  .fcols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
  }
  @media (max-width: 900px) {
    .fcols {
      grid-template-columns: 1fr;
    }
  }
  .fcol {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .csub {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .frow {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .fmeta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .fname {
    font-size: 13px;
    font-weight: 600;
  }
  .fnow {
    font-size: 13px;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .funit {
    color: var(--text-faint);
    font-size: 11px;
  }
  .fin {
    display: flex;
    gap: 6px;
  }
  .fin input {
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
  .fin input:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  /* Hide native number spinners for a clean, consistent look. */
  .fin input::-webkit-outer-spin-button,
  .fin input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .fin input {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .fin button {
    background: var(--panel-2);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 7px 14px;
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
  }
  .fin button:hover {
    border-color: var(--accent);
  }
  .fin button:disabled {
    opacity: 0.4;
  }
  .hist {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 9px;
    border-top: 1px solid var(--line-soft);
  }
  .hitem {
    font-size: 10.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .market {
    padding-left: 22px;
    border-left: 1px solid var(--line-soft);
  }
  @media (max-width: 900px) {
    .market {
      padding-left: 0;
      border-left: none;
      padding-top: 12px;
      border-top: 1px solid var(--line-soft);
    }
  }
  .mkhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .refresh {
    background: none;
    border: 1px solid var(--line);
    border-radius: 7px;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1;
    padding: 3px 8px;
  }
  .refresh:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .refresh:disabled {
    opacity: 0.4;
  }
  .mkblock {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 8px;
  }
  .mkblock + .mkblock {
    border-top: 1px solid var(--line-soft);
    margin-top: 4px;
  }
  .mkrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .mkname {
    font-size: 13px;
    font-weight: 600;
  }
  .zonesel {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 7px;
    color: var(--text-dim);
    font: inherit;
    font-size: 11.5px;
    padding: 3px 6px;
    width: 118px;
    max-width: 45%;
  }
  .mkval {
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-faint);
  }
  .small {
    font-size: 11px;
  }
  .caveat {
    margin: 4px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-dim);
  }
  .botrow {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 2px;
  }
  .botlabel {
    font-size: 12.5px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .botest {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .bot {
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .yours {
    color: var(--text-faint);
    font-weight: 400;
  }
  .refline {
    font-size: 11.5px;
    color: var(--amber);
    font-variant-numeric: tabular-nums;
    margin-top: 1px;
  }
</style>
