<script lang="ts">
  import { vault } from "../lib/storage";
  import { t } from "../lib/i18n.svelte";

  let { configured, onready }: { configured: boolean; onready: () => void } = $props();

  let busy = $state(false);
  let error = $state<string | null>(null);

  async function pick(mode: "create" | "locate"): Promise<void> {
    busy = true;
    error = null;
    const r = await vault.pick(mode);
    busy = false;
    if (r.ok) {
      onready();
      return;
    }
    if (r.reason === "not-a-vault") {
      error = t.vaultOnboarding.errorNotAVault;
    } else if (r.reason !== "canceled") {
      error = t.vaultOnboarding.errorGeneric;
    }
  }
</script>

<div class="scrim"></div>
<div class="card" role="dialog" aria-label={t.vaultOnboarding.ariaLabel}>
  <div class="mark"><span class="wm">PÁRAMO</span><span class="tl">KILN MANAGER</span></div>

  {#if !configured}
    <h2>{t.vaultOnboarding.newTitle}</h2>
    <p>{@html t.vaultOnboarding.newBody}</p>
    <p class="faint small">{t.vaultOnboarding.newHint}</p>
    <button class="primary" onclick={() => pick("create")} disabled={busy}>{t.vaultOnboarding.chooseFolder}</button>
  {:else}
    <h2>{t.vaultOnboarding.lostTitle}</h2>
    <p>{t.vaultOnboarding.lostBody}</p>
    <div class="row">
      <button class="primary" onclick={() => pick("locate")} disabled={busy}>{t.vaultOnboarding.locateIt}</button>
      <button class="ghost" onclick={() => pick("create")} disabled={busy}>{t.vaultOnboarding.createNew}</button>
    </div>
  {/if}

  {#if error}<p class="err">{error}</p>{/if}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(4px);
    z-index: 90;
  }
  .card {
    position: fixed;
    z-index: 91;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 460px;
    max-width: 92vw;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 30px 30px 26px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    text-align: center;
  }
  .mark {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 20px;
  }
  .wm {
    font-size: 15px;
    letter-spacing: 0.24em;
    font-weight: 300;
    color: var(--text);
  }
  .tl {
    font-size: 15px;
    letter-spacing: 0.12em;
    font-weight: 600;
    color: var(--text);
  }
  h2 {
    font-size: 19px;
    font-weight: 600;
    margin: 0 0 10px;
  }
  p {
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-dim);
    margin: 0 0 12px;
  }
  .small {
    font-size: 12px;
  }
  .row {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .primary {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 9px;
    padding: 11px 22px;
    font-size: 14px;
    font-weight: 600;
    margin-top: 6px;
  }
  .primary:disabled {
    opacity: 0.5;
  }
  .ghost {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 11px 22px;
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    margin-top: 6px;
  }
  .ghost:hover {
    border-color: var(--text-faint);
  }
  .err {
    color: var(--amber);
    font-size: 12.5px;
    margin: 14px 0 0;
  }
</style>
