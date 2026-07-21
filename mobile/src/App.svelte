<script lang="ts">
  import { onMount } from "svelte";
  import { synced, draft, loadCached, seedFixture } from "./lib/loader.svelte";
  import { loadPairing, autoSync } from "./lib/sync.svelte";
  import { loadLocale, t, LOCALES, getLocale, setLocale } from "./lib/i18n.svelte";
  import Drafts from "./routes/Drafts.svelte";
  import PickKiln from "./routes/PickKiln.svelte";
  import Loader from "./routes/Loader.svelte";

  let ready = $state(false);
  let screen = $state<"drafts" | "pick" | "loading">("drafts");

  onMount(async () => {
    await loadLocale();
    await loadPairing();
    await loadCached();
    ready = true;
    // If a draft was mid-edit when the phone was closed, jump straight back in.
    if (draft.active) screen = "loading";
    // Non-blocking: refresh cached kilns/contacts + clear already-imported drafts.
    void autoSync();
  });

  async function doSeed(): Promise<void> {
    await seedFixture();
  }
</script>

<div class="shell">
  <header class="topbar">
    <span class="side"></span>
    <span class="brand"><span class="wordmark">PÁRAMO</span> <span class="title">KILN LOADER</span></span>
    <div class="lang side" role="group" aria-label="Language">
      {#each LOCALES as l (l.code)}
        <button class="langb" class:active={getLocale() === l.code} onclick={() => setLocale(l.code)}>{l.label}</button>
      {/each}
    </div>
  </header>
  <main class="content">
    {#if ready}
      {#if screen === "drafts"}
        <Drafts onnew={() => (screen = "pick")} onresume={() => (screen = "loading")} />
        {#if synced.kilns.length === 0}
          <button class="seed" onclick={doSeed}>{t.fixture.seedButton}</button>
        {/if}
      {:else if screen === "pick"}
        <PickKiln onpicked={() => (screen = "loading")} onback={() => (screen = "drafts")} />
      {:else}
        <Loader onexit={() => (screen = "drafts")} />
      {/if}
    {/if}
  </main>
</div>

<style>
  .shell {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 14px 12px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .brand {
    flex: 1;
    text-align: center;
    white-space: nowrap;
  }
  .side {
    flex-shrink: 0;
  }
  .side:first-child {
    width: 64px;
  }
  .lang {
    display: flex;
    gap: 2px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 2px;
  }
  .langb {
    background: none;
    border: none;
    border-radius: 999px;
    padding: 5px 9px;
    color: var(--text-faint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .langb.active {
    background: var(--panel);
    color: var(--text);
  }
  .wordmark {
    font-size: 13px;
    letter-spacing: 0.16em;
    font-weight: 300;
  }
  .title {
    font-size: 13px;
    letter-spacing: 0.08em;
    font-weight: 600;
  }
  .content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
  .seed {
    display: block;
    margin: 20px auto 0;
    background: none;
    border: 1px dashed var(--line);
    border-radius: 10px;
    padding: 10px 16px;
    color: var(--text-faint);
    font-size: 12px;
  }
</style>
