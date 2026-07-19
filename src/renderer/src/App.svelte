<script lang="ts">
  import { onMount } from "svelte";
  import { app, go, loadApp } from "./lib/firing.svelte";
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
  const KOFI = "https://ko-fi.com/paramostudio";
  // External links (placeholders — swap for the real URLs).
  const GITHUB = "https://github.com/ParamoStudio";
  const SHOP = "https://paramo.studio";
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
    } catch (err) {
      console.error("loadApp failed", err);
    } finally {
      ready = true;
      if (kilnStore.list.length === 0) app.firstKilnOpen = true;
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

<svelte:window onkeydown={onKey} />

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
      <div class="extras">
        <div class="extra-row">
          <button class="iconlink" onclick={() => openLink(GITHUB)} title={t.app.github} aria-label={t.app.github}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.85 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.79.62-3.38-1.37-3.38-1.37-.46-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/>
            </svg>
          </button>
          <button class="iconlink" onclick={() => openLink(SHOP)} title={t.app.shop} aria-label={t.app.shop}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 8h12l-1 11H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>
        </div>
        <button class="toolsbtn" title={t.app.comingSoon} aria-label={t.app.ceramicLabTools}>{t.app.ceramicLabTools}</button>
      </div>
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

<style>
  .app {
    position: relative;
    height: 100vh;
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
    align-items: center;
    gap: 26px;
  }
  /* External-links block: two rows of equal width, right-aligned. */
  .extras {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .extra-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .iconlink {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 9px;
    color: var(--text-faint);
  }
  .iconlink:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .toolsbtn {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 6px 12px;
    color: var(--text-faint);
    font-size: 11.5px;
    white-space: nowrap;
  }
  .toolsbtn:hover {
    color: var(--text);
    border-color: var(--text-faint);
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
