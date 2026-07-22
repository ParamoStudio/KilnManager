<script lang="ts">
  /**
   * "What is Páramo Studio? Who am I?" — the studio's own card: a short
   * introduction and the links worth having, each in its own compartment.
   * Two columns so the whole thing reads in one go, without scrolling.
   */
  import { fly, fade } from "svelte/transition";
  import { openLink } from "../lib/storage";
  import { t } from "../lib/i18n.svelte";

  let { onclose }: { onclose: () => void } = $props();

  const LINKS = {
    // Points at the repo, not the Pages site: the repo exists today and the
    // site doesn't, and a link that 404s is worse than one that lands
    // somewhere honest. Swap to https://paramostudio.github.io/CeramicLab/
    // once Pages is serving it.
    toolset: "https://github.com/ParamoStudio/CeramicLab",
    github: "https://github.com/ParamoStudio",
    kilnMonitor: "https://github.com/ParamoStudio/KilnMonitor",
    shop: "https://paramo.studio",
    kofi: "https://ko-fi.com/paramostudio",
  };
  const toolsetLive = true;
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 150 }}></button>
<div class="center">
  <div class="panel" role="dialog" aria-label={t.app.whoTitle} transition:fly={{ y: 14, duration: 200 }}>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>

    <header class="head">
      <h3>{t.app.whoTitle}</h3>
      <span class="rule"></span>
    </header>

    <!-- The introduction is the point of this card, so it's framed and leads. -->
    <blockquote class="intro">{t.app.whoIntro}</blockquote>

    <!-- Paired by length so each row's two cards come out the same height:
         the two short ones together, the two long ones together. -->
    <div class="grid">
      <section class="block">
        <div class="bh">
          <span class="ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <path d="M4 7h7M4 12h5M4 17h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" />
              <circle cx="17" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path d="M17 14v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </span>
          <h4>{t.app.whoToolsetTitle}</h4>
        </div>
        <p>{t.app.whoToolsetBody}</p>
        {#if toolsetLive}
          <button class="link" onclick={() => openLink(LINKS.toolset)}>{t.app.whoToolsetLink}</button>
        {:else}
          <span class="soon">{t.app.comingSoon}</span>
        {/if}
      </section>

      <section class="block kofi">
        <div class="bh">
          <span class="ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <path d="M16 9.5h1.8a2.2 2.2 0 0 1 0 4.4H16" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M7.5 3.5v2M11 3.5v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </span>
          <h4>{t.app.whoKofiTitle}</h4>
        </div>
        <p>{t.app.whoKofiBody}</p>
        <button class="link" onclick={() => openLink(LINKS.kofi)}>{t.app.whoKofiLink}</button>
      </section>

      <section class="block">
        <div class="bh">
          <span class="ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.85 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.79.62-3.38-1.37-3.38-1.37-.46-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
              />
            </svg>
          </span>
          <h4>{t.app.whoGithubTitle}</h4>
        </div>
        <p>{t.app.whoGithubBody}</p>
        <p class="sub">{t.app.whoKilnMonitor}</p>
        <div class="linkrow">
          <button class="link" onclick={() => openLink(LINKS.github)}>{t.app.whoGithubLink}</button>
          <button class="link ghost" onclick={() => openLink(LINKS.kilnMonitor)}>{t.app.whoKilnMonitorLink}</button>
        </div>
      </section>

      <section class="block">
        <div class="bh">
          <span class="ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <path d="M6 8h12l-1 11H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.7" />
            </svg>
          </span>
          <h4>{t.app.whoShopTitle}</h4>
        </div>
        <p>{t.app.whoShopBody}</p>
        <button class="link" onclick={() => openLink(LINKS.shop)}>{t.app.whoShopLink}</button>
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
  /* inset:0 resolves against the app's scaled root, so this is the real
     available space — unlike 100vh, which ignores the UI scale. */
  .center {
    position: fixed;
    inset: 0;
    z-index: 71;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 26px;
    pointer-events: none;
  }
  .panel {
    position: relative;
    pointer-events: auto;
    width: min(880px, 100%);
    max-height: 100%;
    overflow-y: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 24px 30px 26px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
  }
  .x {
    position: absolute;
    top: 12px;
    right: 14px;
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
    gap: 10px;
    margin-bottom: 12px;
  }
  h3 {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    letter-spacing: -0.01em;
  }
  .rule {
    width: 50px;
    height: 1px;
    background: color-mix(in srgb, var(--accent) 55%, var(--line));
  }
  /* The lead: framed, larger, and clearly the thing to read first. */
  .intro {
    font-size: 15px;
    line-height: 1.72;
    color: var(--text);
    margin: 0 0 16px;
    padding: 18px 26px;
    text-align: center;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-left: 2px solid color-mix(in srgb, var(--accent) 60%, var(--line));
    border-radius: 12px;
  }
  /* Two columns so it all lands in one screenful; stretch keeps the two cards
     in a row exactly the same height. */
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: stretch;
  }
  .block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    padding: 13px 15px 14px;
  }
  .block.kofi {
    border-color: color-mix(in srgb, var(--amber) 38%, var(--line-soft));
  }
  .bh {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 8px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
  }
  .block.kofi .ic {
    color: var(--amber);
    background: color-mix(in srgb, var(--amber) 14%, transparent);
    border-color: color-mix(in srgb, var(--amber) 45%, var(--line));
  }
  h4 {
    font-size: 11.5px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .block p {
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--text-dim);
    margin: 0;
  }
  .block .sub {
    font-size: 11.5px;
    color: var(--text-faint);
    padding-left: 10px;
    border-left: 2px solid var(--line);
  }
  .linkrow {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  /* Actions sit at the foot of the card, so paired cards line up. */
  .block > .link,
  .block > .linkrow,
  .block > .soon {
    margin-top: auto;
    padding-top: 4px;
  }
  .link {
    background: none;
    border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
    border-radius: 8px;
    padding: 7px 13px;
    color: var(--accent);
    font-size: 12.5px;
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
  .soon {
    font-size: 11px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-faint);
    border: 1px dashed var(--line);
    border-radius: 8px;
    padding: 6px 12px;
  }
</style>
