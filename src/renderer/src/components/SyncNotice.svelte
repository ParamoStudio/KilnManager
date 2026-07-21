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
  <div class="notice" class:done={phone.phase === "done"} role="status" transition:fly={{ y: -6, duration: 200 }}>
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
  /* Lives inside the Current Firings panel, right under its title — that's
     where the firings it's fetching will land. */
  .notice {
    display: flex;
    align-items: center;
    gap: 9px;
    background: color-mix(in srgb, var(--amber) 12%, var(--panel-2));
    border: 1px solid color-mix(in srgb, var(--amber) 55%, var(--line));
    border-radius: 10px;
    padding: 9px 13px;
    font-size: 12.5px;
    color: var(--text);
    flex-shrink: 0;
  }
  .notice.done {
    background: color-mix(in srgb, var(--green, #7fdca4) 10%, var(--panel-2));
    border-color: color-mix(in srgb, var(--green, #7fdca4) 45%, var(--line));
  }
  .spin {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--amber) 30%, transparent);
    border-top-color: var(--amber);
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
