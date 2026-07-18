<script lang="ts">
  import { onMount } from "svelte";
  import type { KilnModifier } from "@core";
  import { computeFiring, roundUp50 } from "@core";
  import { app, firings, coreFiringFrom } from "../lib/firing.svelte";
  import { kilnStore } from "../lib/kilns.svelte";
  import { settings, fuelDefFor, fuelCostFor } from "../lib/settings.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur, pct, fmtFull } from "../lib/format";
  import { buildTicketHtml, type TicketData, type TicketLine } from "../lib/ticket";
  import { monthlyData } from "../lib/expenses.svelte";
  import { outputs, isDesktop } from "../lib/storage";
  import wordmarkSvg from "../assets/paramo-wordmark.svg?raw";
  import emblemSvg from "../assets/paramo-emblem.svg?raw";

  let { id, onclose }: { id: string; onclose: () => void } = $props();

  type View = "firing" | "clients" | "partners" | "personal" | "ticket";
  let view = $state<View>("firing");
  let selClient = $state<string | null>(null);
  let copied = $state(false);
  let exportedNote = $state("");

  const rec = $derived(firings.list.find((f) => f.id === id) ?? null);
  const kiln = $derived(rec ? (kilnStore.list.find((k) => k.id === rec.planner.kilnId) ?? kilnStore.list[0]) : null);
  const result = $derived(rec ? computeFiring(coreFiringFrom(rec.planner)) : null);
  const service = $derived(
    rec && kiln ? (kiln.services.find((s) => s.id === rec.planner.serviceId) ?? kiln.services[0]) : null,
  );

  const fmtMod = (m: { mode: "percent" | "fixed"; value: number }): string =>
    m.mode === "percent" ? `${m.value}%` : eur(m.value);

  // Full-kiln modifiers applied to this firing.
  const fkMods = $derived(
    rec && kiln
      ? (kiln.modifiers ?? []).filter((m) => m.scope === "full-kiln" && (rec.planner.kilnMods ?? []).includes(m.id))
      : [],
  );
  const clientMods = (name: string): KilnModifier[] => {
    const ids = rec?.planner.clientMods?.[name] ?? [];
    const defined = kiln?.modifiers ?? [];
    return ids.map((mid) => defined.find((m) => m.id === mid)).filter((m): m is KilnModifier => !!m);
  };

  const fuel = $derived(kiln ? fuelDefFor(kiln) : null);
  const fuelUse = $derived(service?.fuelUse ?? 0);
  const fuelCost = $derived(kiln ? fuelCostFor(kiln, fuelUse) : 0);
  const fixedCosts = $derived(kiln?.defaultCostItems ?? []);

  const roundedTotal = $derived(
    result ? result.clients.reduce((a, c) => a + (c.charged ? roundUp50(c.price) : 0), 0) : 0,
  );

  const views: { id: View; label: string }[] = [
    { id: "firing", label: "Firing" },
    { id: "clients", label: "Clients" },
    { id: "partners", label: "Partners" },
    { id: "personal", label: "Personal" },
  ];

  // ---- Client tickets ----
  const chargedClients = $derived(result ? result.clients.filter((c) => c.charged) : []);

  function ticketData(name: string): TicketData | null {
    if (!rec || !kiln || !result || !service) return null;
    const c = result.clients.find((x) => x.contactName === name);
    if (!c) return null;
    const base = result.totalKLU > 0 ? (result.serviceRevenue * c.klu) / result.totalKLU : 0;
    const mods = clientMods(name);
    const fixedSum = mods.reduce((a, m) => a + (m.family === "discount" ? -1 : 1) * (m.mode === "fixed" ? m.value : 0), 0);
    const lines: TicketLine[] = [{ label: service.name, value: eur(base) }];
    for (const m of mods) {
      const sign = m.family === "discount" ? -1 : 1;
      const val = m.mode === "fixed" ? sign * m.value : sign * (base + fixedSum) * (m.value / 100);
      const label = `${m.name} (${m.mode === "percent" ? `${m.value}%` : eur(m.value)})`;
      lines.push({ label, value: `${val < 0 ? "−" : "+"}${eur(Math.abs(val))}` });
    }
    lines.push({ label: "TOTAL", value: eur(roundUp50(c.price)), strong: true });
    return {
      studioName: settings.studioName,
      wordmarkSvg,
      emblemSvg,
      client: name,
      date: new Date(rec.closedAt ?? rec.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
      firingType: service.name,
      firingTotal: eur(result.serviceRevenue),
      sharePct: c.sharePct,
      shape: kiln.shape,
      extras: [],
      lines,
      total: eur(roundUp50(c.price)),
      thanks: `Gracias por confiar en ${settings.studioName} con tus piezas.`,
    };
  }

  const ticketHtml = $derived(selClient ? (buildTicketHtml(ticketData(selClient)!) ?? "") : "");
  const messageFor = (name: string): string => {
    const c = result?.clients.find((x) => x.contactName === name);
    return settings.ticketMessage
      .replace(/\{client\}/g, name)
      .replace(/\{total\}/g, c ? eur(roundUp50(c.price)) : "");
  };

  const dateFolder = $derived(rec ? new Date(rec.closedAt ?? rec.createdAt).toISOString().slice(0, 10) : "");
  const fileFor = (name: string): string => {
    const c = result?.clients.find((x) => x.contactName === name);
    const amount = c ? Math.round(roundUp50(c.price)) : 0;
    return `${name}_${amount}eur_${dateFolder}.pdf`;
  };

  async function exportTicket(name: string): Promise<string | null> {
    const d = ticketData(name);
    if (!d || !kiln) return null;
    return outputs.savePdf(buildTicketHtml(d), [kiln.name, dateFolder, fileFor(name)]);
  }
  async function doExport(): Promise<void> {
    if (!selClient) return;
    const p = await exportTicket(selClient);
    exportedNote = p ? "Saved to outputs ✓" : "Desktop only";
    setTimeout(() => (exportedNote = ""), 2000);
  }
  async function doShare(): Promise<void> {
    if (!selClient) return;
    const p = await exportTicket(selClient);
    if (p) await outputs.share(p);
  }
  async function doReveal(): Promise<void> {
    if (!selClient) return;
    const p = await exportTicket(selClient);
    if (p) await outputs.reveal(p);
  }
  async function copyMessage(): Promise<void> {
    if (!selClient) return;
    try {
      await navigator.clipboard.writeText(messageFor(selClient));
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      copied = false;
    }
  }

  onMount(() => {
    // Auto-export every client's ticket once, right after closing the firing,
    // and refresh the KilnCosts workbook so the vault stays in sync.
    if (app.outputsAutoExport) {
      app.outputsAutoExport = false;
      if (isDesktop) {
        for (const c of chargedClients) void exportTicket(c.contactName);
        void outputs.saveCosts(JSON.parse(JSON.stringify(monthlyData())));
      }
    }
    selClient = chargedClients[0]?.contactName ?? null;
  });
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="panel" role="dialog" aria-label="Firing outputs">
  {#if rec && kiln && result && service}
    <aside class="rail">
      <div class="rail-head">
        <span class="rtitle">{rec.title || kiln.name}</span>
        <span class="faint rsub">{kiln.name} · {rec.closedAt ? fmtFull(rec.closedAt) : fmtFull(rec.createdAt)}</span>
      </div>
      <nav class="rnav">
        {#each views as v (v.id)}
          <button class="rbtn" class:active={view === v.id} onclick={() => (view = v.id)}>{v.label}</button>
        {/each}
      </nav>
      <button class="sendbtn" class:active={view === "ticket"} onclick={() => (view = "ticket")}>Send Tickets To…</button>
    </aside>

    <section class="body">
      <button class="close" onclick={onclose} aria-label="Close">×</button>

      {#if view === "firing"}
        <h2>Firing breakdown</h2>
        <div class="cols2">
          <div class="block">
            <span class="bh">Price</span>
            <div class="row"><span class="muted">Base · {service.name}</span><span>{eur(service.basePrice)}</span></div>
            {#each fkMods as m (m.id)}
              <div class="row"><span class="muted">{m.name}</span><span class={m.family === "discount" ? "neg" : ""}>{m.family === "discount" ? "−" : "+"}{fmtMod(m)}</span></div>
            {/each}
            {#if rec.planner.customDiscount}
              <div class="row"><span class="muted">Custom discount</span><span class="neg">−{fmtMod(rec.planner.customDiscount)}</span></div>
            {/if}
            <div class="row sum"><span>Firing price</span><span>{eur(result.serviceRevenue)}</span></div>
            <div class="row"><span class="muted">Occupancy</span><span class="muted">{pct(result.fillFraction)} loaded</span></div>
          </div>

          <div class="block">
            <span class="bh">Your costs</span>
            <div class="row"><span class="muted">{fuel?.label} · {fuelUse} {fuel?.unit} × {eur(fuel?.price ?? 0)}</span><span>{eur(fuelCost)}</span></div>
            {#each fixedCosts as c (c.name)}
              <div class="row"><span class="muted">{c.name}</span><span>{eur(c.amount)}</span></div>
            {/each}
            <div class="row sum"><span>Kiln costs</span><span>{eur(result.accounting.kilnCosts)}</span></div>
          </div>
        </div>

        <div class="block wide">
          <span class="bh">Result</span>
          <div class="row"><span class="muted">Collected</span><span>{eur(roundedTotal)} <span class="real">(exact {eur(result.accounting.revenue)})</span></span></div>
          <div class="row"><span class="muted">− Kiln costs</span><span class="neg">−{eur(result.accounting.kilnCosts)}</span></div>
          <div class="row"><span class="muted">Gross profit</span><span>{eur(result.accounting.grossProfit)}</span></div>
          {#if result.accounting.partnerCuts.length}
            <div class="row"><span class="muted">− Partners</span><span class="neg">−{eur(result.accounting.partnerCuts.reduce((a, p) => a + p.amount, 0))}</span></div>
          {/if}
          <div class="row total"><span>Net to you</span><span>{eur(result.accounting.netToYou)}</span></div>
        </div>
      {:else if view === "clients"}
        <h2>Clients</h2>
        <div class="ctable">
          <div class="crow chead"><span>Client</span><span class="r">KLU</span><span class="r">Share</span><span class="r">Charge</span></div>
          {#each result.clients as c, i (c.contactName)}
            {@const mods = clientMods(c.contactName)}
            <div class="crow">
              <span class="cn"><span class="dot" style="--z:{c.charged ? colorForIndex(i) : "#fff"}"></span>{c.contactName}</span>
              <span class="r">{c.klu.toFixed(1)}</span>
              <span class="r">{pct(c.sharePct)}</span>
              <span class="r">
                {#if c.charged}{eur(roundUp50(c.price))} <span class="real">({eur(c.price)})</span>{:else}<span class="real">own</span>{/if}
              </span>
            </div>
            {#if mods.length}
              <div class="cmods">
                {#each mods as m (m.id)}
                  <span class="cmod">{m.name} {m.family === "discount" ? "−" : "+"}{fmtMod(m)}</span>
                {/each}
              </div>
            {/if}
          {/each}
          <div class="crow total"><span>Total collected</span><span class="r"></span><span class="r"></span><span class="r">{eur(roundedTotal)}</span></div>
        </div>
      {:else if view === "partners"}
        <h2>Partners</h2>
        {#if result.accounting.partnerCuts.length}
          <div class="ptable">
            {#each result.accounting.partnerCuts as p (p.name)}
              <div class="prow"><span>{p.name}</span><span class="faint">{pct(p.pct)} of gross</span><span class="r">{eur(p.amount)}</span></div>
            {/each}
            <div class="prow total"><span>To partners</span><span></span><span class="r">{eur(result.accounting.partnerCuts.reduce((a, p) => a + p.amount, 0))}</span></div>
          </div>
        {:else}
          <p class="faint empty">No partners on this firing.</p>
        {/if}
      {:else if view === "personal"}
        <h2>Personal · in &amp; out</h2>
        <div class="block wide">
          <div class="row"><span class="muted">Collected (in)</span><span>{eur(roundedTotal)}</span></div>
          <div class="row"><span class="muted">Fuel — {fuel?.label}</span><span class="neg">−{eur(fuelCost)}</span></div>
          {#each fixedCosts as c (c.name)}
            <div class="row"><span class="muted">{c.name}</span><span class="neg">−{eur(c.amount)}</span></div>
          {/each}
          {#each result.accounting.partnerCuts as p (p.name)}
            <div class="row"><span class="muted">Partner · {p.name}</span><span class="neg">−{eur(p.amount)}</span></div>
          {/each}
          <div class="row total"><span>Net to you</span><span>{eur(result.accounting.netToYou)}</span></div>
        </div>
      {:else}
        <h2>Client ticket</h2>
        {#if chargedClients.length === 0}
          <p class="faint empty">No charged clients on this firing.</p>
        {:else}
          <div class="ticketpick">
            {#each chargedClients as c (c.contactName)}
              <button class="cpick" class:active={selClient === c.contactName} onclick={() => (selClient = c.contactName)}>{c.contactName}</button>
            {/each}
          </div>
          <div class="ticketrow">
            <div class="tprev"><iframe class="tframe" srcdoc={ticketHtml} title="Ticket preview"></iframe></div>
            <div class="tactions">
              <button class="tbtn primary" onclick={doExport} disabled={!isDesktop}>Export PDF</button>
              <button class="tbtn" onclick={doShare} disabled={!isDesktop}>Share…</button>
              <button class="tbtn" onclick={copyMessage}>{copied ? "Message copied ✓" : "Copy message"}</button>
              <button class="tbtn" onclick={doReveal} disabled={!isDesktop}>Reveal in Finder</button>
              {#if exportedNote}<span class="faint enote">{exportedNote}</span>{/if}
              {#if !isDesktop}<span class="faint enote">PDF export is desktop-only.</span>{/if}
              <div class="msgprev faint">“{messageFor(selClient ?? "")}”</div>
            </div>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 80;
  }
  .panel {
    position: fixed;
    z-index: 81;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 860px;
    max-width: 94vw;
    height: 560px;
    max-height: 90vh;
    display: grid;
    grid-template-columns: 200px 1fr;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  .rail {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px 16px;
    border-right: 1px solid var(--line-soft);
    background: rgba(255, 255, 255, 0.015);
  }
  .rail-head {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .rtitle {
    font-size: 15px;
    font-weight: 600;
  }
  .rsub {
    font-size: 11px;
  }
  .rnav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rbtn {
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .rbtn:hover {
    color: var(--text);
    background: var(--panel-2);
  }
  .rbtn.active {
    color: var(--text);
    border-color: var(--line);
    background: var(--panel-2);
  }
  .sendbtn {
    margin-top: auto;
    background: var(--text);
    color: var(--bg);
    border: 1px solid var(--text);
    border-radius: 10px;
    padding: 13px 14px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  }
  .sendbtn:hover {
    opacity: 0.9;
  }
  .sendbtn.active {
    background: var(--panel-2);
    color: var(--text);
    border-color: var(--text-faint);
  }
  .body {
    position: relative;
    padding: 24px 26px;
    overflow-y: auto;
  }
  .close {
    position: absolute;
    top: 16px;
    right: 18px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
  }
  .close:hover {
    color: var(--text);
  }
  h2 {
    font-size: 17px;
    font-weight: 600;
    margin: 0 0 16px;
  }
  .cols2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    margin-bottom: 16px;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .bh {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
    margin-bottom: 6px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    border-bottom: 1px solid var(--line-soft);
  }
  .row .muted {
    color: var(--text-dim);
  }
  .row.sum {
    font-weight: 600;
    border-bottom: 1px solid var(--line);
  }
  .row.total {
    font-weight: 600;
    font-size: 15px;
    border-bottom: none;
    margin-top: 2px;
  }
  .neg {
    color: var(--green);
  }
  .real {
    color: var(--text-faint);
    font-size: 11px;
  }
  .ctable,
  .ptable {
    display: flex;
    flex-direction: column;
  }
  .crow,
  .prow {
    display: grid;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    border-bottom: 1px solid var(--line-soft);
  }
  .crow {
    grid-template-columns: 1fr 60px 70px 130px;
  }
  .prow {
    grid-template-columns: 1fr 1fr 120px;
  }
  .chead {
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .r {
    text-align: right;
  }
  .cn {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--z);
    flex-shrink: 0;
  }
  .cmods {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 0 8px 16px;
  }
  .cmod {
    font-size: 11px;
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 999px;
    padding: 2px 9px;
  }
  .crow.total,
  .prow.total {
    font-weight: 600;
    border-bottom: none;
    border-top: 1px solid var(--line);
    margin-top: 2px;
  }
  .empty {
    font-size: 13px;
  }
  .ticketpick {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .cpick {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 6px 12px;
    color: var(--text-dim);
    font-size: 12px;
  }
  .cpick:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
  .cpick.active {
    border-color: var(--accent);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 10%, var(--panel-2));
  }
  .ticketrow {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
    align-items: start;
  }
  .tprev {
    width: 300px;
    height: 424px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
  }
  .tframe {
    width: 794px;
    height: 1123px;
    border: none;
    transform: scale(0.378);
    transform-origin: top left;
  }
  .tactions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tbtn {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 13px;
    color: var(--text);
    font-size: 13px;
    text-align: left;
  }
  .tbtn:hover:not(:disabled) {
    border-color: var(--text-faint);
  }
  .tbtn.primary {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    font-weight: 600;
  }
  .tbtn.primary:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .tbtn:disabled {
    opacity: 0.4;
  }
  .enote {
    font-size: 11px;
  }
  .msgprev {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--line-soft);
    font-size: 11.5px;
    line-height: 1.5;
    font-style: italic;
  }
</style>
