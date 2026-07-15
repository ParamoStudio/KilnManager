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
  const recent = $derived(settings.priceHistory.slice(0, 3));
</script>

<div class="fuel">
  <div class="fhead">
    <span class="ftitle">Fuel this week</span>
    <span class="faint fsub">updates every kiln on that fuel</span>
  </div>

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

  {#if recent.length}
    <div class="hist">
      {#each recent as h (h.id)}
        <span class="hitem">{settings.fuels[h.fuel].label} {eur(h.price)} · {fmtDay(h.at)}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .fuel {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 14px 15px;
  }
  .fhead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .ftitle {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .fsub {
    font-size: 10.5px;
  }
  .frow {
    display: flex;
    flex-direction: column;
    gap: 6px;
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
  .fin button {
    background: var(--panel-2);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 7px 13px;
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
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid var(--line-soft);
  }
  .hitem {
    font-size: 10.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
</style>
