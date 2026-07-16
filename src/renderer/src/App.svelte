<script lang="ts">
  import { onMount } from "svelte";
  import { app, go, loadApp } from "./lib/firing.svelte";
  import { vault } from "./lib/storage";
  import { kilnStore } from "./lib/kilns.svelte";
  import Home from "./routes/Home.svelte";
  import FiringPlanner from "./routes/FiringPlanner.svelte";
  import KilnProfiles from "./routes/KilnProfiles.svelte";
  import AppSettings from "./routes/AppSettings.svelte";
  import AgendaCard from "./components/AgendaCard.svelte";
  import ExportCard from "./components/ExportCard.svelte";
  import VaultOnboarding from "./components/VaultOnboarding.svelte";
  import FirstKilnPrompt from "./components/FirstKilnPrompt.svelte";

  let ready = $state(false);
  let needsVault = $state(false);
  let vaultConfigured = $state(false);

  onMount(async () => {
    // Local-first: data lives in a folder the user owns. Make sure it's there
    // (and hasn't been moved/deleted) before loading. On web this is a no-op.
    const s = await vault.status();
    if (s.valid) {
      await loadApp();
      ready = true;
      if (kilnStore.list.length === 0) app.firstKilnOpen = true;
    } else {
      vaultConfigured = s.configured;
      needsVault = true;
    }
  });

  async function onVaultReady(): Promise<void> {
    needsVault = false;
    await loadApp();
    ready = true;
    if (kilnStore.list.length === 0) app.firstKilnOpen = true;
  }

  const inFiring = $derived(app.screen === "firing");
  const tabs: { id: "home" | "kilnProfiles" | "appSettings"; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "kilnProfiles", label: "Kiln Profiles" },
    { id: "appSettings", label: "App Settings" },
  ];

  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (e.key === "Escape") {
      if (app.agendaOpen) {
        app.agendaOpen = false;
        app.agendaAddFor = null;
      } else if (!app.exportOpen) {
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

    <button class="agenda-tab" onclick={() => (app.agendaOpen = true)} title="Client agenda (A)">
      <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" class="ag-ic">
        <rect x="4" y="3.5" width="15" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.4" />
        <line x1="8" y1="3.5" x2="8" y2="20.5" stroke="currentColor" stroke-width="1.4" />
        <line x1="11" y1="8.5" x2="16" y2="8.5" stroke="currentColor" stroke-width="1.4" />
        <line x1="11" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.4" />
      </svg>
      Agenda
    </button>
  </header>

  <nav class="tabs">
    {#if inFiring}
      <button class="back" onclick={() => go("home")}>← Home</button>
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
{#if app.exportOpen}
  <ExportCard />
{/if}

<style>
  .app {
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
  .brand {
    margin: 0;
    text-align: center;
    font-weight: 400;
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
    position: absolute;
    right: 10px;
    top: -6px;
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
