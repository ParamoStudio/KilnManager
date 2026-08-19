<script lang="ts">
  /**
   * Monthly collections — the screen a studio bills from.
   *
   * A firing is rarely paid on the day it's fired: clients fire a few times over
   * a month and settle once at the end. The per-firing "has this person paid?"
   * marks are the raw material; this puts a month of them together, per client,
   * and produces the two things billing actually needs — a statement to send the
   * client, and a list for whoever collects at the studio.
   *
   * Marking someone paid here settles every firing of theirs that month, so the
   * firing log stops flagging debts that have been collected. Undoing it takes a
   * second press: it is the one action here that quietly rewrites history.
   */
  import { collectionMonths } from "../lib/collections.svelte";
  import { monthIsClosed, currentMonthKey, type ClientCollection, type CollectionFiring, type CollectionMonth } from "../lib/collections";
  import { app, firings, setClientPaidAcross } from "../lib/firing.svelte";
  import { settings, invoiceClientName } from "../lib/settings.svelte";
  import { brand } from "../lib/brand.svelte";
  import { invoiceData, invoicePath } from "../lib/invoice.svelte";
  import { buildTicketHtml, buildStatementHtml, type StatementData } from "../lib/ticket";
  import { eur, fmtDay } from "../lib/format";
  import { t, localeTag } from "../lib/i18n.svelte";
  import { outputs, isDesktop } from "../lib/storage";
  import { collectionsReport, copyText } from "../lib/reports";

  const data = $derived(collectionMonths());
  const nowKey = currentMonthKey();

  const labelFor = (ts: number): string => {
    const s = new Date(ts).toLocaleDateString(localeTag(), { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /**
   * The months you can move between, newest first.
   *
   * The month in progress is always here even with nothing closed in it yet —
   * otherwise the screen would open on an old month with no way to see that
   * this one is simply still running.
   */
  const months = $derived.by<CollectionMonth[]>(() => {
    const list = data.slice();
    if (!list.some((m) => m.key === nowKey)) {
      list.unshift({ key: nowKey, label: labelFor(Date.now()), at: Date.now(), clients: [], total: 0, outstanding: 0 });
    }
    return list;
  });

  // Opens on last month: the one you actually bill. The month in progress is
  // still incomplete, so landing there would show a figure that isn't final yet.
  let selKey = $state<string | null>(null);
  const idx = $derived.by(() => {
    if (selKey) {
      const i = months.findIndex((m) => m.key === selKey);
      if (i >= 0) return i;
    }
    const billable = months.findIndex((m) => monthIsClosed(m.key));
    return billable >= 0 ? billable : 0;
  });
  const month = $derived(months[idx] ?? null);
  const older = $derived(months[idx + 1] ?? null);
  const newer = $derived(idx > 0 ? (months[idx - 1] ?? null) : null);
  const monthIsOver = $derived(!!month && monthIsClosed(month.key));

  const go = (m: CollectionMonth | null): void => {
    if (!m) return;
    selKey = m.key;
    openClient = null;
    arming = null;
  };

  // ---- Settling a client for the whole month ----
  let openClient = $state<string | null>(null);
  let arming = $state<string | null>(null); // awaiting a second press to unmark

  function togglePaid(c: ClientCollection): void {
    const ids = c.firings.map((f) => f.firingId);
    if (!c.settled) {
      setClientPaidAcross(ids, c.client, true);
      arming = null;
      return;
    }
    if (arming === c.client) {
      setClientPaidAcross(ids, c.client, false);
      arming = null;
      return;
    }
    // First press on a settled client only arms the undo.
    arming = c.client;
    const armed = c.client;
    setTimeout(() => {
      if (arming === armed) arming = null;
    }, 5000);
  }

  /** Today, written the way this studio writes dates on its invoices. */
  const today = (): string =>
    new Date().toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" });

  const fmtPaid = (iso: string): string =>
    iso ? new Date(iso + "T12:00:00").toLocaleDateString(localeTag(), { day: "numeric", month: "short" }) : "";

  // ---- Documents ----
  let note = $state("");
  const say = (msg: string): void => {
    note = msg;
    setTimeout(() => (note = ""), 4000);
  };

  function openFiring(f: CollectionFiring): void {
    app.outputsFor = f.firingId;
  }

  /** Re-cut this client's invoice for one firing, exactly as it was sent. */
  async function saveInvoice(client: string, f: CollectionFiring): Promise<void> {
    const rec = firings.list.find((x) => x.id === f.firingId);
    if (!rec) return;
    const d = invoiceData(rec, client);
    const rel = invoicePath(rec, client);
    if (!d || !rel) return say(t.collections.saveFailed);
    const abs = await outputs.savePdf(buildTicketHtml(d), rel);
    if (!abs) return say(t.collections.saveFailed);
    say(t.collections.savedTo(rel.join("/")));
    await outputs.reveal(abs);
  }

  /** The month on one page: every firing, and only what is still owed. */
  async function saveStatement(c: ClientCollection): Promise<void> {
    if (!month) return;
    const paidSum = c.total - c.outstanding;
    const d: StatementData = {
      studioName: settings.studioName,
      logoTop: brand.top || undefined,
      logoBottom: brand.bottom || undefined,
      note: settings.ticketNote || undefined,
      client: invoiceClientName(c.client),
      month: month.label,
      firings: c.firings.map((f) => ({
        title: f.title || f.kilnName,
        sub: [f.kilnName, fmtDay(f.at)].filter(Boolean).join(" · "),
        value: eur(f.amount),
        paid: f.paid,
      })),
      paidTotal: paidSum > 0 ? eur(paidSum) : undefined,
      provisional: monthIsOver ? undefined : today(),
      total: eur(c.outstanding),
      thanks: t.ticket.defaultThanks(settings.studioName),
    };
    const rel = [t.collections.title, month.key, `${c.client}_${month.key}.pdf`];
    const abs = await outputs.savePdf(buildStatementHtml(d), rel);
    if (!abs) return say(t.collections.saveFailed);
    say(t.collections.savedTo(rel.join("/")));
    await outputs.reveal(abs);
  }

  /**
   * The list for whoever collects. Only names and amounts: costs, partner cuts
   * and net are the studio's business, and any of them in a message that gets
   * forwarded is a figure charged to the wrong person.
   */
  function message(): string {
    if (!month) return "";
    const owing = month.clients.filter((c) => c.outstanding > 0);
    return collectionsReport(
      {
        month: month.label,
        clients: owing.map((c) => ({ name: c.client, amount: eur(c.outstanding) })),
        total: eur(owing.reduce((a, c) => a + c.outstanding, 0)),
        provisional: monthIsOver ? undefined : today(),
      },
      {
        heading: t.collections.reportHeading,
        intro: t.collections.reportIntro,
        total: t.collections.reportTotal,
        nothing: t.collections.reportNothing,
        provisional: t.collections.reportProvisional,
      },
    );
  }
  async function copyMessage(): Promise<void> {
    const ok = await copyText(message());
    say(ok ? t.collections.copied : t.collections.copyFailed);
  }
</script>

<div class="wrap">
  <div class="head">
    <div>
      <span class="screen-title">{t.collections.title}</span>
      <p class="faint sub">{t.collections.hint}</p>
    </div>
    <div class="headbtns">
      {#if note}<span class="faint snote">{note}</span>{/if}
      <!-- Always available. A running total is still worth sending; the message
           says so itself, which keeps holding once it's been pasted elsewhere. -->
      <button class="xbtn" onclick={copyMessage} title={monthIsOver ? "" : t.collections.exportOpen}>
        {t.collections.exportMessage}
      </button>
    </div>
  </div>

  <!-- Month carousel: what's behind you, where you are, what hasn't happened. -->
  <div class="carousel">
    <button class="cnav" onclick={() => go(older)} disabled={!older} aria-label={older?.label ?? ""}>‹</button>
    <div class="cslots">
      <button class="slot side" onclick={() => go(older)} disabled={!older}>
        {older ? older.label : ""}
      </button>
      <div class="slot now">
        <span class="nowlbl">{month?.label ?? ""}</span>
        {#if month && !monthIsOver}<span class="tagline">{t.collections.monthCurrent}</span>{/if}
      </div>
      <button class="slot side" onclick={() => go(newer)} disabled={!newer}>
        {newer ? newer.label : t.collections.monthLocked}
      </button>
    </div>
    <button class="cnav" onclick={() => go(newer)} disabled={!newer} aria-label={newer?.label ?? ""}>›</button>
  </div>

  {#if data.length === 0}
    <div class="empty"><p>{t.collections.noMonths}</p></div>
  {:else if !month || month.clients.length === 0}
    <div class="empty"><p class="faint">{t.collections.nothingThisMonth}</p></div>
  {:else}
    <div class="totals">
      <div class="kt"><span class="ktl">{t.collections.billed}</span><span class="ktv">{eur(month.total)}</span></div>
      <div class="kt strong" class:clear={month.outstanding === 0}>
        <span class="ktl">{t.collections.outstanding}</span>
        <span class="ktv">{eur(month.outstanding)}</span>
      </div>
    </div>

    {#if month.outstanding === 0}
      <p class="faint allset">{t.collections.allSettled}</p>
    {/if}

    <div class="clients">
      {#each month.clients as c (c.client)}
        <section class="ccard" class:settled={c.settled}>
          <div class="chead">
            <button
              class="cmain"
              onclick={() => (openClient = openClient === c.client ? null : c.client)}
              aria-expanded={openClient === c.client}
            >
              <span class="caret" class:open={openClient === c.client}>›</span>
              <span class="cname">{c.client}</span>
              <span class="cmeta">{t.collections.firingsCount(c.firings.length)}</span>
            </button>

            <span class="camount" class:dim={c.settled}>
              {c.settled ? eur(c.total) : eur(c.outstanding)}
            </span>

            <button
              class="paybtn"
              class:on={c.settled}
              class:armed={arming === c.client}
              onclick={() => togglePaid(c)}
              title={c.settled ? t.collections.unmarkAsk : t.collections.markPaid}
            >
              <span class="tick">✓</span>
              <span class="paylbl">
                {#if arming === c.client}
                  {t.collections.unmarkAsk}
                {:else if c.settled}
                  {t.collections.settled}
                {:else}
                  {t.collections.markPaid}
                {/if}
              </span>
            </button>
          </div>

          {#if openClient === c.client}
            <div class="detail">
              {#each c.firings as f (f.firingId)}
                <div class="frow" class:paid={f.paid}>
                  <span class="fcell">
                    <span class="ft">{f.title || f.kilnName}</span>
                    <span class="fm">
                      {f.kilnName}{f.kilnName ? " · " : ""}{fmtDay(f.at)}
                      {#if f.paid && f.paidAt}<span class="pmark"> · {t.collections.paidOn(fmtPaid(f.paidAt))}</span>{/if}
                    </span>
                  </span>
                  <span class="famt" class:struck={f.paid}>{eur(f.amount)}</span>
                  <span class="facts">
                    <button class="mini" onclick={() => openFiring(f)}>{t.collections.openFiring}</button>
                    {#if isDesktop}
                      <button class="mini" onclick={() => saveInvoice(c.client, f)}>{t.collections.firingPdf}</button>
                    {/if}
                  </span>
                </div>
              {/each}

              {#if isDesktop}
                <div class="dfoot">
                  <button class="xbtn" onclick={() => saveStatement(c)}>{t.collections.statementPdf}</button>
                </div>
              {/if}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap {
    padding: 22px 26px 40px;
    max-width: 1100px;
    margin: 0 auto;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 18px;
  }
  .sub {
    margin: 6px 0 0;
    max-width: 60ch;
    font-size: 13px;
  }
  .headbtns {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .snote {
    font-size: 12px;
  }
  .xbtn {
    background: var(--panel-2);
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
  }
  .xbtn:hover:not(:disabled) {
    border-color: var(--text-faint);
  }
  .xbtn:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  /* ---- Month carousel ---- */
  .carousel {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  .cnav {
    background: none;
    border: 1px solid var(--line);
    color: var(--text-dim);
    border-radius: var(--radius-sm);
    width: 30px;
    height: 34px;
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
  }
  .cnav:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .cslots {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 10px;
    flex: 1;
  }
  .slot {
    background: none;
    border: none;
    font: inherit;
    font-size: 13px;
    color: var(--text-faint);
    padding: 8px 4px;
    cursor: pointer;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .slot.side:hover:not(:disabled) {
    color: var(--text-dim);
  }
  .slot.side:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .now {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    padding: 7px 22px;
    cursor: default;
  }
  .nowlbl {
    font-size: 15px;
    color: var(--text);
  }
  .tagline {
    font-size: 11px;
    color: var(--text-faint);
  }

  /* ---- Totals ---- */
  .totals {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
  }
  .kt {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    padding: 12px 16px;
  }
  .ktl {
    font-size: 12px;
    color: var(--text-dim);
  }
  .ktv {
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
  .kt.strong .ktv {
    color: var(--amber);
    font-weight: 600;
  }
  .kt.strong.clear .ktv {
    color: var(--green);
  }
  .allset {
    font-size: 13px;
    margin: 0 0 16px;
  }

  .empty {
    padding: 40px 0;
    text-align: center;
  }

  /* ---- Clients ---- */
  .clients {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ccard {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .ccard.settled {
    opacity: 0.72;
  }
  .chead {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 4px 12px 4px 4px;
  }
  .cmain {
    display: flex;
    align-items: baseline;
    gap: 10px;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    padding: 12px;
    cursor: pointer;
    min-width: 0;
  }
  .caret {
    color: var(--text-faint);
    transition: transform 0.15s ease;
    display: inline-block;
  }
  .caret.open {
    transform: rotate(90deg);
  }
  .cname {
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cmeta {
    font-size: 12px;
    color: var(--text-faint);
    white-space: nowrap;
  }
  .camount {
    font-size: 15px;
    font-variant-numeric: tabular-nums;
    color: var(--amber);
  }
  .camount.dim {
    color: var(--text-faint);
  }

  .paybtn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--panel-2);
    color: var(--text-dim);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 7px 13px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .paybtn:hover {
    border-color: var(--text-faint);
  }
  .paybtn .tick {
    opacity: 0.35;
  }
  .paybtn.on {
    color: var(--green);
  }
  .paybtn.on .tick {
    opacity: 1;
  }
  /* Armed for undo: same button, same tick, the app's accent — a state, not a
     different control, so nothing moves under the second press. */
  .paybtn.armed {
    color: var(--accent);
    border-color: var(--accent);
  }

  /* ---- Per-firing detail ---- */
  .detail {
    border-top: 1px solid var(--line-soft);
    padding: 6px 12px 12px;
  }
  .frow {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 9px 4px;
    border-bottom: 1px solid var(--line-soft);
  }
  .frow:last-of-type {
    border-bottom: none;
  }
  .fcell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .ft {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fm {
    font-size: 11px;
    color: var(--text-faint);
  }
  .pmark {
    color: var(--green);
  }
  .famt {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .famt.struck {
    color: var(--text-faint);
    text-decoration: line-through;
  }
  .facts {
    display: flex;
    gap: 6px;
  }
  .mini {
    background: none;
    border: 1px solid var(--line);
    color: var(--text-dim);
    border-radius: var(--radius-sm);
    padding: 5px 9px;
    font-size: 11px;
    cursor: pointer;
  }
  .mini:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
  .dfoot {
    display: flex;
    justify-content: flex-end;
    padding-top: 10px;
  }
</style>
