<script lang="ts">
  import { costData } from "../lib/expenses.svelte";
  import { eur, fmtDay } from "../lib/format";
  import { outputs, isDesktop } from "../lib/storage";

  const data = $derived(costData());
  let selKiln = $state<string | null>(null);
  const kiln = $derived(data.find((k) => k.kilnId === selKiln) ?? data[0] ?? null);

  let busy = $state(false);
  let note = $state("");
  let lastPath = $state<string | null>(null);

  async function exportXlsx(): Promise<void> {
    if (!isDesktop) return;
    busy = true;
    note = "";
    const snap = JSON.parse(JSON.stringify(data)); // plain, serialisable
    lastPath = await outputs.saveCosts(snap);
    busy = false;
    note = lastPath ? "KilnCosts.xlsx guardado ✓" : "Solo escritorio";
  }
</script>

<div class="wrap">
  <div class="head">
    <div>
      <span class="screen-title">Expenses</span>
      <p class="faint sub">
        Los costes de cada horno, mes a mes — leídos de tus horneadas cerradas. Exporta a
        <code>KilnCosts.xlsx</code> cuando quieras un libro que abrir en tu hoja de cálculo.
      </p>
    </div>
    <div class="actions">
      <button class="xbtn" onclick={exportXlsx} disabled={!isDesktop || busy || data.length === 0}>
        {busy ? "Exportando…" : "Exportar .xlsx"}
      </button>
      {#if lastPath}
        <button class="xbtn ghost" onclick={() => outputs.reveal(lastPath!)}>Ver en Finder</button>
      {/if}
    </div>
  </div>
  {#if note}<span class="note">{note}{!isDesktop ? " — la exportación solo funciona en la app de escritorio." : ""}</span>{/if}

  {#if data.length === 0}
    <div class="empty">
      <p>Aún no hay horneadas cerradas.</p>
      <p class="faint">Cuando cierres una horneada, sus costes aparecerán aquí.</p>
    </div>
  {:else}
    {#if data.length > 1}
      <div class="chips">
        {#each data as k (k.kilnId)}
          <button class="chip" class:on={kiln?.kilnId === k.kilnId} onclick={() => (selKiln = k.kilnId)}>{k.kilnName}</button>
        {/each}
      </div>
    {/if}

    {#if kiln}
      <div class="ktotals">
        <div class="kt"><span class="ktl">Ingresos</span><span class="ktv">{eur(kiln.revenue)}</span></div>
        <div class="kt"><span class="ktl">Costes</span><span class="ktv">{eur(kiln.kilnCosts)}</span></div>
        <div class="kt"><span class="ktl">Bruto</span><span class="ktv">{eur(kiln.grossProfit)}</span></div>
        <div class="kt strong"><span class="ktl">Neto acumulado</span><span class="ktv">{eur(kiln.net)}</span></div>
      </div>

      <div class="months">
        {#each kiln.months as m (m.key)}
          <section class="month">
            <div class="mhead">
              <span class="mlabel">{m.label}</span>
              <span class="mnet">{eur(m.net)}<span class="mnetl"> neto</span></span>
            </div>

            <div class="table">
              <div class="tr th">
                <span>Horneada</span>
                <span class="r">Ingresos</span>
                <span class="r">Coste</span>
                <span class="r">Bruto</span>
                <span class="r">Neto</span>
              </div>
              {#each m.firings as f (f.id)}
                <div class="tr">
                  <span class="cel">
                    <span class="ft">{f.title}</span>
                    <span class="fm">{fmtDay(f.at)}{f.clients.length ? " · " + f.clients.join(", ") : ""}</span>
                  </span>
                  <span class="r">{eur(f.revenue)}</span>
                  <span class="r dim">{eur(f.kilnCosts)}</span>
                  <span class="r">{eur(f.grossProfit)}</span>
                  <span class="r net">{eur(f.net)}</span>
                </div>
              {/each}
              <div class="tr total">
                <span>Total del mes</span>
                <span class="r">{eur(m.revenue)}</span>
                <span class="r dim">{eur(m.kilnCosts)}</span>
                <span class="r">{eur(m.grossProfit)}</span>
                <span class="r net">{eur(m.net)}</span>
              </div>
            </div>

            {#if m.partnerDebt.length}
              <div class="debt">
                <span class="dl">Debes este mes</span>
                {#each m.partnerDebt as p (p.name)}
                  <span class="dchip">{p.name} <b>{eur(p.amount)}</b></span>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .wrap {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-shrink: 0;
  }
  .screen-title {
    font-size: 18px;
    font-weight: 600;
  }
  .sub {
    font-size: 13px;
    margin: 4px 0 0;
    max-width: 60ch;
    line-height: 1.55;
  }
  .sub code {
    font-size: 12px;
    background: var(--panel-2);
    border-radius: 5px;
    padding: 1px 5px;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .xbtn {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: 9px;
    padding: 9px 15px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .xbtn:disabled {
    opacity: 0.4;
  }
  .xbtn.ghost {
    background: var(--panel-2);
    color: var(--text-dim);
    border: 1px solid var(--line);
    font-weight: 500;
  }
  .note {
    font-size: 12px;
    color: var(--text-dim);
  }
  .empty {
    margin: auto;
    text-align: center;
    color: var(--text-dim);
  }
  .empty p {
    margin: 4px 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex-shrink: 0;
  }
  .chip {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 6px 14px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .chip.on {
    background: var(--text);
    color: var(--bg);
    border-color: var(--text);
  }
  .ktotals {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    flex-shrink: 0;
  }
  .kt {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kt.strong {
    border-color: var(--text-faint);
  }
  .ktl {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .ktv {
    font-size: 19px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .months {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 4px;
  }
  .month {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 14px;
    padding: 14px 16px;
  }
  .mhead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .mlabel {
    font-size: 15px;
    font-weight: 600;
  }
  .mnet {
    font-size: 16px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .mnetl {
    font-size: 11px;
    color: var(--text-faint);
    font-weight: 400;
  }
  .table {
    display: flex;
    flex-direction: column;
  }
  .tr {
    display: grid;
    grid-template-columns: 1fr 96px 96px 96px 96px;
    align-items: center;
    gap: 8px;
    padding: 9px 2px;
    border-bottom: 1px solid var(--line-soft);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .tr.th {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    border-bottom: 1px solid var(--line);
  }
  .tr.total {
    border-bottom: none;
    border-top: 1.5px solid var(--text-faint);
    font-weight: 600;
    margin-top: 2px;
  }
  .r {
    text-align: right;
  }
  .r.dim {
    color: var(--text-dim);
  }
  .r.net {
    font-weight: 600;
  }
  .cel {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .ft {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fm {
    font-size: 11.5px;
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .debt {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--line-soft);
  }
  .dl {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .dchip {
    font-size: 12.5px;
    color: var(--text-dim);
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 4px 11px;
    font-variant-numeric: tabular-nums;
  }
  .dchip b {
    color: var(--text);
  }
</style>
