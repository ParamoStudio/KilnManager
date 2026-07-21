<script lang="ts">
  import { onMount } from "svelte";
  import { app, go, loadApp } from "./lib/firing.svelte";
  import { loadPhoneSync, phoneSyncOnOpen } from "./lib/phonesync.svelte";
  import PhonePanel from "./components/PhonePanel.svelte";
  import WhoIsParamo from "./components/WhoIsParamo.svelte";
  import { vault, openLink } from "./lib/storage";
  import { settings, markKofiSupported } from "./lib/settings.svelte";
  import { t } from "./lib/i18n.svelte";
  import { kilnStore } from "./lib/kilns.svelte";
  import Home from "./routes/Home.svelte";
  import FiringPlanner from "./routes/FiringPlanner.svelte";
  import KilnProfiles from "./routes/KilnProfiles.svelte";
  import Expenses from "./routes/Expenses.svelte";
  import AppSettings from "./routes/AppSettings.svelte";
  import AgendaCard from "./components/AgendaCard.svelte";
  import OutputsPanel from "./components/OutputsPanel.svelte";
  import VaultOnboarding from "./components/VaultOnboarding.svelte";
  import FirstKilnPrompt from "./components/FirstKilnPrompt.svelte";

  let ready = $state(false);
  let needsVault = $state(false);
  let vaultConfigured = $state(false);
  // Ko-fi support nudge — floating, dismissable. A session × hides it until next
  // launch; opening the Ko-fi page marks it supported and hides it for good.
  let kofiDismissed = $state(false);
  const showKofi = $derived(ready && !settings.kofiSupported && !kofiDismissed);
  let phoneOpen = $state(false);
  let whoOpen = $state(false);

  /**
   * The layout is designed for a roomy desktop window. Rather than reflow every
   * panel, we scale the whole UI proportionally as the window narrows (CSS
   * zoom, so layout reflows at the scaled size). Below the floor there's no
   * sensible scale left, so we blur everything and ask for a bigger window.
   */
  const DESIGN_W = 1440;
  const MIN_W = 1000;
  let innerWidth = $state(DESIGN_W);
  const tooSmall = $derived(innerWidth > 0 && innerWidth < MIN_W);
  const uiScale = $derived(Math.min(1, Math.max(MIN_W / DESIGN_W, innerWidth / DESIGN_W)));

  const KOFI = "https://ko-fi.com/paramostudio";
  // External links (placeholders — swap for the real URLs).
  function openKofi(): void {
    openLink(KOFI);
    markKofiSupported();
  }

  onMount(async () => {
    // Local-first: data lives in a folder the user owns. Make sure it's there
    // (and hasn't been moved/deleted) before loading. On web this is a no-op.
    const s = await vault.status();
    if (s.valid) {
      await bootstrap();
    } else {
      vaultConfigured = s.configured;
      needsVault = true;
    }
  });

  // Never leave the app blank: even if a load step fails, show the UI.
  async function bootstrap(): Promise<void> {
    try {
      await loadApp();
      await loadPhoneSync();
    } catch (err) {
      console.error("loadApp failed", err);
    } finally {
      ready = true;
      if (kilnStore.list.length === 0) app.firstKilnOpen = true;
      // Non-blocking: refresh the phone's data + see if firings are waiting.
      void phoneSyncOnOpen();
    }
  }

  async function onVaultReady(): Promise<void> {
    needsVault = false;
    await bootstrap();
  }

  const inFiring = $derived(app.screen === "firing");
  const tabs = $derived<{ id: "home" | "kilnProfiles" | "expenses" | "appSettings"; label: string }[]>([
    { id: "home", label: t.app.tabHome },
    { id: "expenses", label: t.app.tabExpenses },
    { id: "kilnProfiles", label: t.app.tabKilnProfiles },
    { id: "appSettings", label: t.app.tabAppSettings },
  ]);

  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (e.key === "Escape") {
      if (app.agendaOpen) {
        app.agendaOpen = false;
        app.agendaAddFor = null;
      } else if (app.outputsFor) {
        app.outputsFor = null;
      } else {
        go("home");
      }
      return;
    }
    if (!typing && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      app.agendaOpen = true;
    }
  }
</script>

<svelte:window onkeydown={onKey} bind:innerWidth />

