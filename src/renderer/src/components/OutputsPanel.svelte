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
  import { t } from "../lib/i18n.svelte";
  import { outputs, isDesktop } from "../lib/storage";

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

  const views = $derived<{ id: View; label: string }[]>([
    { id: "firing", label: t.outputsPanel.navFiring },
    { id: "clients", label: t.outputsPanel.navClients },
    { id: "partners", label: t.outputsPanel.navPartners },
    { id: "personal", label: t.outputsPanel.navExpenses },
  ]);

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
    lines.push({ label: t.ticket.total, value: eur(roundUp50(c.price)), strong: true });
    return {
      studioName: settings.studioName,
      logoTop: settings.logoTop || undefined,
      logoBottom: settings.logoBottom || undefined,
      note: settings.ticketNote || undefined,
      client: name,
      date: new Date(rec.closedAt ?? rec.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      firingType: service.name,
      firingTotal: eur(result.serviceRevenue),
      sharePct: c.sharePct,
      shape: kiln.shape,
      extras: [],
      lines,
      total: eur(roundUp50(c.price)),
      thanks: t.ticket.defaultThanks(settings.studioName),
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
  async function doOpen(): Promise<void> {
    if (!selClient) return;
    // The PDF was already generated on close; regenerate to be safe, then open it.
    const p = await exportTicket(selClient);
    if (!p) {
      exportedNote = t.outputsPanel.desktopOnly;
      setTimeout(() => (exportedNote = ""), 2000);
      return;
    }
    const err = await outputs.openFile(p);
    if (err) await outputs.reveal(p); // fall back to showing it in Finder
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
<div class="panel" role="dialog" aria-label={t.outputsPanel.ariaLabel}>
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
      <button class="sendbtn" class:active={view === "ticket"} onclick={() => (view = "ticket")}>{t.outputsPanel.sendTickets}</button>
    </aside>

    <section class="body">
      <button class="close" onclick={onclose} aria-label={t.outputsPanel.close}>×</button>

      {#if view === "firing"}
        <h2>{t.outputsPanel.firingBreakdown}</h2>
        <div class="cols2">
          <div class="block">
            <span class="bh">{t.outputsPanel.price}</span>
            <div class="row"><span class="muted">{t.outputsPanel.base(service.name)}</span><span>{eur(service.basePrice)}</span></div>
            {#each fkMods as m (m.id)}
              <div class="row"><span class="muted">{m.name}</span><span class={m.family === "discount" ? "neg" : ""}>{m.family === "discount" ? "−" : "+"}{fmtMod(m)}</span></div>
            {/each}
            {#if rec.planner.customDiscount}
              <div class="row"><span class="muted">{t.outputsPanel.customDiscount}</span><span class="neg">−{fmtMod(rec.planner.customDiscount)}</span></div>
            {/if}
            <div class="row sum"><span>{t.outputsPanel.firingPrice}</span><span>{eur(result.serviceRevenue)}</span></div>
            <div class="row"><span class="muted">{t.outputsPanel.occupancy}</span><span class="muted">{pct(result.fillFraction)} {t.outputsPanel.loaded}</span></div>
          </div>

          <div class="block">
            <span class="bh">{t.outputsPanel.yourCosts}</span>
            <div class="row"><span class="muted">{t.outputsPanel.fuelLine(fuel?.label ?? "", fuelUse, fuel?.unit ?? "", eur(fuel?.price ?? 0))}</span><span>{eur(fuelCost)}</span></div>
            {#each fixedCosts as c (c.name)}
              <div class="row"><span class="muted">{c.name}</span><span>{eur(c.amount)}</span></div>
            {/each}
            <div class="row sum"><span>{t.outputsPanel.kilnCosts}</span><span>{eur(result.accounting.kilnCosts)}</span></div>
          </div>
        </div>

        <div class="block wide">
          <span class="bh">{t.outputsPanel.result}</span>
          <div class="row"><span class="muted">{t.outputsPanel.collected}</span><span>{eur(roundedTotal)} <span class="real">({t.outputsPanel.exact(eur(result.accounting.revenue))})</span></span></div>
          <div class="row"><span class="muted">{t.outputsPanel.minusKilnCosts}</span><span class="neg">−{eur(result.accounting.kilnCosts)}</span></div>
          <div class="row"><span class="muted">{t.outputsPanel.grossProfit}</span><span>{eur(result.accounting.grossProfit)}</span></div>
          {#if result.accounting.partnerCuts.length}
            <div class="row"><span class="muted">{t.outputsPanel.minusPartners}</span><span class="neg">−{eur(result.accounting.partnerCuts.reduce((a, p) => a + p.amount, 0))}</span></div>
          {/if}
          <div class="row total"><span>{t.outputsPanel.netToYou}</span><span>{eur(result.accounting.netToYou)}</span></div>
        </div>
      {:else if view === "clients"}
        <h2>{t.outputsPanel.clientsTitle}</h2>
        <div class="ctable">
          <div class="crow chead"><span>{t.outputsPanel.tableClient}</span><span class="r">{t.outputsPanel.tableKlu}</span><span class="r">{t.outputsPanel.tableShare}</span><span class="r">{t.outputsPanel.tableCharge}</span></div>
          {#each result.clients as c, i (c.contactName)}
            {@const mods = clientMods(c.contactName)}
            <div class="crow">
              <span class="cn"><span class="dot" style="--z:{c.charged ? colorForIndex(i) : "#fff"}"></span>{c.contactName}</span>
              <span class="r">{c.klu.toFixed(1)}</span>
              <span class="r">{pct(c.sharePct)}</span>
              <span class="r">
                {#if c.charged}{eur(roundUp50(c.price))} <span class="real">({eur(c.price)})</span>{:else}<span class="real">{t.outputsPanel.own}</span>{/if}
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
          <div class="crow total"><span>{t.outputsPanel.totalCollected}</span><span class="r"></span><span class="r"></span><span class="r">{eur(roundedTotal)}</span></div>
        </div>
      {:else if view === "partners"}
        <h2>{t.outputsPanel.partnersTitle}</h2>
        {#if result.accounting.partnerCuts.length}
          <div class="ptable">
            {#each result.accounting.partnerCuts as p (p.name)}
              <div class="prow"><span>{p.name}</span><span class="faint">{t.outputsPanel.ofGross(pct(p.pct))}</span><span class="r">{eur(p.amount)}</span></div>
            {/each}
            <div class="prow total"><span>{t.outputsPanel.toPartners}</span><span></span><span class="r">{eur(result.accounting.partnerCuts.reduce((a, p) => a + p.amount, 0))}</span></div>
          </div>
        {:else}
          <p class="faint empty">{t.outputsPanel.noPartnersOnFiring}</p>
        {/if}
      {:else if view === "personal"}
        <h2>{t.outputsPanel.expensesTitle}</h2>
        <div class="block wide">
          <div class="row"><span class="muted">{t.outputsPanel.collectedIn}</span><span>{eur(roundedTotal)}</span></div>
          <div class="row"><span class="muted">{t.outputsPanel.fuelOut(fuel?.label ?? "")}</span><span class="neg">−{eur(fuelCost)}</span></div>
          {#each fixedCosts as c (c.name)}
            <div class="row"><span class="muted">{c.name}</span><span class="neg">−{eur(c.amount)}</span></div>
          {/each}
          {#each result.accounting.partnerCuts as p (p.name)}
            <div class="row"><span class="muted">{t.outputsPanel.partnerOut(p.name)}</span><span class="neg">−{eur(p.amount)}</span></div>
          {/each}
          <div class="row total"><span>{t.outputsPanel.netToYou}</span><span>{eur(result.accounting.netToYou)}</span></div>
        </div>
      {:else}
        <h2>{t.outputsPanel.clientTicketTitle}</h2>
        {#if chargedClients.length === 0}
          <p class="faint empty">{t.outputsPanel.noChargedClients}</p>
        {:else}
          <div class="ticketpick">
            {#each chargedClients as c (c.contactName)}
              <button class="cpick" class:active={selClient === c.contactName} onclick={() => (selClient = c.contactName)}>{c.contactName}</button>
            {/each}
          </div>
          <div class="ticketrow">
            <div class="tprev"><iframe class="tframe" srcdoc={ticketHtml} title="Ticket preview"></iframe></div>
            <div class="tactions">
              <button class="tbtn primary" onclick={doOpen} disabled={!isDesktop}>{t.outputsPanel.openPdf}</button>
              <button class="tbtn" onclick={doShare} disabled={!isDesktop}>{t.outputsPanel.share}</button>
              <button class="tbtn" onclick={copyMessage}>{copied ? t.outputsPanel.messageCopied : t.outputsPanel.copyMessage}</button>
              <button class="tbtn" onclick={doReveal} disabled={!isDesktop}>{t.outputsPanel.revealInFinder}</button>
              {#if exportedNote}<span class="faint enote">{exportedNote}</span>{/if}
              {#if !isDesktop}<span class="faint enote">{t.outputsPanel.openPdfDesktopOnly}</span>{/if}
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
    gap: 8px;
  }
  .rbtn {
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 13px 14px;
    color: var(--text-dim);
    font-size: 14px;
    font-weight: 500;
    transition:
      border-color 0.12s,
      color 0.12s,
      background 0.12s;
  }
  .rbtn:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .rbtn.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel-2);
    font-weight: 600;
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
