<script lang="ts">
  /**
   * The one-time card a first-time lab visitor sees. It says what the tool is,
   * shows what the desktop app adds as a short row of iconned features rather
   * than a paragraph, and is honest about where data lives. Shown once — a flag
   * in storage remembers it — and dismissible either by trying the tool
   * (Continue) or by leaving for the download.
   */
  import { fade, fly } from "svelte/transition";
  import { t } from "../lib/i18n.svelte";
  import { APP_URL } from "../lib/lab";
  import { openLink } from "../lib/storage";

  let { onclose }: { onclose: () => void } = $props();

  // Each feature is [icon key, label]. Icons are inline SVG so nothing loads.
  const features: { key: string; label: string }[] = [
    { key: "phone", label: t.labWelcome.featPhone },
    { key: "book", label: t.labWelcome.featBook },
    { key: "infinity", label: t.labWelcome.featUnlimited },
    { key: "log", label: t.labWelcome.featLog },
    { key: "sheet", label: t.labWelcome.featExcel },
    { key: "lock", label: t.labWelcome.featLocal },
  ];

  function download(): void {
    openLink(APP_URL);
    onclose();
  }
</script>

<button class="scrim" onclick={onclose} aria-label={t.common.close} transition:fade={{ duration: 160 }}></button>
<div class="center">
  <div class="card" role="dialog" aria-label={t.labWelcome.title} transition:fly={{ y: 16, duration: 240 }}>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>

    <span class="eyebrow">{t.labWelcome.eyebrow}</span>
    <h2>{t.labWelcome.title}</h2>
    <p class="lede">{t.labWelcome.lede}</p>

    <span class="fh">{t.labWelcome.featuresHead}</span>
    <div class="feats">
      {#each features as f (f.key)}
        <div class="feat">
          <span class="fic" aria-hidden="true">
            {#if f.key === "phone"}
              <svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.4" /><line x1="10.5" y1="5.3" x2="13.5" y2="5.3" /><circle cx="12" cy="18.2" r="0.9" fill="currentColor" stroke="none" /></svg>
            {:else if f.key === "book"}
              <svg viewBox="0 0 24 24"><rect x="4" y="3.5" width="15" height="17" rx="2" /><line x1="8" y1="3.5" x2="8" y2="20.5" /><line x1="11" y1="9" x2="16" y2="9" /><line x1="11" y1="13" x2="16" y2="13" /></svg>
            {:else if f.key === "infinity"}
              <svg viewBox="0 0 24 24"><path d="M8 12c0-2 -1.6-3.2 -3.2-3.2S1.6 10 1.6 12s1.6 3.2 3.2 3.2S8 14 8 12s1.6-3.2 3.2-3.2h7.6c1.6 0 3.2 1.2 3.2 3.2s-1.6 3.2-3.2 3.2-3.2-1.2-3.2-3.2" /></svg>
            {:else if f.key === "log"}
              <svg viewBox="0 0 24 24"><line x1="5" y1="6" x2="19" y2="6" /><line x1="5" y1="12" x2="19" y2="12" /><line x1="5" y1="18" x2="14" y2="18" /></svg>
            {:else if f.key === "sheet"}
              <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1.5" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
            {:else if f.key === "lock"}
              <svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
            {/if}
          </span>
          <span class="flabel">{f.label}</span>
        </div>
      {/each}
    </div>

    <p class="privacy">{t.labWelcome.privacy}</p>

    <div class="actions">
      <button class="cont" onclick={onclose}>{t.labWelcome.continue}</button>
      <button class="dl" onclick={download}>{t.labWelcome.download}</button>
    </div>
    <button class="gh" onclick={() => openLink("https://github.com/ParamoStudio/KilnManager")}>{t.labWelcome.openSource}</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.66);
    border: none;
    z-index: 80;
  }
  .center {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 81;
    pointer-events: none;
    padding: 20px;
  }
  .card {
    position: relative;
    pointer-events: auto;
    width: min(500px, 100%);
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 28px 28px 20px;
    display: flex;
    flex-direction: column;
  }
  .x {
    position: absolute;
    top: 12px;
    right: 14px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 22px;
    line-height: 1;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  h2 {
    font-size: 23px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 6px 0 0;
  }
  .lede {
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--text-dim);
    margin: 12px 0 0;
  }
  .fh {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-top: 22px;
  }
  .feats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 18px;
    margin-top: 12px;
  }
  .feat {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fic {
    flex: none;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--amber);
  }
  .fic svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .flabel {
    font-size: 13.5px;
    color: var(--text);
  }
  .privacy {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-dim);
    margin: 22px 0 0;
    padding: 12px 14px;
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    background: var(--panel-2);
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  .cont,
  .dl {
    flex: 1;
    border-radius: 999px;
    padding: 13px 16px;
    font-size: 14px;
    border: 1px solid var(--line);
    background: none;
    color: var(--text-dim);
  }
  .cont:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
  .dl {
    border-color: color-mix(in srgb, var(--amber) 60%, var(--line));
    color: var(--amber);
  }
  .gh {
    align-self: center;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 12px;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 12px;
  }
  @media (max-width: 460px) {
    .feats {
      grid-template-columns: 1fr;
    }
  }
</style>
