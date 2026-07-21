<script lang="ts">
  import { synced, startNewDraft } from "../lib/loader.svelte";
  import { t } from "../lib/i18n.svelte";
  import KilnGlyph from "../components/KilnGlyph.svelte";

  let { onpicked, onback }: { onpicked: () => void; onback: () => void } = $props();

  const dims = (k: (typeof synced.kilns)[number]): string =>
    k.shape === "cylinder" ? `${k.diameterCm ?? 0} cm Ø` : `${k.widthCm ?? 0} × ${k.depthCm ?? 0} cm`;

  function pick(id: string): void {
    startNewDraft(id);
    onpicked();
  }
</script>

<div class="wrap">
  <div class="head">
    <button class="back" onclick={onback}>{t.common.back}</button>
    <span class="title">{t.loader.pickKiln}</span>
    <span class="spacer"></span>
  </div>
  <div class="list">
    {#each synced.kilns as k (k.id)}
      <button class="kcard" onclick={() => pick(k.id)}>
        <KilnGlyph shape={k.shape} size={38} />
        <span class="ktext">
          <span class="kname">{k.name}</span>
          <span class="faint kmeta">{t.loader.kilnSummary(dims(k), `${k.usableHeightCm} cm`)}</span>
        </span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
    {/each}
    {#if synced.kilns.length === 0}
      <p class="faint empty">—</p>
    {/if}
  </div>
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .back {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 14px;
    flex-shrink: 0;
  }
  .spacer {
    width: 52px;
    flex-shrink: 0;
  }
  .title {
    flex: 1;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
    text-align: center;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .kcard {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 16px 16px;
    text-align: left;
  }
  .kcard:active {
    border-color: var(--text-faint);
  }
  .ktext {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .kname {
    font-size: 16px;
    font-weight: 600;
  }
  .kmeta {
    font-size: 13px;
  }
  .chev {
    color: var(--text-faint);
    font-size: 22px;
    flex-shrink: 0;
  }
  .empty {
    text-align: center;
    padding: 20px;
  }
</style>
