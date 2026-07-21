<script lang="ts">
  /**
   * "Who is Páramo?" — a small floating card that will hold the studio's links
   * (GitHub, shop, Ceramic Lab Tools). Placeholder content for now.
   */
  import { fly, fade } from "svelte/transition";
  import { t } from "../lib/i18n.svelte";

  let { onclose }: { onclose: () => void } = $props();
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="center">
  <div class="panel" role="dialog" aria-label={t.app.whoTitle} transition:fly={{ y: 14, duration: 200 }}>
    <div class="head">
      <h3>{t.app.whoTitle}</h3>
      <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
    </div>
    <p class="body">{t.app.whoBody}</p>
    <p class="faint soon">{t.app.whoSoon}</p>
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
  /* Centred like the Client Book: roomy enough to actually read. The flex
     wrapper does the centring so the fly transition's transform is free. */
  .center {
    position: fixed;
    inset: 0;
    z-index: 71;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .panel {
    pointer-events: auto;
    width: min(560px, calc(100vw - 48px));
    max-height: min(70vh, 640px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 28px 32px 32px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h3 {
    font-size: 20px;
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
  .body {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-dim);
    margin: 0;
  }
  .soon {
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
  }
</style>
