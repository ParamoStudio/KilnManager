<script lang="ts">
  import { computeFiring, roundUp50 } from "@core";
  import {
    app,
    go,
    currentFirings,
    closedFirings,
    coreFiringFrom,
    newFiring,
    openFiring,
    deleteFiring,
    type FiringRecord,
  } from "../lib/firing.svelte";
  import { kilnStore } from "../lib/kilns.svelte";
  import { fuelDefFor } from "../lib/settings.svelte";
  import { monthlyData } from "../lib/expenses.svelte";
  import { t, localeTag } from "../lib/i18n.svelte";
  import { eur, fmtDay, fmtFull } from "../lib/format";
  import KilnThumb from "../components/KilnThumb.svelte";
  import FuelPricePanel from "../components/FuelPricePanel.svelte";
  import FiringSearch from "../components/FiringSearch.svelte";
  import { groupByMonth } from "../lib/firinglog";

  const current = $derived(currentFirings());
  const closed = $derived(closedFirings());

  // Month review — a simple running summary of the current month for the log.
  const nowMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const review = $derived(monthlyData().find((m) => m.key === nowMonthKey) ?? null);
  const monthName = $derived.by(() => {
    const s = new Date().toLocaleDateString(localeTag(), { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  const daysLeft = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
  })();
  const monthFirings = $derived(review ? review.kilns.reduce((s, k) => s + k.firings.length, 0) : 0);

  let picking = $state(false);
  let confirmDelete = $state<string | null>(null);
  let searching = $state(false);

  /** The log shows only the newest few; the search panel is the way into the
   * rest, which is where years of firings actually live. */
  const LOG_LIMIT = 20;
  const recentLog = $derived.by(() => groupByMonth(closed.slice(0, LOG_LIMIT)));

  const kilnOf = (rec: FiringRecord) => kilnStore.list.find((k) => k.id === rec.planner.kilnId) ?? kilnStore.list[0]!;
  const energyLabel = (k: (typeof kilnStore.list)[number]): string =>
    k.energy === "gas" ? (k.gasType === "butane" ? t.kilnProfiles.gasButane : t.kilnProfiles.gasPropane) : fuelDefFor(k).label;
  // `rounded` is what clients actually pay (each charged amount rounded up to the
  // next 0.50); `real` is the exact figure kept for the record.
  function summary(rec: FiringRecord): { clients: number; rounded: number; real: number } {
    try {
      const r = computeFiring(coreFiringFrom(rec.planner));
      const rounded = r.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0);
      return { clients: r.clients.length, rounded, real: r.accounting.revenue };
    } catch {
      // A malformed/legacy record must never blank the whole screen.
      return { clients: 0, rounded: 0, real: 0 };
    }
  }
  const fmt = fmtDay;

  function startNew(): void {
    if (kilnStore.list.length === 0) app.firstKilnOpen = true;
    else if (kilnStore.list.length === 1) newFiring(kilnStore.list[0]!.id);
    else picking = true;
  }
</script>

<div class="home">
  <!-- Current firings -->
  <section class="col panel">
    <span class="col-title">{t.home.currentFirings}</span>
    <div class="list">
      {#if current.length === 0}
        <p class="faint empty">{t.home.noFiringsInProgress}</p>
      {/if}
      {#each current as rec (rec.id)}
        {@const k = kilnOf(rec)}
        {@const s = summary(rec)}
        {@const titled = rec.title.trim()}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="card" role="button" tabindex="0" onclick={() => openFiring(rec.id)}>
          <div class="thumb"><KilnThumb shape={k.shape} /></div>
          <div class="info">
            <!-- The title gets a header row of its own: it always fits, wrapping
                 if it must. Everything else lines up underneath. -->
            <div class="ftitle">
              <span class="ft-text">{titled || fmtFull(rec.createdAt)}</span>
              {#if rec.source === "phone"}
                <span class="phonebadge" title={t.phone.fromPhone} aria-label={t.phone.fromPhone}>
                  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                    <rect x="7" y="2.5" width="10" height="19" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.8" />
                    <line x1="10.6" y1="5.6" x2="13.4" y2="5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
              {/if}
              <span class="pending">{t.home.pending}</span>
            </div>
            <div class="title">{k.name} <span class="energy">· {energyLabel(k)}</span></div>
            {#if k.location}<div class="faint loc">{k.location}</div>{/if}
            <div class="faint meta">
              {#if titled}{fmtFull(rec.createdAt)} · {/if}{t.home.clients(s.clients)} · {eur(s.rounded)}
            </div>
          </div>
          <button
            class="del"
            class:armed={confirmDelete === rec.id}
            aria-label={t.home.deleteFiring}
            title={confirmDelete === rec.id ? t.home.clickAgainToDelete : t.home.deleteFiring}
            onclick={(e) => { e.stopPropagation(); if (confirmDelete === rec.id) { deleteFiring(rec.id); confirmDelete = null; } else confirmDelete = rec.id; }}
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  </section>

  <!-- New firing -->
  <section class="col newcol">
    <div class="newmid panel">
      {#if !picking}
        <button class="new-firing" onclick={startNew}>
          <span class="plus">+</span>
          <span>{t.home.startNewFiring}</span>
        </button>
      {:else}
        <div class="picker">
          <span class="col-title center-t">{t.home.chooseAKiln}</span>
          <div class="kilns">
            {#each kilnStore.list as k (k.id)}
              <button class="kiln-card" onclick={() => newFiring(k.id)}>
                <KilnThumb shape={k.shape} size={54} />
                <span class="kn">{k.name}</span>
                <span class="faint kd">{k.shape === "cylinder" ? `${k.diameterCm} cm Ø` : `${k.widthCm}×${k.depthCm} cm`} · {k.usableHeightCm} cm · {energyLabel(k)}</span>
              </button>
            {/each}
          </div>
          <button class="cancel" onclick={() => (picking = false)}>{t.home.cancel}</button>
        </div>
      {/if}
    </div>
    <FuelPricePanel />
  </section>

  <!-- Firing log -->
  <section class="col panel">
    <div class="log-head">
      <span class="col-title">{t.home.firingLog}</span>
      <button class="searchbtn" onclick={() => (searching = true)} disabled={closed.length === 0}>
        {t.home.searchLog}
      </button>
    </div>

    <div class="list">
      {#if closed.length === 0}
        <p class="faint empty">{t.home.closedFiringsWillAppear}</p>
      {/if}
      <!-- Most recent only; months keep it scannable, the search panel handles
           the years' worth that build up behind it. -->
      {#each recentLog as group (group.key)}
        <div class="monthsep"><span>{group.label}</span></div>
        {#each group.rows as rec (rec.id)}
          {@const k = kilnOf(rec)}
          {@const s = summary(rec)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="log-row" role="button" tabindex="0" onclick={() => (app.outputsFor = rec.id)}>
            <KilnThumb shape={k.shape} size={30} />
            <div class="info">
              <div class="kiln">{rec.title || k.name}</div>
              {#if k.location}<div class="faint loc">{k.location}</div>{/if}
              <div class="faint meta">{fmt(rec.closedAt ?? rec.createdAt)} · {s.clients} · {eur(s.rounded)} <span class="real">({eur(s.real)})</span></div>
            </div>
          </div>
        {/each}
      {/each}
      {#if closed.length > LOG_LIMIT}
        <button class="more" onclick={() => (searching = true)}>{t.home.logMore(closed.length - LOG_LIMIT)}</button>
      {/if}
    </div>

    <!-- Month review: running total this month, anchored at the bottom -->
    <button class="review" onclick={() => go("expenses")} title={t.home.viewExpenses}>
      <div class="rv-top">
        <span class="rv-month">{monthName}</span>
        <span class="rv-days">{t.home.monthDaysLeft(daysLeft)}</span>
      </div>
      <div class="rv-net">{eur(review?.net ?? 0)}<span class="rv-netl"> {t.home.monthNet}</span></div>
      <div class="rv-stats">
        <span>{t.home.monthFirings(monthFirings)}</span>
        <span class="dot">·</span>
        <span>{eur(review?.revenue ?? 0)} {t.home.monthBilled}</span>
      </div>
    </button>
  </section>
</div>

{#if searching}
  <FiringSearch onclose={() => (searching = false)} />
{/if}

<style>
  .log-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .searchbtn {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 5px 11px;
    color: var(--text-dim);
    font-size: 11.5px;
  }
  .searchbtn:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .searchbtn:disabled {
    opacity: 0.35;
  }
  /* Month separators keep the log scannable as it grows. */
  .monthsep {
    display: flex;
    align-items: center;
    padding: 12px 2px 5px;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 4px;
  }
  .monthsep:first-child {
    padding-top: 2px;
  }
  .more {
    margin-top: 10px;
    background: none;
    border: 1px dashed var(--line);
    border-radius: 9px;
    padding: 9px;
    color: var(--text-faint);
    font-size: 12px;
  }
  .more:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }
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
    font-size: 12.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text);
    font-weight: 600;
    text-align: center;
  }
  .review {
    margin-top: auto; /* anchored at the bottom of the log column */
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 13px 15px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s;
  }
  .review:hover {
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .rv-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .rv-month {
    font-size: 13px;
    font-weight: 600;
  }
  .rv-days {
    font-size: 11px;
    color: var(--text-faint);
  }
  .rv-net {
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .rv-netl {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-faint);
  }
  .rv-stats {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .rv-stats .dot {
    color: var(--text-faint);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-height: 0;
    flex: 1;
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
  /* Header: the full title plus its status chips, wrapping as one block. The
     title is never clipped and nothing gets squeezed against the chips. */
  .ftitle {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .ft-text {
    font-weight: 600;
    font-size: 14.5px;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  .pending {
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid color-mix(in srgb, var(--amber) 40%, var(--line));
    border-radius: 999px;
    padding: 2px 7px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  /* Compact blue phone glyph — the text label ate too much of the card. */
  .phonebadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: var(--blue, #8ab6f0);
    border: 1px solid color-mix(in srgb, var(--blue, #8ab6f0) 45%, var(--line));
    border-radius: 999px;
  }
  .title {
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 2px;
  }
  .loc {
    font-size: 11.5px;
    margin-bottom: 1px;
  }
  .loc::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 10px;
    margin-right: 4px;
    vertical-align: -1px;
    background-color: currentColor;
    opacity: 0.7;
    -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M8%201C5.24%201%203%203.24%203%206c0%203.5%205%208.5%205%208.5s5-5%205-8.5c0-2.76-2.24-5-5-5zm0%206.75A1.75%201.75%200%201%201%208%204.25a1.75%201.75%200%200%201%200%203.5z'/%3E%3C/svg%3E")
      no-repeat center / contain;
    mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M8%201C5.24%201%203%203.24%203%206c0%203.5%205%208.5%205%208.5s5-5%205-8.5c0-2.76-2.24-5-5-5zm0%206.75A1.75%201.75%200%201%201%208%204.25a1.75%201.75%200%200%201%200%203.5z'/%3E%3C/svg%3E")
      no-repeat center / contain;
  }
  .meta {
    font-size: 12px;
  }
  .del {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: none;
    border: none;
    border-radius: 999px;
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
    transition:
      transform 0.12s,
      background 0.12s,
      color 0.12s;
  }
  .del:hover {
    color: #ff6b6b;
  }
  /* Armed = the × grows into a red circular pill, cueing the confirming
     second click without a colliding "Sure?" label. */
  .del.armed {
    color: #ff4d4d;
    background: rgba(255, 77, 77, 0.16);
    transform: scale(1.22);
  }

  .newcol {
    align-items: center;
    gap: 14px;
  }
  .newmid {
    flex: 1;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
  .energy {
    color: var(--text-faint);
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
