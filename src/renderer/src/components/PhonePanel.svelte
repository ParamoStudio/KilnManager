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
  import { syncDirty } from "../lib/syncflags.svelte";
  import { bridgeConfigured } from "../lib/syncconfig";
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
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="panel" role="dialog" aria-label={t.phone.title} transition:fly={{ y: 16, duration: 200 }}>
  <div class="head">
    <h3>{t.phone.title}</h3>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
  </div>
  <p class="faint intro">{t.phone.intro}</p>

  {#if !bridgeConfigured()}
    <p class="notready">{t.phone.notConfigured}</p>
  {:else if !phone.paired}
    <button class="gen" onclick={generatePairing}>{t.phone.generate}</button>
  {:else}
    <div class="qr">{@html qrSvg}</div>
    <p class="faint scan">{t.phone.scanHint}</p>
    <div class="prow">
      <button class="mini" onclick={generatePairing}>{t.phone.regenerate}</button>
      <button class="mini danger" onclick={revokePairing}>{t.phone.revoke}</button>
    </div>

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
        <span class="pcount">{t.phone.pending(phone.pending)}</span>
        <button class="import" onclick={doImport}>{t.phone.importNow(phone.pending)}</button>
      {:else if imported > 0}
        <span class="faint">{t.phone.imported(imported)}</span>
      {:else}
        <span class="faint">{t.phone.pendingNone}</span>
      {/if}
    </div>
  {/if}
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
