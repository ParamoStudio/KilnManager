<script lang="ts">
  /**
   * A small, self-dismissing notice so the phone sync is *visible*: it says it's
   * looking, then says what it found. Without it the import happens silently and
   * firings just appear, which reads like a glitch rather than a feature.
   */
  import { fly, fade } from "svelte/transition";
  import { phone } from "../lib/phonesync.svelte";
  import { t } from "../lib/i18n.svelte";

  const found = $derived(phone.lastCreated + phone.lastUpdated);
</script>

{#if phone.phase !== "idle"}
  <div class="notice" class:done={phone.phase === "done"} role="status" transition:fly={{ y: -10, duration: 200 }}>
    {#if phone.phase === "checking"}
      <span class="spin" aria-hidden="true"></span>
      <span>{t.phone.checking}</span>
    {:else if phone.lastError}
      <span class="dot err" aria-hidden="true"></span>
      <span>{t.phone.syncError}</span>
    {:else if found === 0}
      <span class="dot ok" aria-hidden="true"></span>
      <span class="faint" transition:fade={{ duration: 120 }}>{t.phone.nothingNew}</span>
    {:else}
      <span class="dot ok" aria-hidden="true"></span>
      <span>
        {#if phone.lastCreated > 0}{t.phone.gotNew(phone.lastCreated)}{/if}
        {#if phone.lastCreated > 0 && phone.lastUpdated > 0} · {/if}
        {#if phone.lastUpdated > 0}{t.phone.gotUpdated(phone.lastUpdated)}{/if}
      </span>
    {/if}
  </div>
{/if}

<style>
  .notice {
    position: fixed;
    z-index: 90;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 9px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12.5px;
    color: var(--text);
    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.55);
  }
  .notice.done {
    border-color: color-mix(in srgb, var(--green, #7fdca4) 35%, var(--line));
  }
  .spin {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--text-faint) 60%, transparent);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green, #7fdca4);
  }
  .dot.err {
    background: var(--amber);
  }
</style>
