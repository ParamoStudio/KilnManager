<script lang="ts">
  import { computeFiring } from "@core";
  import { firings, coreFiringFrom } from "../lib/firing.svelte";
  import { demoKilns } from "../lib/kilns";
  import { colorForName } from "../lib/colors";
  import { eur, pct } from "../lib/format";

  let { id, onclose }: { id: string; onclose: () => void } = $props();

  const rec = $derived(firings.list.find((f) => f.id === id));
  const result = $derived(rec ? computeFiring(coreFiringFrom(rec.planner)) : null);
  const kiln = $derived(rec ? (demoKilns.find((k) => k.id === rec.planner.kilnId) ?? demoKilns[0]!) : null);
  const names = $derived(
    rec ? Array.from(new Set(rec.planner.levels.flatMap((l) => l.segments.filter(Boolean).map((s) => s!.contactName)))) : [],
  );
  const fmt = (ts?: number): string => (ts ? new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "");
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
        {#each result.clients as c (c.contactName)}
          <tr>
            <td><span class="dot" style="--z:{colorForName(c.contactName, names)}"></span>{c.contactName}</td>
            <td class="r">{c.klu.toFixed(1)}</td>
            <td class="r">{pct(c.sharePct)}</td>
            <td class="r">{eur(c.price)}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot><tr><td>Total</td><td class="r"></td><td class="r">100%</td><td class="r">{eur(result.accounting.revenue)}</td></tr></tfoot>
    </table>

    <div class="ledger faint">
      Revenue {eur(result.accounting.revenue)} · costs {eur(result.accounting.kilnCosts)} · net to you {eur(result.accounting.netToYou)}
    </div>

    <div class="reexport faint">Re-export (PDF / message) arrives in the Outputs phase.</div>
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
  .ledger {
    font-size: 12px;
    margin-top: 12px;
  }
  .reexport {
    font-size: 11px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--line-soft);
  }
</style>
