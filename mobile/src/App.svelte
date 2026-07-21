<script lang="ts">
  import { onMount } from "svelte";
  import { synced, draft, loadCached, seedFixture } from "./lib/loader.svelte";
  import { loadPairing, autoSync, sync } from "./lib/sync.svelte";
  import { loadLocale, t, LOCALES, getLocale, setLocale } from "./lib/i18n.svelte";
  import Drafts from "./routes/Drafts.svelte";
  import PickKiln from "./routes/PickKiln.svelte";
  import Loader from "./routes/Loader.svelte";

  let ready = $state(false);
  let screen = $state<"drafts" | "pick" | "loading">("drafts");

  /**
   * This is a phone tool: loading a kiln means standing at the kiln. On a
   * desktop browser we point people back to the QR in the desktop app instead
   * of letting them use (and pair) it from a computer. A mouse on a wide screen
   * is the signal — narrow/touch windows still work, so real phones and
   * on-device testing are never blocked.
   */
  let onDesktop = $state(false);

  onMount(async () => {
    onDesktop = window.matchMedia("(pointer: fine) and (min-width: 900px)").matches;
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

{#if onDesktop}
  <div class="deskwrap">
    <div class="deskcard">
      <span class="brand"><span class="wordmark">PÁRAMO</span> <span class="title">KILN LOADER</span></span>
      <svg viewBox="0 0 24 24" width="46" height="46" class="deskicon" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.3" />
        <line x1="10.6" y1="5.4" x2="13.4" y2="5.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
        <circle cx="12" cy="18.2" r="1" fill="currentColor" />
      </svg>
      <h1>{t.desktop.title}</h1>
      <p>{t.desktop.body}</p>
      <p class="get">{t.desktop.getApp}</p>
      <a class="repo" href="https://github.com/ParamoStudio/KilnManager" target="_blank" rel="noopener noreferrer">
        {t.desktop.repo}
      </a>
    </div>
  </div>
{:else}
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
        <!-- Dev fixture only when unpaired: once a computer is paired, its real
             kilns and clients are the only thing that should ever show up. -->
        {#if synced.kilns.length === 0 && !sync.paired}
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
{/if}

<style>
  /* Desktop visitors: this is a phone tool, send them to the QR. */
  .deskwrap {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
  }
  .deskcard {
    max-width: 460px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 18px;
    padding: 40px 36px;
  }
  .deskicon {
    color: var(--text-faint);
    margin-top: 4px;
  }
  .deskcard h1 {
    font-size: 22px;
    font-weight: 600;
  }
  .deskcard p {
    font-size: 15px;
    line-height: 1.65;
    color: var(--text-dim);
    margin: 0;
  }
  .deskcard .get {
    font-size: 13px;
    color: var(--text-faint);
    margin-top: 6px;
  }
  .repo {
    font-size: 14px;
    color: var(--accent);
    text-decoration: none;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 16px;
  }
  .repo:hover {
    border-color: var(--text-faint);
  }
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
