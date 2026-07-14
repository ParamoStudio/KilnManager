<script lang="ts">
  import { computeFiring } from "@core";
  import { app, activeFiring, coreFiringFrom, go } from "../lib/firing.svelte";
  import { eur } from "../lib/format";

  const rec = $derived(activeFiring());
  const result = $derived(rec ? computeFiring(coreFiringFrom(rec.planner)) : null);

  function done(): void {
    app.exportOpen = false;
    go("home");
  }
</script>

<div class="scrim" role="presentation" onclick={done}></div>
<div class="card" role="dialog" aria-label="Export">
  <div class="head">
    <h3>Firing closed</h3>
    <button class="x" onclick={done} aria-label="Close">×</button>
  </div>

  {#if result}
    <p class="faint intro">
      Saved to the firing log. {result.clients.length} client{result.clients.length === 1 ? "" : "s"} · total {eur(result.accounting.revenue)}.
    </p>
  {/if}

  <div class="options">
    <div class="opt disabled"><span class="dot"></span>PDF per client (breakdown + logo)</div>
    <div class="opt disabled"><span class="dot"></span>WhatsApp / Markdown message</div>
    <div class="opt disabled"><span class="dot"></span>Download all PDFs</div>
  </div>
  <p class="faint note">Exports arrive in the Outputs phase — re-openable any time from the log.</p>

  <div class="actions">
    <button class="done" onclick={done}>Done</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    z-index: 80;
  }
  .card {
    position: fixed;
    z-index: 81;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 420px;
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
    align-items: center;
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
  .intro {
    font-size: 13px;
    margin: 8px 0 16px;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    padding: 12px 14px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .opt.disabled {
    opacity: 0.55;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-faint);
  }
  .note {
    font-size: 11px;
    margin: 14px 0 0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
  }
  .done {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 10px 22px;
    font-weight: 600;
    font-size: 13px;
  }
</style>
