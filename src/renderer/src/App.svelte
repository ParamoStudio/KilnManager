<script lang="ts">
  import { onMount } from "svelte";
  import { storage, isDesktop } from "./lib/storage";
  import FiringPlanner from "./routes/FiringPlanner.svelte";
  import KilnProfiles from "./routes/KilnProfiles.svelte";
  import Pricing from "./routes/Pricing.svelte";
  import History from "./routes/History.svelte";

  type Tab = "planner" | "profiles" | "pricing" | "history";

  const tabs: { id: Tab; label: string }[] = [
    { id: "planner", label: "Firing Planner" },
    { id: "profiles", label: "Kiln Profiles" },
    { id: "pricing", label: "Pricing & Settings" },
    { id: "history", label: "History" },
  ];

  let active = $state<Tab>("planner");
  let loaded = $state(false);

  onMount(async () => {
    const saved = await storage.read<{ activeTab: Tab }>("ui");
    if (saved?.activeTab && tabs.some((t) => t.id === saved.activeTab)) active = saved.activeTab;
    loaded = true;
  });

  $effect(() => {
    if (loaded) void storage.write("ui", { activeTab: active });
  });
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
      <span class="env-pill" class:desktop={isDesktop}>{isDesktop ? "Local · offline" : "Web preview"}</span>
    </div>
  </header>

  <nav class="tabs">
    {#each tabs as tab (tab.id)}
      <button class="tab" class:active={active === tab.id} onclick={() => (active = tab.id)}>{tab.label}</button>
    {/each}
  </nav>

  <main class="content">
    {#if active === "planner"}
      <FiringPlanner />
    {:else if active === "profiles"}
      <KilnProfiles />
    {:else if active === "pricing"}
      <Pricing />
    {:else}
      <History />
    {/if}
  </main>
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 20px 28px 22px;
    gap: 12px;
    overflow: hidden;
  }
  .topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 22px;
  }
  .wordmark {
    font-size: 15px;
    letter-spacing: 0.28em;
    font-weight: 300;
    color: var(--text);
  }
  .titles h1 {
    font-size: 18px;
    letter-spacing: 0.13em;
    font-weight: 600;
  }
  .titles p {
    margin: 3px 0 0;
    font-size: 12px;
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
  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .tab {
    background: none;
    border: none;
    padding: 10px 15px;
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
  .content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
