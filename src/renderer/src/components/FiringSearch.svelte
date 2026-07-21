<script lang="ts">
  /**
   * Firing-log search: months as folders by default, a single search box that
   * narrows across title, kiln, location, client and date at once. Built for
   * the day there are 500 firings, not 20.
   */
  import { fly, fade } from "svelte/transition";
  import { app, closedFirings, coreFiringFrom, type FiringRecord } from "../lib/firing.svelte";
  import { kilnStore } from "../lib/kilns.svelte";
  import { groupByMonth, searchFirings } from "../lib/firinglog";
  import { computeFiring, roundUp50 } from "@core";
  import { t } from "../lib/i18n.svelte";
  import { eur, fmtFull } from "../lib/format";
  import KilnThumb from "./KilnThumb.svelte";

  let { onclose }: { onclose: () => void } = $props();

  let query = $state("");

  const kilnOf = (rec: FiringRecord) => kilnStore.list.find((k) => k.id === rec.planner.kilnId) ?? kilnStore.list[0]!;
  const kilnNameOf = (r: FiringRecord): string => kilnOf(r)?.name ?? "";
  const kilnLocOf = (r: FiringRecord): string => kilnOf(r)?.location ?? "";

  const all = $derived(closedFirings());
  const results = $derived(searchFirings(all, query, kilnNameOf, kilnLocOf));
  const groups = $derived(groupByMonth(results));

  function summary(rec: FiringRecord): { clients: number; rounded: number } {
    try {
      const r = computeFiring(coreFiringFrom(rec.planner));
      return {
        clients: r.clients.length,
        rounded: r.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0),
      };
    } catch {
      // A malformed/legacy record must never blank the panel.
      return { clients: 0, rounded: 0 };
    }
  }

  function open(id: string): void {
    app.outputsFor = id;
    onclose();
  }
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="center">
  <div class="panel" role="dialog" aria-label={t.home.searchLog} transition:fly={{ y: 14, duration: 200 }}>
    <div class="head">
      <h3>{t.home.searchLog}</h3>
      <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
    </div>

    <!-- svelte-ignore a11y_autofocus -->
    <input class="q" bind:value={query} autofocus placeholder={t.home.searchPlaceholder} />
    <p class="faint hint">{query.trim() ? t.home.searchResults(results.length) : t.home.searchAll(all.length)}</p>

    <div class="scroll">
      {#each groups as g (g.key)}
        <div class="monthsep"><span>{g.label}</span><span class="mcount">{g.rows.length}</span></div>
        {#each g.rows as rec (rec.id)}
          {@const k = kilnOf(rec)}
          {@const s = summary(rec)}
          <button class="row" onclick={() => open(rec.id)}>
            <KilnThumb shape={k.shape} size={28} />
            <span class="info">
              <span class="rtitle">{rec.title || k.name}</span>
              <span class="faint rmeta">
                {fmtFull(rec.closedAt ?? rec.createdAt)} · {k.name}{k.location ? ` · ${k.location}` : ""}
              </span>
            </span>
            <span class="amt">{eur(s.rounded)}</span>
          </button>
        {/each}
      {/each}
      {#if results.length === 0}
        <p class="faint none">{t.home.searchNone}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0, 0, 0, 0.55);
    border: none;
    cursor: default;
  }
  .center {
    position: fixed;
    inset: 0;
    z-index: 71;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .panel {
    pointer-events: auto;
    width: min(680px, calc(100vw - 48px));
    max-height: min(78vh, 760px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 20px 22px 22px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h3 {
    font-size: 17px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
  }
  .x:hover {
    color: var(--text);
  }
  .q {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 11px 14px;
    color: var(--text);
    font: inherit;
    font-size: 15px;
  }
  .q:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .hint {
    font-size: 11.5px;
    margin: -4px 0 0;
  }
  .scroll {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    margin-top: 4px;
  }
  .monthsep {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 2px 5px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 3px;
  }
  .mcount {
    font-variant-numeric: tabular-nums;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 11px;
    background: none;
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 8px 9px;
    text-align: left;
    color: inherit;
  }
  .row:hover {
    background: var(--panel-2);
    border-color: var(--line-soft);
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .rtitle {
    font-size: 13.5px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .rmeta {
    font-size: 11.5px;
  }
  .amt {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .none {
    text-align: center;
    padding: 26px 10px;
    font-size: 13px;
  }
</style>
