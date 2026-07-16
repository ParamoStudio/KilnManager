<script lang="ts">
  import { computeFiring, roundUp50 } from "@core";
  import { firings, coreFiringFrom } from "../lib/firing.svelte";
  import { kilnStore } from "../lib/kilns.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur, pct, fmtFull } from "../lib/format";

  let { id, onclose }: { id: string; onclose: () => void } = $props();

  const rec = $derived(firings.list.find((f) => f.id === id));
  const result = $derived(rec ? computeFiring(coreFiringFrom(rec.planner)) : null);
  const kiln = $derived(rec ? (kilnStore.list.find((k) => k.id === rec.planner.kilnId) ?? kilnStore.list[0]!) : null);
  const fmt = (ts?: number): string => (ts ? fmtFull(ts) : "");

  // What is actually collected: each charged amount rounded up to the next 0.50.
  const roundedTotal = $derived(
    result ? result.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0) : 0,
  );
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="card" role="dialog">
  {#if rec && result && kiln}
    <div class="head">
      <div>
        <h3>{rec.title || kiln.name}</h3>
        <span class="faint">{kiln.name} · closed {fmt(rec.closedAt)}</span>
      </div>
      <button class="x" onclick={onclose} aria-label="Close">×</button>
    </div>

    <table>
      <thead><tr><th>Client</th><th class="r">KLU</th><th class="r">%</th><th class="r">Amount</th></tr></thead>
      <tbody>
        {#each result.clients as c, i (c.contactName)}
          <tr>
            <td><span class="dot" style="--z:{colorForIndex(i)}"></span>{c.contactName}</td>
            <td class="r">{c.klu.toFixed(1)}</td>
            <td class="r">{pct(c.sharePct)}</td>
            <td class="r">
              {#if c.charged}{eur(roundUp50(c.price))} <span class="real">({eur(c.price)})</span>{:else}<span class="real">own</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot><tr><td>Total</td><td class="r"></td><td class="r">100%</td><td class="r">{eur(roundedTotal)} <span class="real">({eur(result.accounting.revenue)})</span></td></tr></tfoot>
    </table>

    <div class="ledger faint">
      Collected {eur(roundedTotal)} <span class="real">(exact {eur(result.accounting.revenue)})</span> · costs {eur(result.accounting.kilnCosts)} · net to you {eur(roundedTotal - result.accounting.kilnCosts)}
    </div>

    <div class="footer">
      <button class="export" title="Export engine arrives in the Outputs phase">Export firing</button>
      <span class="faint hint">Wiring to PDF / message arrives in the Outputs phase.</span>
    </div>
  {/if}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    z-index: 60;
  }
  .card {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 460px;
    max-width: 92vw;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  h3 {
    font-size: 17px;
    font-weight: 600;
  }
  .head .faint {
    font-size: 12px;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    padding-bottom: 8px;
  }
  td {
    padding: 8px 0;
    border-top: 1px solid var(--line-soft);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
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
    background: var(--z);
    margin-right: 8px;
  }
  .real {
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .ledger {
    font-size: 12px;
    margin-top: 12px;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--line-soft);
  }
  .export {
    background: var(--panel-2);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    flex-shrink: 0;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .export:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--panel-2));
  }
  .hint {
    font-size: 11px;
  }
</style>
