<script lang="ts">
  import { computeFiring, roundUp50 } from "@core";
  import {
    currentFirings,
    closedFirings,
    coreFiringFrom,
    newFiring,
    openFiring,
    deleteFiring,
    type FiringRecord,
  } from "../lib/firing.svelte";
  import { kilnStore } from "../lib/kilns.svelte";
  import { eur } from "../lib/format";
  import KilnThumb from "../components/KilnThumb.svelte";
  import LogDetailCard from "../components/LogDetailCard.svelte";

  const current = $derived(currentFirings());
  const closed = $derived(closedFirings());

  let picking = $state(false);
  let confirmDelete = $state<string | null>(null);
  let logId = $state<string | null>(null);

  const kilnOf = (rec: FiringRecord) => kilnStore.list.find((k) => k.id === rec.planner.kilnId) ?? kilnStore.list[0]!;
  // `rounded` is what clients actually pay (each charged amount rounded up to the
  // next 0.50); `real` is the exact figure kept for the record.
  function summary(rec: FiringRecord): { clients: number; rounded: number; real: number } {
    const r = computeFiring(coreFiringFrom(rec.planner));
    const rounded = r.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0);
    return { clients: r.clients.length, rounded, real: r.accounting.revenue };
  }
  const fmt = (ts: number): string => new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const fmtFull = (ts: number): string =>
    new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  function startNew(): void {
    if (kilnStore.list.length === 1) newFiring(kilnStore.list[0]!.id);
    else picking = true;
  }
</script>

<div class="home">
  <!-- Current firings -->
  <section class="col panel">
    <span class="col-title">Current firings</span>
    <div class="list">
      {#if current.length === 0}
        <p class="faint empty">No firings in progress. Start one →</p>
      {/if}
      {#each current as rec (rec.id)}
        {@const k = kilnOf(rec)}
        {@const s = summary(rec)}
        {@const titled = rec.title.trim()}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="card" role="button" tabindex="0" onclick={() => openFiring(rec.id)}>
          <div class="thumb"><KilnThumb shape={k.shape} /></div>
          <div class="info">
            <div class="row1">
              <span class="kiln">{titled || fmtFull(rec.createdAt)}</span>
              <span class="pending">pending</span>
            </div>
            <div class="title">{k.name}</div>
            <div class="faint meta">
              {#if titled}{fmtFull(rec.createdAt)} · {/if}{s.clients} client{s.clients === 1 ? "" : "s"} · {eur(s.rounded)}
            </div>
          </div>
          {#if confirmDelete === rec.id}
            <button class="del confirm" onclick={(e) => { e.stopPropagation(); deleteFiring(rec.id); confirmDelete = null; }}>Delete?</button>
          {:else}
            <button class="del" onclick={(e) => { e.stopPropagation(); confirmDelete = rec.id; }} aria-label="Delete">×</button>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- New firing -->
  <section class="col center panel">
    {#if !picking}
      <button class="new-firing" onclick={startNew}>
        <span class="plus">+</span>
        <span>Start new firing</span>
      </button>
    {:else}
      <div class="picker">
        <span class="col-title center-t">Choose a kiln</span>
        <div class="kilns">
          {#each kilnStore.list as k (k.id)}
            <button class="kiln-card" onclick={() => newFiring(k.id)}>
              <KilnThumb shape={k.shape} size={54} />
              <span class="kn">{k.name}</span>
              <span class="faint kd">{k.shape === "cylinder" ? `${k.diameterCm} cm Ø` : `${k.widthCm}×${k.depthCm} cm`} · {k.usableHeightCm} cm</span>
            </button>
          {/each}
        </div>
        <button class="cancel" onclick={() => (picking = false)}>Cancel</button>
      </div>
    {/if}
  </section>

  <!-- Firing log -->
  <section class="col panel">
    <span class="col-title">Firing log</span>
    <div class="list">
      {#if closed.length === 0}
        <p class="faint empty">Closed firings will appear here.</p>
      {/if}
      {#each closed as rec (rec.id)}
        {@const k = kilnOf(rec)}
        {@const s = summary(rec)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="log-row" role="button" tabindex="0" onclick={() => (logId = rec.id)}>
          <KilnThumb shape={k.shape} size={30} />
          <div class="info">
            <div class="kiln">{rec.title || k.name}</div>
            <div class="faint meta">{fmt(rec.closedAt ?? rec.createdAt)} · {s.clients} · {eur(s.rounded)} <span class="real">({eur(s.real)})</span></div>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

{#if logId}
  <LogDetailCard id={logId} onclose={() => (logId = null)} />
{/if}

<style>
  .home {
    height: 100%;
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    gap: 16px;
    min-height: 0;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }
  /* Each section compartmentalised in its own bordered card. */
  .panel {
    border: 1px solid var(--line);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.014);
    padding: 18px 16px;
  }
  .col-title {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 2px;
  }
  .empty {
    font-size: 13px;
    line-height: 1.5;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 14px;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .card:hover {
    border-color: var(--text-faint);
  }
  .thumb {
    flex-shrink: 0;
  }
  .info {
    flex: 1;
    min-width: 0;
  }
  .row1 {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kiln {
    font-weight: 600;
    font-size: 14px;
  }
  .pending {
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid color-mix(in srgb, var(--amber) 40%, var(--line));
    border-radius: 999px;
    padding: 2px 7px;
  }
  .title {
    font-size: 13px;
    color: var(--text-dim);
    margin: 2px 0;
  }
  .meta {
    font-size: 12px;
  }
  .del {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 18px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  .del:hover {
    color: #e88;
  }
  .del.confirm {
    font-size: 12px;
    color: #e88;
    border: 1px solid #e88;
    border-radius: 7px;
    padding: 4px 8px;
  }

  .center {
    align-items: center;
    justify-content: center;
  }
  .new-firing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--panel);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--line));
    border-radius: 20px;
    padding: 48px 56px;
    color: var(--text);
    font-size: 18px;
    font-weight: 600;
    transition: all 0.18s ease;
  }
  .new-firing:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 7%, var(--panel));
  }
  .plus {
    font-size: 44px;
    font-weight: 300;
    line-height: 1;
    color: var(--accent);
  }
  .picker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .center-t {
    text-align: center;
  }
  .kilns {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .kiln-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 22px 26px;
    color: var(--text);
    transition: border-color 0.15s ease;
  }
  .kiln-card:hover {
    border-color: var(--accent);
  }
  .kn {
    font-weight: 600;
    font-size: 14px;
    margin-top: 4px;
  }
  .kd {
    font-size: 11px;
  }
  .cancel {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 13px;
  }
  .cancel:hover {
    color: var(--text-dim);
  }

  .real {
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .log-row {
    display: flex;
    align-items: center;
    gap: 11px;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 10px 12px;
    cursor: pointer;
  }
  .log-row:hover {
    border-color: var(--text-faint);
  }
</style>
