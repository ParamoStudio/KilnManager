<script lang="ts">
  import type { FuelKind } from "@core";
  import { kilnStore } from "../lib/kilns.svelte";
  import { settings, recordFuelPrice, fuelKeyForKiln } from "../lib/settings.svelte";
  import { eur } from "../lib/format";

  // Only the fuels the studio actually burns (across its kilns).
  const usedFuels = $derived([...new Set(kilnStore.list.map((k) => fuelKeyForKiln(k)))] as FuelKind[]);

  let draft = $state<Record<string, string>>({});

  function apply(fuel: FuelKind): void {
    const v = parseFloat(draft[fuel] ?? "");
    if (!Number.isNaN(v) && v >= 0) recordFuelPrice(fuel, v);
    draft[fuel] = "";
  }

  const fmtDay = (ts: number): string => new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const recent = $derived(settings.priceHistory.slice(0, 4));
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

    <!-- Right: live market reference (arrives with the References module) -->
    <section class="fcol market">
      <span class="csub">Market reference · live</span>
      <div class="soon">
        <span class="soontag">Coming soon</span>
        <p>
          Live raw-material prices (electricity, propane…) will land here as a
          reference next to what you actually paid — with a quick “what would an
          11&nbsp;kg bottle cost today?” calculator.
        </p>
        <p class="faint small">The data source (region / API, with a fallback) will be configurable in App Settings.</p>
      </div>
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
  .soon {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .soontag {
    align-self: flex-start;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid color-mix(in srgb, var(--amber) 40%, var(--line));
    border-radius: 999px;
    padding: 2px 9px;
  }
  .soon p {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: var(--text-dim);
  }
  .soon .small {
    font-size: 11px;
  }
</style>
