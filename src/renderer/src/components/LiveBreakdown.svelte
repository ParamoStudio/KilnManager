<script lang="ts">
  import type { FiringResult } from "@core";
  import { clientNames } from "../lib/firing.svelte";
  import { colorForName } from "../lib/colors";
  import { eur, pct, num } from "../lib/format";

  let { result } = $props<{ result: FiringResult }>();
  const names = $derived(clientNames());
  const acc = $derived(result.accounting);
</script>

<div class="panel breakdown">
  <span class="label">Client breakdown</span>
  {#if result.clients.length === 0}
    <p class="faint empty">Assign clients to shelves to see the split.</p>
  {:else}
    <table>
      <thead>
        <tr><th>Client</th><th class="r">KLU</th><th class="r">% of total</th><th class="r">Amount</th></tr>
      </thead>
      <tbody>
        {#each result.clients as c (c.contactName)}
          <tr>
            <td><span class="dot" style="--dot: {colorForName(c.contactName, names)}"></span>{c.contactName}</td>
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
  {/if}
</div>

<div class="panel ledger">
  <span class="label">Studio log · internal</span>
  <div class="row"><span class="muted">Revenue</span><span>{eur(acc.revenue)}</span></div>
  <div class="row"><span class="muted">Kiln costs</span><span>−{eur(acc.kilnCosts)}</span></div>
  <div class="row"><span class="muted">Gross profit</span><span>{eur(acc.grossProfit)}</span></div>
  {#each acc.partnerCuts as p (p.name)}
    <div class="row"><span class="muted">{p.name} ({pct(p.pct)})</span><span>−{eur(p.amount)}</span></div>
  {/each}
  <div class="divider"></div>
  <div class="row total"><span>Net to you</span><span>{eur(acc.netToYou)}</span></div>
</div>

<style>
  .panel {
    padding: 20px;
  }
  .empty {
    font-size: 13px;
    margin: 16px 0 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
  }
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
  .r {
    text-align: right;
  }
  tfoot td {
    font-weight: 600;
    border-top: 1px solid var(--line);
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot, var(--text-faint));
    margin-right: 9px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-variant-numeric: tabular-nums;
  }
  .row.total {
    font-weight: 600;
    font-size: 15px;
  }
  .divider {
    height: 1px;
    background: var(--line-soft);
    margin: 8px 0;
  }
</style>
