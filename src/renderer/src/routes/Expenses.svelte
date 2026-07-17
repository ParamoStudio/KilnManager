<script lang="ts">
  import { monthlyData } from "../lib/expenses.svelte";
  import { setPaid } from "../lib/payments.svelte";
  import { eur, fmtDay } from "../lib/format";
  import { outputs, isDesktop } from "../lib/storage";

  const months = $derived(monthlyData());
  let selKey = $state<string | null>(null);
  const month = $derived(months.find((m) => m.key === selKey) ?? months[0] ?? null);

  // Persist the workbooks whenever they might have changed (desktop only).
  function syncWorkbooks(): void {
    if (isDesktop) void outputs.saveCosts(JSON.parse(JSON.stringify(months)));
  }

  function togglePaid(partnerId: string, paid: boolean): void {
    if (!month) return;
    setPaid(month.key, partnerId, paid);
    syncWorkbooks();
  }

  async function reveal(): Promise<void> {
    if (!isDesktop) return;
    syncWorkbooks();
    await outputs.openExpenses();
  }
</script>

<div class="wrap">
  <div class="head">
    <div>
      <span class="screen-title">Expenses</span>
      <p class="faint sub">
        Los costes de cada horno, mes a mes — leídos de tus horneadas cerradas. Cada mes se guarda
        como su propio <code>.xlsx</code> en la carpeta <code>Expenses Log</code>, actualizándose en
        cada horneada.
      </p>
    </div>
    <button class="xbtn" onclick={reveal} disabled={!isDesktop || months.length === 0}>Ver en Finder</button>
  </div>

  {#if months.length === 0}
    <div class="empty">
      <p>Aún no hay horneadas cerradas.</p>
      <p class="faint">Cuando cierres una horneada, sus costes aparecerán aquí.</p>
    </div>
  {:else}
    <div class="cols">
      <!-- Month sidebar -->
      <aside class="rail">
        {#each months as m (m.key)}
          <button class="mtab" class:on={month?.key === m.key} onclick={() => (selKey = m.key)}>
            <span class="mtl">{m.label}</span>
            <span class="mtn">{eur(m.net)}</span>
          </button>
        {/each}
      </aside>

      {#if month}
        <div class="body">
          <div class="ktotals">
            <div class="kt"><span class="ktl">Ingresos</span><span class="ktv">{eur(month.revenue)}</span></div>
            <div class="kt"><span class="ktl">Costes</span><span class="ktv">{eur(month.kilnCosts)}</span></div>
            <div class="kt"><span class="ktl">Bruto</span><span class="ktv">{eur(month.grossProfit)}</span></div>
            <div class="kt strong"><span class="ktl">Neto</span><span class="ktv">{eur(month.net)}</span></div>
          </div>

          <!-- Partner debt — prominent -->
          {#if month.partners.length}
            <section class="partners">
              <span class="secl">Debes este mes</span>
              <div class="pgrid">
                {#each month.partners as p (p.partnerId)}
                  <div class="pcard" class:paid={p.paid}>
                    <div class="phead">
                      <span class="pname">{p.name}</span>
                      <span class="ptot">{eur(p.total)}</span>
                    </div>
                    {#if p.tiers.length}
                      <div class="ptiers">
                        {#each p.tiers as t (t.tierId)}
                          <div class="ptier"><span>{t.tier || "—"}</span><span class="pt-amt">{eur(t.amount)}</span></div>
                        {/each}
                      </div>
                    {/if}
                    <label class="paid-toggle">
                      <input type="checkbox" checked={p.paid} onchange={(e) => togglePaid(p.partnerId, e.currentTarget.checked)} />
                      <span class="ptxt">{p.paid ? "Pagado" : "Pendiente"}</span>
                    </label>
                  </div>
                {/each}
              </div>
            </section>
          {/if}

          <!-- Per-kiln firing tables -->
          <div class="kilns">
            {#each month.kilns as k (k.kilnId)}
              <section class="kiln">
                <div class="khead">
                  <span class="kname">{k.kilnName}</span>
                  <span class="knet">{eur(k.net)}<span class="knetl"> neto</span></span>
                </div>
                <div class="table">
                  <div class="tr th">
                    <span>Horneada</span>
                    <span class="r">Ingresos</span>
                    <span class="r">Coste</span>
                    <span class="r">Bruto</span>
                    <span class="r">Neto</span>
                  </div>
                  {#each k.firings as f (f.id)}
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
                    <span class="r">{eur(k.revenue)}</span>
                    <span class="r dim">{eur(k.kilnCosts)}</span>
                    <span class="r">{eur(k.grossProfit)}</span>
                    <span class="r net">{eur(k.net)}</span>
                  </div>
                </div>
              </section>
            {/each}
          </div>
        </div>
      {/if}
    </div>
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
    max-width: 66ch;
    line-height: 1.55;
  }
  .sub code {
    font-size: 12px;
    background: var(--panel-2);
    border-radius: 5px;
    padding: 1px 5px;
  }
  .xbtn {
    background: var(--panel-2);
    color: var(--text-dim);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 9px 15px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .xbtn:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .xbtn:disabled {
    opacity: 0.4;
  }
  .empty {
    margin: auto;
    text-align: center;
    color: var(--text-dim);
  }
  .empty p {
    margin: 4px 0;
  }
  .cols {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 20px;
    min-height: 0;
    flex: 1;
  }
  /* Month sidebar */
  .rail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    min-height: 0;
    border-right: 1px solid var(--line-soft);
    padding-right: 12px;
  }
  .mtab {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 9px 12px;
    color: var(--text-dim);
  }
  .mtab:hover {
    background: var(--panel);
  }
  .mtab.on {
    background: var(--panel);
    border-color: var(--line);
    color: var(--text);
  }
  .mtl {
    font-size: 13.5px;
    font-weight: 600;
  }
  .mtn {
    font-size: 12px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .mtab.on .mtn {
    color: var(--text-dim);
  }
  /* Body */
  .body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 4px;
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
    padding: 11px 14px;
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
    font-size: 18px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .secl {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .partners {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }
  .pcard {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pcard.paid {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    background: color-mix(in srgb, var(--accent) 6%, var(--panel));
  }
  .phead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .pname {
    font-size: 15px;
    font-weight: 600;
  }
  .ptot {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .ptiers {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--line-soft);
  }
  .ptier {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .pt-amt {
    color: var(--text);
  }
  .paid-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin-top: 2px;
  }
  .paid-toggle input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }
  .ptxt {
    font-size: 13px;
    color: var(--text-dim);
    font-weight: 500;
  }
  .pcard.paid .ptxt {
    color: var(--accent);
  }
  .kilns {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .kiln {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 14px;
    padding: 14px 16px;
  }
  .khead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .kname {
    font-size: 15px;
    font-weight: 600;
  }
  .knet {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .knetl {
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
    grid-template-columns: 1fr 92px 92px 92px 92px;
    align-items: center;
    gap: 8px;
    padding: 8px 2px;
    border-bottom: 1px solid var(--line-soft);
    font-size: 13.5px;
    font-variant-numeric: tabular-nums;
  }
  .tr.th {
    font-size: 10.5px;
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
</style>
