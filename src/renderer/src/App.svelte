<script lang="ts">
  import { onMount } from "svelte";
  import { isDesktop } from "./lib/storage";
  import { app, go, loadApp } from "./lib/firing.svelte";
  import Home from "./routes/Home.svelte";
  import FiringPlanner from "./routes/FiringPlanner.svelte";
  import KilnProfiles from "./routes/KilnProfiles.svelte";
  import AppSettings from "./routes/AppSettings.svelte";
  import AgendaCard from "./components/AgendaCard.svelte";
  import ExportCard from "./components/ExportCard.svelte";

  let ready = $state(false);
  onMount(async () => {
    await loadApp();
    ready = true;
  });

  const inFiring = $derived(app.screen === "firing");
  const tabs: { id: "home" | "kilnProfiles" | "appSettings"; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "kilnProfiles", label: "Kiln Profiles" },
    { id: "appSettings", label: "App Settings" },
  ];
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">
      <span class="wordmark">PÁRAMO</span>
      <div class="titles">
        <h1>KILN MANAGER</h1>
        <p class="muted">Plan, price and document shared kiln firings.</p>
      </div>
    </div>

    <div class="actions">
      <button class="agenda-btn" onclick={() => (app.agendaOpen = true)} title="Client agenda">
        <span class="ic">☰</span> Agenda
      </button>
      <span class="env-pill" class:desktop={isDesktop}>{isDesktop ? "Local · offline" : "Web preview"}</span>
    </div>
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 22px;
  }
  .wordmark {
    font-size: 15px;
    letter-spacing: 0.28em;
    font-weight: 300;
  }
  .titles h1 {
    font-size: 18px;
    letter-spacing: 0.13em;
    font-weight: 600;
  }
  .titles p {
    margin: 2px 0 0;
    font-size: 12px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
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
    padding: 9px 15px;
    font-size: 13px;
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
    padding: 9px 4px 9px 0;
    color: var(--text-dim);
    font-size: 13px;
  }
  .back:hover {
    color: var(--text);
  }
  .agenda-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 7px 14px;
    color: var(--text);
    font-size: 13px;
  }
  .agenda-btn:hover {
    border-color: var(--text-faint);
  }
  .ic {
    font-size: 12px;
    color: var(--text-dim);
  }
  .env-pill {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 5px 11px;
  }
  .env-pill.desktop {
    color: var(--green);
    border-color: color-mix(in srgb, var(--green) 40%, var(--line));
  }
  .content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
