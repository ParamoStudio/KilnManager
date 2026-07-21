<script lang="ts">
  /**
   * "What is Páramo Studio? Who am I?" — the studio's own card: a short
   * introduction and the handful of links worth having (toolset, GitHub, shop,
   * Ko-fi), each in its own compartment.
   */
  import { fly, fade } from "svelte/transition";
  import { openLink } from "../lib/storage";
  import { t } from "../lib/i18n.svelte";

  let { onclose }: { onclose: () => void } = $props();

  const LINKS = {
    toolset: "https://paramostudio.github.io/nidus-tools/",
    github: "https://github.com/ParamoStudio",
    kilnMonitor: "https://github.com/ParamoStudio/KilnMonitor",
    shop: "https://paramo.studio",
    kofi: "https://ko-fi.com/paramostudio",
  };
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="center">
  <div class="panel" role="dialog" aria-label={t.app.whoTitle} transition:fly={{ y: 14, duration: 200 }}>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>

    <header class="head">
      <h3>{t.app.whoTitle}</h3>
      <span class="rule"></span>
    </header>

    <p class="intro">{t.app.whoIntro}</p>

    <div class="blocks">
      <section class="block">
        <h4>{t.app.whoToolsetTitle}</h4>
        <p>{t.app.whoToolsetBody}</p>
        <button class="link" onclick={() => openLink(LINKS.toolset)}>{t.app.whoToolsetLink}</button>
      </section>

      <section class="block">
        <h4>{t.app.whoGithubTitle}</h4>
        <p>{t.app.whoGithubBody}</p>
        <p class="sub">{t.app.whoKilnMonitor}</p>
        <div class="linkrow">
          <button class="link" onclick={() => openLink(LINKS.github)}>{t.app.whoGithubLink}</button>
          <button class="link ghost" onclick={() => openLink(LINKS.kilnMonitor)}>{t.app.whoKilnMonitorLink}</button>
        </div>
      </section>

      <section class="block">
        <h4>{t.app.whoShopTitle}</h4>
        <p>{t.app.whoShopBody}</p>
        <button class="link" onclick={() => openLink(LINKS.shop)}>{t.app.whoShopLink}</button>
      </section>

      <section class="block kofi">
        <h4>{t.app.whoKofiTitle}</h4>
        <p>{t.app.whoKofiBody}</p>
        <button class="link" onclick={() => openLink(LINKS.kofi)}>{t.app.whoKofiLink}</button>
      </section>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0, 0, 0, 0.55);
    border: none;
    cursor: default;
  }
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
    position: relative;
    pointer-events: auto;
    width: min(620px, calc(100vw - 48px));
    max-height: min(82vh, 780px);
    overflow-y: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 30px 34px 30px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
  }
  .x {
    position: absolute;
    top: 14px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 21px;
    line-height: 1;
  }
  .x:hover {
    color: var(--text);
  }
  .head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  h3 {
    font-size: 21px;
    font-weight: 600;
    text-align: center;
    letter-spacing: -0.01em;
  }
  .rule {
    width: 54px;
    height: 1px;
    background: color-mix(in srgb, var(--accent) 55%, var(--line));
  }
  .intro {
    font-size: 14.5px;
    line-height: 1.75;
    color: var(--text-dim);
    margin: 0 0 22px;
    text-align: center;
  }
  .blocks {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    padding: 16px 18px;
  }
  .block.kofi {
    border-color: color-mix(in srgb, var(--amber) 35%, var(--line-soft));
  }
  h4 {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .block p {
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--text-dim);
    margin: 0;
  }
  .block .sub {
    font-size: 12.5px;
    color: var(--text-faint);
    padding-left: 11px;
    border-left: 2px solid var(--line);
  }
  .linkrow {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .link {
    margin-top: 2px;
    background: none;
    border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
    border-radius: 9px;
    padding: 8px 14px;
    color: var(--accent);
    font-size: 13px;
  }
  .link:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .link.ghost {
    border-color: var(--line);
    color: var(--text-dim);
  }
  .link.ghost:hover {
    border-color: var(--text-faint);
    color: var(--text);
    background: none;
  }
</style>