{#if tooSmall}
  <div class="toosmall" role="alertdialog">
    <div class="ts-card">
      <h2>{t.app.tooSmallTitle}</h2>
      <p>{t.app.tooSmallBody}</p>
    </div>
  </div>
{/if}

<!-- Everything lives inside the scaled root: a plain CSS transform, so shrinking
     the window is a GPU composite instead of a full relayout (no stepping), and
     the root is sized as viewport/scale so it lands exactly on the viewport
     with no leftover gap at the bottom. -->
<div class="zoomroot" style="--s:{uiScale}">
<div class="app">
  <header class="topbar">
    <h1 class="brand">
      <span class="wordmark">PÁRAMO</span> <span class="title">KILN MANAGER</span>
    </h1>

    <div class="topright">
      <button class="agenda-tab" onclick={() => (app.agendaOpen = true)} title={t.app.clientBookShortcut}>
        <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" class="ag-ic">
          <rect x="4" y="3.5" width="15" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.4" />
          <line x1="8" y1="3.5" x2="8" y2="20.5" stroke="currentColor" stroke-width="1.4" />
          <line x1="11" y1="8.5" x2="16" y2="8.5" stroke="currentColor" stroke-width="1.4" />
          <line x1="11" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.4" />
        </svg>
        {t.app.clientBook}
      </button>
      <button class="sqbtn" onclick={() => (phoneOpen = true)} title={t.phone.title} aria-label={t.phone.title}>
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <rect x="7" y="2.5" width="10" height="19" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4" />
          <line x1="10.6" y1="5.4" x2="13.4" y2="5.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="12" cy="18.2" r="1" fill="currentColor" />
        </svg>
      </button>
      <button class="sqbtn" onclick={() => (whoOpen = true)} title={t.app.whoTitle} aria-label={t.app.whoTitle}>
        <span class="qmark">?</span>
      </button>
    </div>
  </header>

  {#if showKofi}
    <div class="kofi" role="note">
      <span class="kofi-txt">
        {t.app.kofiText}
        <button class="kofi-link" onclick={openKofi}>{t.app.kofiLink}</button>.
      </span>
      <button class="kofi-x" onclick={() => (kofiDismissed = true)} aria-label={t.app.dismiss}>×</button>
    </div>
  {/if}

  <nav class="tabs">
    {#if inFiring}
      <button class="back" onclick={() => go("home")}>{t.app.backToHome}</button>
    {:else}
      {#each tabs as tab (tab.id)}
        <button class="tab" class:active={app.screen === tab.id} onclick={() => go(tab.id)}>{tab.label}</button>
      {/each}
    {/if}
  </nav>

  <main class="content">
    {#if ready}
      {#if app.screen === "home"}
        <Home />
      {:else if app.screen === "firing"}
        <FiringPlanner />
      {:else if app.screen === "kilnProfiles"}
        <KilnProfiles />
      {:else if app.screen === "expenses"}
        <Expenses />
      {:else}
        <AppSettings />
      {/if}
    {/if}
  </main>
</div>

{#if needsVault}
  <VaultOnboarding configured={vaultConfigured} onready={onVaultReady} />
{/if}
{#if ready && app.firstKilnOpen}
  <FirstKilnPrompt />
{/if}
{#if phoneOpen}
  <PhonePanel onclose={() => (phoneOpen = false)} />
{/if}
{#if whoOpen}
  <WhoIsParamo onclose={() => (whoOpen = false)} />
{/if}
{#if app.agendaOpen}
  <AgendaCard
    onclose={() => {
      app.agendaOpen = false;
      app.agendaAddFor = null;
    }}
  />
{/if}
{#if app.outputsFor}
  <OutputsPanel id={app.outputsFor} onclose={() => (app.outputsFor = null)} />
{/if}
</div>

<style>
  .zoomroot {
    position: fixed;
    top: 0;
    left: 0;
    width: calc(100vw / var(--s));
    height: calc(100vh / var(--s));
    transform: scale(var(--s));
    transform-origin: top left;
  }
  .app {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 18px 26px 20px;
    gap: 14px;
    overflow: hidden;
  }
  .topbar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-height: 40px;
  }
  /* Ko-fi nudge: a floating pill under the title — narrow, out of flow so
     dismissing it never reshuffles the layout. */
  .kofi {
    position: absolute;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 7px 9px 7px 16px;
    border: 1px solid color-mix(in srgb, #ff9d42 55%, transparent);
    background: color-mix(in srgb, #ff9d42 16%, var(--panel));
    border-radius: 999px;
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
    max-width: 92%;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .kofi-txt {
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .kofi-link {
    background: none;
    border: none;
    padding: 0;
    color: #ffab5c;
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .kofi-x {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 17px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
  }
  .kofi-x:hover {
    color: var(--text);
  }
  .kofi-x {
    border-radius: 999px;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .kofi-x:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .brand {
    margin: 0;
    text-align: center;
    font-weight: 400;
  }
  /* Top-right cluster: Client Book + subtle external links. */
  .topright {
    position: absolute;
    right: 10px;
    top: 0;
    display: flex;
    align-items: stretch;
    gap: 8px;
  }
  /* Window too narrow to scale any further: blur the app, ask for more room. */
  .toosmall {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(11, 11, 13, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  .ts-card {
    max-width: 420px;
    text-align: center;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 28px 30px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
  }
  .ts-card h2 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  .ts-card p {
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-dim);
    margin: 0;
  }

  /* Square icon buttons beside the Client Book tab: same height, icon only. */
  .sqbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    align-self: stretch;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px 8px 16px 16px;
    border-top-width: 2px;
    border-top-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    color: var(--text-dim);
  }
  .sqbtn:hover {
    color: var(--text);
    border-color: var(--text-faint);
    border-top-color: var(--accent);
  }
  .qmark {
    font-size: 19px;
    font-weight: 400;
    line-height: 1;
  }
  .wordmark {
    font-size: 21px;
    letter-spacing: 0.26em;
    font-weight: 300;
    color: var(--text);
  }
  .title {
    font-size: 21px;
    letter-spacing: 0.13em;
    font-weight: 600;
    margin-left: 6px;
  }
  .agenda-tab {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px 8px 16px 16px;
    border-top-width: 2px;
    border-top-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    padding: 14px 26px;
    color: var(--text);
    font-size: 17px;
  }
  .agenda-tab:hover {
    border-color: var(--text-faint);
    border-top-color: var(--accent);
  }
  .ag-ic {
    color: var(--text-dim);
  }
  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .tab {
    background: none;
    border: none;
    padding: 10px 16px;
    font-size: 15px;
    color: var(--text-faint);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.18s ease, border-color 0.18s ease;
  }
  .tab:hover {
    color: var(--text-dim);
  }
  .tab.active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }
  .back {
    background: none;
    border: none;
    padding: 10px 4px 10px 0;
    color: var(--text-dim);
    font-size: 15px;
  }
  .back:hover {
    color: var(--text);
  }
  .content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
