<script lang="ts">
  import {
    drafts,
    synced,
    deleteDraft,
    deleteSyncedDrafts,
    resumeDraft,
    distinctClients,
    MAX_DRAFTS,
    pendingCount,
    type SavedDraft,
  } from "../lib/loader.svelte";
  import { sync, syncNow, pairingCode, applyPairingCode, markCodeOffered } from "../lib/sync.svelte";
  import { t } from "../lib/i18n.svelte";
  import { fly, fade } from "svelte/transition";

  let { onnew, onresume }: { onnew: () => void; onresume: () => void } = $props();

  function resume(id: string): void {
    if (resumeDraft(id)) onresume();
  }

  let confirmId = $state<string | null>(null);
  let info = $state<"none" | "how" | "sync" | "code" | "enter">("none");

  // The one-shot offer fires from the sync layer the first time this browser
  // pairs; showing it is this screen's job.
  let shown = false;
  $effect(() => {
    if (sync.offerCode && !shown) {
      shown = true;
      info = "code";
      void markCodeOffered();
    }
  });

  let copied = $state(false);
  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(pairingCode());
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard blocked (older iOS, permissions): the code is on screen
      // anyway, so selecting it by hand still works.
      copied = false;
    }
  }

  let codeInput = $state("");
  let enterState = $state<"idle" | "bad" | "ok">("idle");
  async function pasteCode(): Promise<void> {
    try {
      codeInput = await navigator.clipboard.readText();
      enterState = "idle";
    } catch {
      // Reading the clipboard needs permission the user may refuse; the field
      // is a plain text input, so long-press → Paste always works.
    }
  }
  async function connectCode(): Promise<void> {
    if (!(await applyPairingCode(codeInput))) {
      enterState = "bad";
      return;
    }
    // Pairing is done and stored the moment the code parses; close on that,
    // and let the sync run behind the panel. Waiting for the network here
    // would leave a modal sitting there looking frozen — and someone who has
    // just installed the app is exactly the person likely to have no signal.
    info = "none";
    codeInput = "";
    enterState = "idle";
    void syncNow();
  }

  const kilnOf = (kilnId: string) => synced.kilns.find((k) => k.id === kilnId) ?? null;

  // Synced firings float to the top (they're done, awaiting cleanup); drafts
  // follow. Order within each group is preserved.
  const ordered = $derived(
    [...drafts.list].sort((a, b) => (a.status === "synced" ? 0 : 1) - (b.status === "synced" ? 0 : 1)),
  );
  const hasSynced = $derived(drafts.list.some((d) => d.status === "synced"));
  const pending = $derived(pendingCount());

  function meta(d: SavedDraft): string {
    const n = distinctClients(d.planner);
    const clients = n === 0 ? t.drafts.unassigned : t.drafts.clientsCount(n);
    return `${t.drafts.shelvesCount(d.planner.levels.length)} · ${clients}`;
  }
  /** Full date, for firings the user never named. */
  function fmtFull(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }
  function fmtDay(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  function fmtTime(ts: number): string {
    return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  // The "Sync now" button syncs when paired; otherwise it opens the pairing
  // guidance sheet (you pair once by scanning the desktop's QR).
  function onSync(): void {
    if (sync.paired) void syncNow();
    else info = "sync";
  }
</script>

<div class="wrap">
  <div class="head">
    <h1>{t.drafts.title}</h1>
    <p class="sub faint">{t.drafts.subtitle}</p>
  </div>

  {#if drafts.list.length === 0}
    <div class="empty">
      <p>{t.drafts.empty}</p>
      <p class="faint">{t.drafts.emptyHint}</p>
    </div>
  {:else}
    <div class="list">
      {#each ordered as d (d.id)}
        {@const k = kilnOf(d.planner.kilnId)}
        {@const isSynced = d.status === "synced"}
        <div class="card" class:isSynced>
          <button class="body" onclick={() => resume(d.id)}>
            <!-- Same rule as the desktop: the firing's own name leads, and when
                 it hasn't got one the date it was started stands in. The kiln is
                 always shown underneath. -->
            <span class="dtitle">{d.title || fmtFull(d.createdAt)}</span>
            {#if k}<span class="faint ksub">{k.name}</span>{/if}
            <span class="faint dmeta">{meta(d)}</span>
            <span class="badge" class:green={isSynced}>
              <span class="dot"></span>
              {isSynced ? t.drafts.statusSynced : t.drafts.statusDraft}
              {#if isSynced}<span class="hint">· {t.drafts.autoDeleteHint}</span>{/if}
            </span>
          </button>
          <span class="chev" aria-hidden="true">›</span>
          {#if confirmId === d.id}
            <div class="confirm">
              <button class="cbtn yes" onclick={() => { deleteDraft(d.id); confirmId = null; }}>{t.common.yes}</button>
              <button class="cbtn" onclick={() => (confirmId = null)}>{t.common.no}</button>
            </div>
          {:else}
            <button class="del" onclick={() => (confirmId = d.id)} aria-label={t.common.delete}>×</button>
          {/if}
        </div>
      {/each}
    </div>

    {#if hasSynced}
      <button class="clearsynced" onclick={deleteSyncedDrafts}>{t.drafts.deleteSynced}</button>
    {/if}
  {/if}

  {#if pending >= MAX_DRAFTS}
    <p class="warn">{t.drafts.capReached(pending)}</p>
  {:else}
    <button class="newbtn" onclick={onnew} disabled={synced.kilns.length === 0}>{t.nav.newFiring}</button>
  {/if}

  <button class="syncnow" class:busy={sync.busy} onclick={onSync} disabled={sync.busy}>
    ⟳ {sync.busy ? t.drafts.syncing : t.drafts.syncNow}
  </button>
  {#if sync.mailboxFull}
    <span class="synced-line warn">{t.drafts.mailboxFull}</span>
  {:else if sync.lastError}
    <span class="synced-line err">{t.drafts.syncError}</span>
  {:else if sync.lastSyncedAt}
    <span class="synced-line faint">{t.drafts.lastSync(fmtTime(sync.lastSyncedAt))}</span>
  {/if}
  <button class="howitworks" onclick={() => (info = "how")}>ⓘ {t.home.howItWorks}</button>
  <button class="havecode" onclick={() => (info = "enter")}>{t.home.haveCode}</button>
</div>

{#if info !== "none"}
  <div class="scrim" role="presentation" onclick={() => (info = "none")} transition:fade={{ duration: 180 }}></div>
  <div class="sheet" role="dialog" transition:fly={{ y: 360, duration: 260 }}>
    <div class="handle"></div>
    <div class="shead">
      <span class="stitle">
        {#if info === "how"}{t.home.infoTitle}
        {:else if info === "sync"}{t.home.syncTitle}
        {:else if info === "code"}{t.home.codeTitle}
        {:else}{t.home.enterTitle}{/if}
      </span>
      <button class="x" onclick={() => (info = "none")} aria-label={t.common.close}>×</button>
    </div>

    {#if info === "how" || info === "sync"}
      {#if info === "sync"}<span class="soon">{t.home.notPaired}</span>{/if}
      <p class="sbody">{info === "how" ? t.home.infoBody : t.home.syncBody}</p>

    {:else if info === "code"}
      <p class="sbody">{t.home.codeBody}</p>
      <div class="codebox">{pairingCode()}</div>
      <div class="srow">
        <button class="sbtn primary" onclick={copyCode}>
          {copied ? `✓ ${t.home.codeCopied}` : t.home.codeCopy}
        </button>
        <button class="sbtn" onclick={() => (info = "none")}>{t.home.codeDone}</button>
      </div>

    {:else}
      <p class="sbody">{t.home.enterBody}</p>
      <input
        class="codein"
        bind:value={codeInput}
        oninput={() => (enterState = "idle")}
        placeholder={t.home.enterPlaceholder}
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if enterState === "bad"}<span class="cerr">{t.home.enterBad}</span>{/if}
      <div class="srow">
        <button class="sbtn" onclick={pasteCode}>{t.home.enterPaste}</button>
        <button class="sbtn primary" onclick={connectCode} disabled={!codeInput.trim()}>
          {t.home.enterConnect}
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px;
  }
  .head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 4px;
  }
  h1 {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .sub {
    font-size: 14px;
    margin: 0;
  }
  .empty {
    text-align: center;
    padding: 30px 10px;
  }
  .empty p {
    margin: 4px 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 14px;
    padding: 16px 16px;
  }
  .card.isSynced {
    border-color: color-mix(in srgb, var(--green) 30%, var(--line-soft));
  }
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    min-width: 0;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
  }
  .dtitle {
    font-size: 18px;
    font-weight: 600;
  }
  .ksub {
    font-size: 14px;
  }
  .dmeta {
    font-size: 13px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    border: 1px solid color-mix(in srgb, var(--amber) 45%, var(--line));
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--amber);
  }
  .badge .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--amber);
  }
  .badge.green {
    border-color: color-mix(in srgb, var(--green) 50%, var(--line));
    color: var(--green);
  }
  .badge.green .dot {
    background: var(--green);
  }
  .badge .hint {
    color: var(--text-faint);
  }
  .chev {
    color: var(--text-faint);
    font-size: 24px;
    padding-left: 8px;
    align-self: center;
  }
  .del {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 16px;
  }
  .confirm {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
  }
  .cbtn {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 5px 11px;
    color: var(--text-dim);
    font-size: 12px;
  }
  .cbtn.yes {
    background: color-mix(in srgb, #e07a5f 22%, var(--panel-2));
    border-color: color-mix(in srgb, #e07a5f 45%, var(--line));
    color: var(--text);
  }
  .clearsynced {
    align-self: center;
    background: none;
    border: 1px solid color-mix(in srgb, var(--green) 35%, var(--line));
    border-radius: 10px;
    padding: 9px 16px;
    color: color-mix(in srgb, var(--green) 80%, var(--text));
    font-size: 12.5px;
  }
  .newbtn {
    margin-top: 4px;
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 12px;
    padding: 16px;
    font-size: 15px;
    font-weight: 600;
  }
  .newbtn:disabled {
    opacity: 0.4;
  }
  .syncnow {
    background: none;
    border: 1px solid color-mix(in srgb, var(--amber) 45%, var(--line));
    border-radius: 12px;
    padding: 14px;
    color: var(--amber);
    font-size: 14px;
    font-weight: 500;
  }
  .syncnow.busy {
    opacity: 0.6;
  }
  .synced-line {
    align-self: center;
    font-size: 12px;
    margin-top: -4px;
  }
  .synced-line.err {
    color: var(--amber);
  }
  .howitworks {
    align-self: center;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 13px;
    padding: 6px 12px;
    margin-top: 2px;
  }
  .warn {
    font-size: 12.5px;
    color: var(--amber);
    text-align: center;
    margin: 0;
  }
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 60;
  }
  .sheet {
    position: fixed;
    z-index: 61;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px 18px 0 0;
    padding: 10px 20px calc(28px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
  }
  .handle {
    width: 36px;
    height: 4px;
    border-radius: 4px;
    background: var(--line);
    align-self: center;
    margin-bottom: 2px;
  }
  .shead {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .stitle {
    font-size: 15px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 22px;
    padding: 2px 6px;
  }
  .soon {
    align-self: flex-start;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid color-mix(in srgb, var(--amber) 45%, var(--line));
    border-radius: 999px;
    padding: 3px 10px;
  }
  .sbody {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-dim);
    margin: 0;
  }

  /* Quieter than "How it works": most people never need it, and the ones who
     do are looking for it. */
  .havecode {
    align-self: center;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 12.5px;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 2px 12px 6px;
  }

  /* The code itself: monospace and selectable, so it still works if the
     clipboard API is blocked and the user copies it by hand. */
  .codebox {
    user-select: all;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px;
    line-height: 1.5;
    word-break: break-all;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 12px;
    color: var(--text);
  }
  .codein {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 13px 12px;
    color: var(--text);
    width: 100%;
  }
  .codein:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--amber) 55%, var(--line));
  }
  .cerr {
    font-size: 12.5px;
    color: var(--amber);
  }
  .srow {
    display: flex;
    gap: 10px;
  }
  .sbtn {
    flex: 1;
    background: none;
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 13px 14px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .sbtn.primary {
    border-color: color-mix(in srgb, var(--amber) 55%, var(--line));
    color: var(--amber);
  }
  .sbtn:disabled {
    opacity: 0.4;
  }
</style>
