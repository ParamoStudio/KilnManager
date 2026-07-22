<script lang="ts">
  /**
   * What the lab build says when you reach the edge of it.
   *
   * The tone matters: this is a free tool inside a free site, so it explains
   * what the desktop app *does* rather than scolding you for what this one
   * won't. Every message names a real reason — a client book is persistent
   * personal data, and a browser is not a good place to keep it.
   */
  import { fade, fly } from "svelte/transition";
  import { t } from "../lib/i18n.svelte";
  import { APP_URL } from "../lib/lab";
  import { openLink } from "../lib/storage";

  let {
    title,
    body,
    onclose,
    children,
  }: {
    title: string;
    body: string;
    onclose: () => void;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="center">
  <div class="panel" role="dialog" aria-label={title} transition:fly={{ y: 14, duration: 200 }}>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
    <h3>{title}</h3>
    <p>{body}</p>
    {#if children}<div class="extra">{@render children()}</div>{/if}
    <div class="actions">
      <button class="get" onclick={() => openLink(APP_URL)}>{t.lab.getTheApp}</button>
      <button class="stay" onclick={onclose}>{t.lab.keepUsing}</button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    z-index: 60;
  }
  .center {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 61;
    pointer-events: none;
  }
  .panel {
    position: relative;
    pointer-events: auto;
    width: min(440px, calc(100vw - 40px));
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 22px 22px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h3 {
    font-size: 17px;
    font-weight: 600;
    margin: 0;
    padding-right: 24px;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-dim);
  }
  .extra {
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .x {
    position: absolute;
    top: 10px;
    right: 12px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
  .get,
  .stay {
    flex: 1;
    border-radius: 999px;
    padding: 11px 14px;
    font-size: 13.5px;
    border: 1px solid var(--line);
    background: none;
    color: var(--text-dim);
  }
  .get {
    border-color: color-mix(in srgb, var(--amber) 55%, var(--line));
    color: var(--amber);
  }
</style>
