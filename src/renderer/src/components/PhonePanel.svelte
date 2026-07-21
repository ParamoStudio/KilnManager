<script lang="ts">
  /**
   * "Connect phone" floating panel — pair this computer with the phone loader
   * by scanning a QR, then push data down / import firings up. The endpoints
   * are fixed in syncconfig.ts, so there is nothing for the user to configure.
   */
  import QRCode from "qrcode";
  import { fly, fade } from "svelte/transition";
  import {
    phone,
    generatePairing,
    revokePairing,
    pairUrl,
    phoneSyncNow,
    importFromPhone,
  } from "../lib/phonesync.svelte";
  import { bridgeReady, relayBase, setCustomRelay, testRelay } from "../lib/phonesync.svelte";
  import { syncDirty } from "../lib/syncflags.svelte";
  import { openLink } from "../lib/storage";
  import { t } from "../lib/i18n.svelte";

  let { onclose }: { onclose: () => void } = $props();

  const dirty = $derived(syncDirty.contacts || syncDirty.kilns);

  let qrSvg = $state("");
  $effect(() => {
    const url = phone.paired ? pairUrl() : "";
    if (!url) {
      qrSvg = "";
      return;
    }
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b0b0d", light: "#ffffff" } })
      .then((s) => (qrSvg = s))
      .catch(() => (qrSvg = ""));
  });

  let imported = $state(0);
  async function doImport(): Promise<void> {
    imported = await importFromPhone();
  }

  // ---- Advanced: run your own relay ---------------------------------------
  const HOWTO = "https://github.com/ParamoStudio/KilnManager/blob/main/docs/self-hosting-relay.md";
  let advancedOpen = $state(false);
  let relayDraft = $state("");
  let testState = $state<"idle" | "testing" | "ok" | "fail">("idle");
  let testError = $state("");

  let advInited = false;
  $effect(() => {
    if (advInited) return;
    advInited = true;
    relayDraft = phone.customRelay;
  });

  async function runTest(): Promise<void> {
    testState = "testing";
    const res = await testRelay(relayDraft);
    testError = res.error;
    testState = res.ok ? "ok" : "fail";
  }
  function saveRelay(): void {
    setCustomRelay(relayDraft);
    testState = "idle";
    advancedOpen = false;
  }
  function useDefaultRelay(): void {
    relayDraft = "";
    setCustomRelay("");
    testState = "idle";
  }

  // Two-step unpair: the first press explains what's at stake when firings are
  // still waiting, the second actually does it.
  let confirmUnpair = $state(false);
  function askUnpair(): void {
    if (!confirmUnpair && phone.pending > 0) {
      confirmUnpair = true;
      return;
    }
    revokePairing();
    confirmUnpair = false;
  }
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="panel" role="dialog" aria-label={t.phone.title} transition:fly={{ y: 16, duration: 200 }}>
  <div class="head">
    <h3>{t.phone.title}</h3>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
  </div>
  <p class="faint intro">{t.phone.intro}</p>

  {#if !bridgeReady()}
    <p class="notready">{t.phone.notConfigured}</p>
  {:else if !phone.paired}
    <button class="gen" onclick={generatePairing}>{t.phone.generate}</button>
  {:else}
    <div class="qr">{@html qrSvg}</div>
    <p class="faint scan">{t.phone.scanHint}</p>
    <div class="prow">
      <button class="mini" onclick={generatePairing}>{t.phone.regenerate}</button>
      <button class="mini danger" onclick={askUnpair}>{confirmUnpair ? t.phone.unpairAnyway : t.phone.revoke}</button>
    </div>
    <!-- Unpairing with firings still on the relay would strand them: the next
         pairing gets a fresh channel and they'd never arrive. Say so first. -->
    {#if confirmUnpair && phone.pending > 0}
      <p class="warn">{t.phone.unpairWarn(phone.pending)}</p>
    {/if}

    <div class="statusrow">
      <button class="push" disabled={phone.busy} onclick={() => phoneSyncNow()}>
        {phone.busy ? t.phone.pushing : t.phone.pushNow}
      </button>
      <span class="stat faint">
        {#if phone.lastError}<span class="err">{t.phone.syncError}</span>
        {:else if dirty}{t.phone.unsent}
        {:else}{t.phone.upToDate}{/if}
      </span>
    </div>

    <div class="pending">
      {#if phone.pending > 0}
        <span class="pcount">{t.phone.pendingSplit(phone.pendingNew, phone.pendingUpdate)}</span>
        <button class="import" onclick={doImport}>{t.phone.importNow(phone.pendingNew, phone.pendingUpdate)}</button>
      {:else if imported > 0}
        <span class="faint">{t.phone.imported(imported)}</span>
      {:else}
        <span class="faint">{t.phone.pendingNone}</span>
      {/if}
    </div>
  {/if}

  <!-- Self-hosting: deliberately tucked away at the bottom. Almost nobody needs
       it, but a studio that wants its data on its own infrastructure can. -->
  <div class="advanced">
    <button class="advtoggle" onclick={() => (advancedOpen = !advancedOpen)}>
      {advancedOpen ? "▾" : "▸"} {t.phone.advanced}
    </button>
    {#if advancedOpen}
      <div class="advbody">
        <p class="faint advhint">{t.phone.relayExplain}</p>
        <input
          class="relayinput"
          bind:value={relayDraft}
          placeholder={t.phone.relayPlaceholder}
          oninput={() => (testState = "idle")}
        />
        <div class="advrow">
          <button class="mini" onclick={runTest} disabled={testState === "testing" || !relayDraft.trim()}>
            {testState === "testing" ? t.phone.relayTesting : t.phone.relayTest}
          </button>
          {#if testState === "ok"}
            <span class="tick">✓ {t.phone.relayOk}</span>
          {:else if testState === "fail"}
            <span class="cross">✕ {t.phone.relayFail(testError)}</span>
          {/if}
        </div>
        {#if testState === "ok"}
          <p class="warn">{t.phone.relaySwitchWarn}</p>
          <button class="gen" onclick={saveRelay}>{t.phone.relayUse}</button>
        {/if}
        <div class="advrow">
          <button class="link" onclick={() => openLink(HOWTO)}>{t.phone.relayHowTo}</button>
          {#if phone.customRelay}
            <button class="mini" onclick={useDefaultRelay}>{t.phone.relayDefault}</button>
          {/if}
        </div>
        <p class="faint current">{t.phone.relayCurrent(phone.customRelay || t.phone.relayParamo)}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: default;
  }
  .panel {
    position: fixed;
    z-index: 71;
    top: 72px;
    right: 16px;
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h3 {
    font-size: 15px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
  }
  .x:hover {
    color: var(--text);
  }
  .intro {
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .notready {
    font-size: 12px;
    line-height: 1.5;
    color: var(--amber);
    margin: 0;
  }
  .gen {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 9px;
    padding: 11px;
    font-size: 13px;
    font-weight: 600;
  }
  .qr {
    align-self: center;
    width: 190px;
    height: 190px;
    background: #fff;
    border-radius: 12px;
    padding: 10px;
  }
  .qr :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .scan {
    text-align: center;
    font-size: 11.5px;
    line-height: 1.5;
    margin: 0;
  }
  .prow {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .mini {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 12px;
    color: var(--text-dim);
    font-size: 12px;
  }
  .mini:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .mini.danger:hover {
    border-color: #e88;
    color: #e88;
  }
  .warn {
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--amber);
    margin: 0;
  }
  .advanced {
    border-top: 1px solid var(--line-soft);
    padding-top: 10px;
    margin-top: 2px;
  }
  .advtoggle {
    background: none;
    border: none;
    padding: 0;
    color: var(--text-faint);
    font-size: 11.5px;
  }
  .advtoggle:hover {
    color: var(--text-dim);
  }
  .advbody {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .advhint {
    font-size: 11.5px;
    line-height: 1.55;
    margin: 0;
  }
  .relayinput {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
    font-size: 12px;
  }
  .relayinput:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .advrow {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }
  .tick {
    font-size: 12px;
    color: var(--green, #7fdca4);
  }
  .cross {
    font-size: 11.5px;
    color: var(--amber);
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-size: 11.5px;
    text-decoration: underline;
  }
  .current {
    font-size: 11px;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .statusrow {
    display: flex;
    align-items: center;
    gap: 10px;
    border-top: 1px solid var(--line-soft);
    padding-top: 10px;
  }
  .push {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text);
    font-size: 12.5px;
  }
  .push:disabled {
    opacity: 0.5;
  }
  .stat {
    font-size: 11.5px;
    flex: 1;
  }
  .stat .err {
    color: var(--amber);
  }
  .pending {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .pcount {
    font-size: 12.5px;
    color: var(--amber);
    flex: 1;
  }
  .import {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12.5px;
    font-weight: 600;
  }
</style>
