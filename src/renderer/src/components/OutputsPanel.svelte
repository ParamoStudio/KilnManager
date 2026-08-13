<script lang="ts">
  import { onMount } from "svelte";
  import type { KilnModifier } from "@core";
  import { computeFiring } from "@core";
  import {
    app,
    firings,
    coreFiringFrom,
    reopenFiring,
    purgeFiring,
    clientPaidAt,
    setClientPaid,
    unpaidCount,
  } from "../lib/firing.svelte";
  import { kilnStore } from "../lib/kilns.svelte";
  import { settings, fuelDefFor, fuelCostFor,
    fuelUseFor, effectiveTicketMessage, chargedTotal, invoiceClientName } from "../lib/settings.svelte";
  import { colorForIndex } from "../lib/colors";
  import { eur, pct, fmtFull } from "../lib/format";
  import { buildTicketHtml, type TicketData, type TicketLine } from "../lib/ticket";
  import { monthlyData } from "../lib/expenses.svelte";
  import { t, localeTag } from "../lib/i18n.svelte";
  import { brand } from "../lib/brand.svelte";
  import { LAB } from "../lib/lab";
  import { outputs, isDesktop } from "../lib/storage";
  import { firingReport, copyText } from "../lib/reports";

  let { id, onclose }: { id: string; onclose: () => void } = $props();

  type View = "firing" | "clients" | "partners" | "personal" | "ticket" | "collect";
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
  const fuelUse = $derived(kiln && service ? fuelUseFor(kiln, service) : 0);
  const fuelCost = $derived(kiln && service ? fuelCostFor(kiln, service) : 0);
  const fixedCosts = $derived(kiln?.defaultCostItems ?? []);

  const roundedTotal = $derived(
    result ? result.clients.reduce((a, c) => a + (c.charged ? chargedTotal(c.price) : 0), 0) : 0,
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
    // Exactly ONE money figure on the invoice: the total.
    //
    // The header already names the service and the firing's total, so a line
    // repeating it was the same thing twice. Modifiers used to print their
    // computed share (−3,25 €), which put an unrounded cent figure back on the
    // client's receipt and invited them to add up numbers that can't sum to a
    // rounded total. They now say what they are — a name and a −20% — and let
    // the total speak for the money.
    const lines: TicketLine[] = mods.map((m) => ({
      label: `${m.name} · ${m.family === "discount" ? "−" : "+"}${m.mode === "percent" ? `${m.value}%` : eur(m.value)}`,
      value: "",
    }));
    lines.push({ label: t.ticket.total, value: eur(chargedTotal(c.price)), strong: true });
    return {
      studioName: settings.studioName,
      logoTop: brand.top || undefined,
      logoBottom: brand.bottom || undefined,
      note: settings.ticketNote || undefined,
      client: invoiceClientName(name),
      // The invoice follows the app's language, like everything else.
      date: new Date(rec.closedAt ?? rec.createdAt).toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" }),
      firingType: service.name,
      firingTotal: eur(result.serviceRevenue),
      sharePct: c.sharePct,
      shape: kiln.shape,
      extras: [],
      lines,
      total: eur(chargedTotal(c.price)),
      thanks: t.ticket.defaultThanks(settings.studioName),
    };
  }

  const ticketHtml = $derived(selClient ? (buildTicketHtml(ticketData(selClient)!) ?? "") : "");
  const messageFor = (name: string): string => {
    const c = result?.clients.find((x) => x.contactName === name);
    return effectiveTicketMessage()
      .replace(/\{client\}/g, name)
      .replace(/\{total\}/g, c ? eur(chargedTotal(c.price)) : "");
  };

  const dateFolder = $derived(rec ? new Date(rec.closedAt ?? rec.createdAt).toISOString().slice(0, 10) : "");
  const fileFor = (name: string): string => {
    const c = result?.clients.find((x) => x.contactName === name);
    const amount = c ? Math.round(chargedTotal(c.price)) : 0;
    return `${name}_${amount}eur_${dateFolder}.pdf`;
  };

  // ---- Correcting a closed firing ----
  // Both of these take the invoices off disk and rebuild the workbook, so a
  // firing you closed by mistake leaves no trace in your accounts.
  async function doEdit(): Promise<void> {
    if (!rec) return;
    const id = rec.id;
    onclose();
    await reopenFiring(id);
  }

  let confirmingDelete = $state(false);
  let deleteTimer: ReturnType<typeof setTimeout> | undefined;
  async function doDelete(): Promise<void> {
    if (!rec) return;
    // Two presses on the button itself — no dialog to dismiss, and it disarms
    // on its own so a stray first click can't lie in wait.
    if (!confirmingDelete) {
      confirmingDelete = true;
      deleteTimer = setTimeout(() => (confirmingDelete = false), 4000);
      return;
    }
    clearTimeout(deleteTimer);
    confirmingDelete = false;
    const id = rec.id;
    onclose();
    await purgeFiring(id);
  }

  // ---- Who has paid ----
  // Inert on purpose: this changes no total, no workbook, no export. It exists
  // so the studio can see at a glance who still owes for a given firing.
  const outstandingTotal = $derived(
    rec ? chargedClients.reduce((a, c) => a + (clientPaidAt(rec, c.contactName) ? 0 : chargedTotal(c.price)), 0) : 0,
  );
  const fmtPaidDate = (iso: string): string =>
    iso ? new Date(iso + "T12:00:00").toLocaleDateString(localeTag(), { day: "numeric", month: "short" }) : "";

  // ---- A message for whoever collects the money ----
  // Partners often charge the students when the owner isn't at the studio, so
  // they need to know what to collect, from whom, and what they're owed for it.
  let shareNote = $state("");
  function firingMessage(): string {
    if (!rec || !kiln || !result || !service) return "";
    const cuts = result.accounting.partnerCuts.filter((p) => p.amount > 0);
    return firingReport(
      {
        kilnName: kiln.name,
        serviceName: service.name,
        firingPrice: eur(result.serviceRevenue),
        date: new Date(rec.closedAt ?? rec.createdAt).toLocaleDateString(localeTag(), {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        toCollect: eur(roundedTotal),
        // Charged clients only, at the amount they actually pay. The studio's
        // own shelves are nobody's to collect.
        clients: chargedClients.map((c) => ({ name: c.contactName, amount: eur(chargedTotal(c.price)) })),
        partners: cuts.map((p) => ({ name: p.client ? `${p.name} · ${p.client}` : p.name, amount: eur(p.amount) })),
        partnersTotal: eur(cuts.reduce((a, p) => a + p.amount, 0)),
      },
      {
        firing: t.outputsPanel.repFiring,
        fullKiln: t.outputsPanel.repFullKiln,
        toCollect: t.outputsPanel.repToCollect,
        nothingToCollect: t.outputsPanel.repNothingToCollect,
        owePartner: t.outputsPanel.repOwePartner,
        owePartners: t.outputsPanel.repOwePartners,
      },
    );
  }
  async function shareFiring(): Promise<void> {
    const ok = await copyText(firingMessage());
    shareNote = ok ? t.outputsPanel.shareCopied : t.outputsPanel.shareFailed;
    setTimeout(() => (shareNote = ""), 3000);
  }

  // ---- Lab: the whole firing leaves as one zip ----
  let zipping = $state(false);
  let zipNote = $state("");
  async function downloadBundle(): Promise<void> {
    if (!rec || !kiln || !result || !service || zipping) return;
    zipping = true;
    zipNote = "";
    try {
      const { downloadFiringBundle } = await import("../lib/labexport");
      const stamp = new Date(rec.closedAt ?? rec.createdAt).toISOString().slice(0, 10);
      await downloadFiringBundle({
        name: `${rec.title || kiln.name} ${stamp}`,
        tickets: chargedClients.map((c) => ({
          name: fileFor(c.contactName).replace(/\.pdf$/, ""),
          html: buildTicketHtml(ticketData(c.contactName)!),
        })),
        sheet: { name: "Firing", rows: sheetRows() },
      });
    } catch (e) {
      zipNote = e instanceof Error ? e.message : String(e);
    } finally {
      zipping = false;
    }
  }

  /** The firing's figures as a flat table — the lab's stand-in for the app's
   * running workbook, which only makes sense across months. */
  function sheetRows(): (string | number | null)[][] {
    if (!rec || !kiln || !result || !service) return [];
    const rows: (string | number | null)[][] = [
      [t.lab.sheetFiring, rec.title || kiln.name],
      [t.lab.sheetKiln, kiln.name],
      [t.lab.sheetService, service.name],
      [t.lab.sheetDate, new Date(rec.closedAt ?? rec.createdAt).toISOString().slice(0, 10)],
      [],
      [t.lab.sheetClient, t.lab.sheetShare, t.lab.sheetCharged],
    ];
    for (const c of result.clients) {
      rows.push([c.contactName, Number((c.sharePct * 100).toFixed(1)), c.charged ? chargedTotal(c.price) : 0]);
    }
    rows.push([]);
    rows.push([t.lab.sheetCollected, null, result.accounting.revenue]);
    rows.push([t.lab.sheetCosts, null, result.accounting.kilnCosts]);
    rows.push([t.lab.sheetGross, null, result.accounting.grossProfit]);
    for (const p of result.accounting.partnerCuts) {
      rows.push([p.client ? `${p.name} · ${p.client}` : p.name, Number((p.pct * 100).toFixed(1)), -p.amount]);
    }
    rows.push([t.outputsPanel.netToYou, null, result.accounting.netToYou]);
    return rows;
  }

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
      <button class="collectbtn" class:active={view === "collect"} onclick={() => (view = "collect")}>
        {t.outputsPanel.navCollect}
        {#if rec && unpaidCount(rec) > 0}<span class="cbadge">{unpaidCount(rec)}</span>{/if}
      </button>

      <!-- Only for a firing that's already closed, i.e. opened from the log.
           A firing still in progress is edited directly and deleted from Home. -->
      {#if rec.status === "closed"}
        <div class="rowners">
          <button class="rowner" onclick={doEdit} title={t.outputsPanel.editFiringHint}>{t.outputsPanel.editFiring}</button>
          <button class="rowner danger" class:armed={confirmingDelete} onclick={doDelete}>
            {confirmingDelete ? t.outputsPanel.deleteConfirmAgain : t.outputsPanel.deleteFiring}
          </button>
        </div>
      {/if}
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
            {#each fixedCosts as c, ci (ci)}
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
                {#if c.charged}{eur(chargedTotal(c.price))} <span class="real">({eur(c.price)})</span>{:else}<span class="real">{t.outputsPanel.own}</span>{/if}
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
      {:else if view === "collect"}
        <h2>{t.outputsPanel.collectTitle}</h2>
        {#if chargedClients.length === 0}
          <p class="faint empty">{t.outputsPanel.collectNobody}</p>
        {:else}
          <p class="faint chint">{t.outputsPanel.collectHint}</p>
          <div class="ctable">
            {#each chargedClients as c (c.contactName)}
              {@const paidOn = rec ? clientPaidAt(rec, c.contactName) : null}
              <label class="crow" class:paid={!!paidOn}>
                <input
                  type="checkbox"
                  checked={!!paidOn}
                  onchange={(e) => rec && setClientPaid(rec, c.contactName, e.currentTarget.checked)}
                />
                <span class="ctgl" aria-hidden="true"></span>
                <span class="cname">{c.contactName}</span>
                <span class="cwhen faint">{paidOn ? t.outputsPanel.paidOn(fmtPaidDate(paidOn)) : t.outputsPanel.outstanding}</span>
                <span class="camount">{eur(chargedTotal(c.price))}</span>
              </label>
            {/each}
            <div class="crow total">
              <span></span><span></span>
              <span class="cname">{rec && unpaidCount(rec) === 0 ? t.outputsPanel.allPaid : t.outputsPanel.stillOwed}</span>
              <span></span>
              <span class="camount">{eur(outstandingTotal)}</span>
            </div>
          </div>
        {/if}
      {:else if view === "partners"}
        <h2>{t.outputsPanel.partnersTitle}</h2>
        {#if result.accounting.partnerCuts.length}
          <div class="ptable">
            {#each result.accounting.partnerCuts as p, i (`${p.name}-${p.client ?? ""}-${i}`)}
              <div class="prow">
                <span>{p.name}{#if p.client}<span class="faint"> · {p.client}</span>{/if}</span>
                <span class="faint">{p.client ? t.outputsPanel.ofClientProfit(pct(p.pct)) : t.outputsPanel.ofGross(pct(p.pct))}</span>
                <span class="r">{eur(p.amount)}</span>
              </div>
            {/each}
            <div class="prow total"><span>{t.outputsPanel.toPartners}</span><span></span><span class="r">{eur(result.accounting.partnerCuts.reduce((a, p) => a + p.amount, 0))}</span></div>
          </div>
          <div class="shareblock">
            <button class="sharebtn" onclick={shareFiring}>{t.outputsPanel.shareWithPartners}</button>
            {#if shareNote}<span class="faint snote">{shareNote}</span>{/if}
            <pre class="prev">{firingMessage()}</pre>
          </div>
          {#if result.accounting.partnerBase <= 0}
            <!-- Only when there is genuinely nothing to share. Keyed off the
                 partner base, not the firing's profit: a firing can run at a
                 loss on the studio's own shelves and still owe a partner their
                 share of what clients paid. -->
            <p class="faint pnote">{t.outputsPanel.noProfitNoCut}</p>
          {/if}
        {:else}
          <p class="faint empty">{t.outputsPanel.noPartnersOnFiring}</p>
        {/if}
      {:else if view === "personal"}
        <h2>{t.outputsPanel.expensesTitle}</h2>
        <div class="block wide">
          <div class="row"><span class="muted">{t.outputsPanel.collectedIn}</span><span>{eur(roundedTotal)}</span></div>
          <div class="row"><span class="muted">{t.outputsPanel.fuelOut(fuel?.label ?? "")}</span><span class="neg">−{eur(fuelCost)}</span></div>
          {#each fixedCosts as c, ci (ci)}
            <div class="row"><span class="muted">{c.name}</span><span class="neg">−{eur(c.amount)}</span></div>
          {/each}
          <!-- A partner who earns nothing on this firing isn't money going out,
               so it doesn't belong in a list of outgoings as "−0,00 €". The
               Partners view says why they got nothing. -->
          {#each result.accounting.partnerCuts.filter((p) => p.amount > 0) as p, i (`${p.name}-${p.client ?? ""}-${i}`)}
            <div class="row">
              <span class="muted">{t.outputsPanel.partnerOut(p.client ? `${p.name} · ${p.client}` : p.name)}</span>
              <span class="neg">−{eur(p.amount)}</span>
            </div>
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
              {#if LAB}
                <button class="tbtn primary" onclick={downloadBundle} disabled={zipping}>
                  {zipping ? t.lab.preparing : t.lab.downloadBundle}
                </button>
                <button class="tbtn" onclick={copyMessage}>{copied ? t.outputsPanel.messageCopied : t.outputsPanel.copyMessage}</button>
                <span class="faint enote">{t.lab.bundleHint}</span>
                {#if zipNote}<span class="faint enote">{zipNote}</span>{/if}
              {:else}
                <button class="tbtn primary" onclick={doOpen} disabled={!isDesktop}>{t.outputsPanel.openPdf}</button>
                <button class="tbtn" onclick={doShare} disabled={!isDesktop}>{t.outputsPanel.share}</button>
                <button class="tbtn" onclick={copyMessage}>{copied ? t.outputsPanel.messageCopied : t.outputsPanel.copyMessage}</button>
                <button class="tbtn" onclick={doReveal} disabled={!isDesktop}>{t.outputsPanel.revealInFinder}</button>
                {#if exportedNote}<span class="faint enote">{exportedNote}</span>{/if}
                {#if !isDesktop}<span class="faint enote">{t.outputsPanel.openPdfDesktopOnly}</span>{/if}
              {/if}
              <div class="msgprev faint">“{messageFor(selClient ?? "")}”</div>
            </div>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .rowners {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px solid var(--line-soft);
  }
  .rowner {
    background: none;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 12px;
    color: var(--text-dim);
    font-size: 12.5px;
    text-align: left;
  }
  .rowner:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
  .rowner.danger:hover {
    border-color: color-mix(in srgb, var(--amber) 55%, var(--line));
    color: var(--amber);
  }
  .rowner.danger.armed {
    border-color: var(--amber);
    color: var(--amber);
    background: color-mix(in srgb, var(--amber) 10%, transparent);
  }

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
  /* Sits under Send Tickets, same shape, amber — money still owed is the one
     thing in here the studio needs nudging about. */
  .collectbtn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    background: none;
    border: 1px solid color-mix(in srgb, var(--amber) 50%, var(--line));
    border-radius: 10px;
    padding: 11px 14px;
    color: var(--amber);
    font-size: 13px;
  }
  .collectbtn:hover,
  .collectbtn.active {
    border-color: var(--amber);
    background: color-mix(in srgb, var(--amber) 10%, transparent);
  }
  .cbadge {
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: var(--amber);
    color: #1a1200;
    font-size: 11px;
    font-weight: 700;
    display: grid;
    place-items: center;
    padding: 0 5px;
  }
  .chint {
    font-size: 12.5px;
    margin: 0 0 14px;
    max-width: 56ch;
  }
  .ctable {
    display: flex;
    flex-direction: column;
  }
  .crow {
    display: grid;
    grid-template-columns: 17px 1fr auto 90px;
    align-items: center;
    gap: 12px;
    padding: 11px 2px;
    border-bottom: 1px solid var(--line-soft);
    cursor: pointer;
  }
  .crow.total {
    grid-template-columns: 0 0 1fr 90px;
    border-bottom: none;
    padding-top: 14px;
    font-weight: 600;
    cursor: default;
  }
  .crow input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .ctgl {
    width: 17px;
    height: 17px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--panel-2);
    position: relative;
  }
  .crow input:checked + .ctgl {
    border-color: var(--green, #7fdca4);
    background: color-mix(in srgb, var(--green, #7fdca4) 18%, var(--panel-2));
  }
  .crow input:checked + .ctgl::after {
    content: "";
    position: absolute;
    left: 4px;
    top: 1px;
    width: 6px;
    height: 10px;
    border-right: 2px solid var(--green, #7fdca4);
    border-bottom: 2px solid var(--green, #7fdca4);
    transform: rotate(40deg);
  }
  .crow input:focus-visible + .ctgl {
    outline: 2px solid var(--amber);
    outline-offset: 2px;
  }
  .cname {
    font-size: 13.5px;
  }
  .crow.paid .cname {
    color: var(--text-dim);
  }
  .cwhen {
    font-size: 12px;
  }
  .camount {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 13.5px;
  }
  .shareblock {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--line-soft);
  }
  .sharebtn {
    align-self: flex-start;
    background: none;
    border: 1px solid color-mix(in srgb, var(--amber) 50%, var(--line));
    border-radius: 999px;
    padding: 9px 16px;
    color: var(--amber);
    font-size: 13px;
  }
  .sharebtn:hover {
    border-color: var(--amber);
  }
  .snote {
    font-size: 12px;
  }
  /* Shown so the studio can read exactly what it's about to send. */
  .prev {
    margin: 0;
    padding: 12px 14px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    font-family: inherit;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--text-dim);
    white-space: pre-wrap;
    max-width: 60ch;
  }
  .pnote {
    font-size: 12.5px;
    line-height: 1.6;
    margin: 12px 0 0;
    max-width: 52ch;
  }
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
