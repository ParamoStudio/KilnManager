<script lang="ts">
  import { computeFiring, consumedHeightCm } from "@core";
  import { demoFiring, clientColors } from "../lib/demo";
  import { eur, pct, num } from "../lib/format";

  const firing = demoFiring;
  const result = computeFiring(firing);

  const usableH = firing.kiln.usableHeightCm;
  const consumed = firing.levels.map(consumedHeightCm);
  const totalConsumed = consumed.reduce((a, b) => a + b, 0);
  const remaining = Math.max(0, usableH - totalConsumed);

  const colorFor = (name: string) => {
    const i = result.clients.findIndex((c) => c.contactName === name);
    return clientColors[i % clientColors.length];
  };

  const acc = result.accounting;
</script>

<div class="planner">
  <!-- Kiln column -->
  <section class="panel kiln">
    <div class="kiln-head">
      <span class="label">Usable height</span>
      <span class="kiln-h">{usableH} cm</span>
    </div>

    <div class="stack">
      {#each firing.levels as level, i (i)}
        {@const alloc = level.allocations[0]}
        <div
          class="level"
          style="flex: {consumed[i]}; --dot: {colorFor(alloc?.contactName ?? '')}"
        >
          <div class="level-idx">{String(firing.levels.length - i).padStart(2, "0")}</div>
          <div class="level-body">
            <span class="dot"></span>
            <div>
              <div class="level-client">{alloc?.contactName}</div>
              <div class="faint level-meta">
                {alloc?.notes} · {pct(alloc?.fraction ?? 0)} · {consumed[i]} cm
              </div>
            </div>
          </div>
        </div>
      {/each}
      {#if remaining > 0}
        <div class="level empty" style="flex: {remaining}">
          <div class="faint">{num(remaining, 0)} cm remaining</div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Firing service column -->
  <aside class="panel service">
    <span class="label">Firing service</span>
    <div class="service-name">{firing.serviceName}</div>

    <div class="row"><span class="muted">Base price</span><span>{eur(firing.serviceBasePrice)}</span></div>
    <div class="row"><span class="muted">Modifiers</span><span>{eur(0)}</span></div>
    <div class="divider"></div>
    <div class="row total"><span>Total firing price</span><span>{eur(acc.revenue)}</span></div>

    <div class="note faint">
      Price is distributed among clients based on load units (KLU) and complexity.
    </div>

    <div class="fill">
      <div class="fill-track"><div class="fill-bar" style="width: {result.fillFraction * 100}%"></div></div>
      <span class="faint">{pct(result.fillFraction)} of kiln volume · {num(result.totalKLU)} KLU</span>
    </div>
  </aside>

  <!-- Client breakdown -->
  <section class="panel breakdown">
    <span class="label">Client breakdown</span>
    <table>
      <thead>
        <tr><th>Client</th><th class="r">KLU</th><th class="r">% of total</th><th class="r">Amount</th></tr>
      </thead>
      <tbody>
        {#each result.clients as c (c.contactName)}
          <tr>
            <td><span class="dot" style="--dot: {colorFor(c.contactName)}"></span>{c.contactName}</td>
            <td class="r">{num(c.klu)}</td>
            <td class="r">{pct(c.sharePct)}</td>
            <td class="r">{eur(c.price)}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr><td>Total</td><td class="r">{num(result.totalKLU)}</td><td class="r">100%</td><td class="r">{eur(acc.revenue)}</td></tr>
      </tfoot>
    </table>
  </section>

  <!-- Studio log (internal accounting) -->
  <section class="panel ledger">
    <span class="label">Studio log · internal</span>
    <div class="row"><span class="muted">Revenue</span><span>{eur(acc.revenue)}</span></div>
    <div class="row"><span class="muted">Kiln costs</span><span>−{eur(acc.kilnCosts)}</span></div>
    <div class="row"><span class="muted">Gross profit</span><span>{eur(acc.grossProfit)}</span></div>
    {#each acc.partnerCuts as p (p.name)}
      <div class="row"><span class="muted">{p.name} ({pct(p.pct)})</span><span>−{eur(p.amount)}</span></div>
    {/each}
    <div class="divider"></div>
    <div class="row total"><span>Net to you</span><span>{eur(acc.netToYou)}</span></div>
  </section>
</div>

<div class="demo-note faint">
  Demo data (the agreed worked example). The visual kiln builder arrives in T2 —
  this screen already runs the real calculation engine.
</div>

<style>
  .planner {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    grid-template-areas: "kiln service" "breakdown ledger";
    gap: 16px;
  }
  .kiln { grid-area: kiln; }
  .service { grid-area: service; }
  .breakdown { grid-area: breakdown; }
  .ledger { grid-area: ledger; }
  .panel { padding: 20px; }

  .kiln-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 14px;
  }
  .kiln-h { font-size: 13px; color: var(--text-dim); }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 360px;
    height: 100%;
  }
  .level {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    min-height: 42px;
  }
  .level.empty {
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 8px,
      rgba(255, 255, 255, 0.02) 8px,
      rgba(255, 255, 255, 0.02) 16px
    );
    border-style: dashed;
    align-items: flex-end;
    padding-bottom: 8px;
  }
  .level-idx {
    font-variant-numeric: tabular-nums;
    color: var(--text-faint);
    font-size: 12px;
    width: 22px;
  }
  .level-body { display: flex; align-items: center; gap: 10px; }
  .level-client { font-weight: 500; }
  .level-meta { font-size: 12px; }

  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot, var(--text-faint));
    margin-right: 8px;
    flex-shrink: 0;
  }

  .service-name { font-size: 17px; font-weight: 600; margin: 8px 0 18px; }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-variant-numeric: tabular-nums;
  }
  .row.total { font-weight: 600; font-size: 15px; }
  .divider { height: 1px; background: var(--line-soft); margin: 8px 0; }
  .note { font-size: 12px; margin-top: 14px; line-height: 1.5; }

  .fill { margin-top: 18px; }
  .fill-track {
    height: 6px;
    background: var(--panel-2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .fill-bar {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th {
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
    padding-bottom: 10px;
  }
  td {
    padding: 9px 0;
    border-top: 1px solid var(--line-soft);
    font-variant-numeric: tabular-nums;
  }
  .r { text-align: right; }
  tfoot td { font-weight: 600; border-top: 1px solid var(--line); }

  .demo-note {
    margin: 22px 4px 0;
    font-size: 12px;
    text-align: center;
  }

  @media (max-width: 900px) {
    .planner {
      grid-template-columns: 1fr;
      grid-template-areas: "kiln" "service" "breakdown" "ledger";
    }
  }
</style>
