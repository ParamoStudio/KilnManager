<script lang="ts">
  import { draft, addShelf, roomForNewShelf, type MobileKiln } from "../lib/loader.svelte";
  import { t } from "../lib/i18n.svelte";
  import PostCylinder from "./PostCylinder.svelte";
  import { fly, fade } from "svelte/transition";

  let { kiln, onclose }: { kiln: MobileKiln; onclose: () => void } = $props();

  const maxSupport = $derived(roomForNewShelf(draft.planner));
  const thickness = $derived(kiln.defaultShelfThicknessCm);

  // Posts model (mirrors desktop ShelfEditor): the support height is the sum of
  // the chosen posts, so "5 + 8" stacks into a 13 cm support.
  let posts = $state<number[]>([]);
  let division = $state(1);
  let summing = $state(false);
  let customOpen = $state(false);
  let customVal = $state(8);

  let inited = false;
  $effect(() => {
    if (inited) return;
    inited = true;
    const fit = [...kiln.standardPostHeightsCm].sort((a, b) => a - b).find((p) => p <= maxSupport);
    posts = [fit ?? Math.max(2, Math.floor(maxSupport))];
  });

  const support = $derived(posts.reduce((a, b) => a + b, 0));
  const totalCm = $derived(support + thickness);
  const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  const splits: { n: number; label: string }[] = [
    { n: 1, label: t.loader.splitFull },
    { n: 2, label: "½" },
    { n: 3, label: "⅓" },
    { n: 4, label: "¼" },
    { n: 5, label: "⅕" },
  ];

  function addPost(v: number): void {
    if (summing) {
      if (posts.length >= 4) return; // never stack more than 4 posts
      const room = maxSupport - support;
      if (v <= room + 1e-6) posts = [...posts, v];
    } else {
      posts = [Math.min(v, maxSupport)];
    }
  }
  function clearSum(): void {
    if (posts.length > 1) posts = [posts[0]!];
    else summing = false;
  }
  function fillKiln(): void {
    posts = [Math.max(2, Math.round(maxSupport))];
    summing = false;
    customOpen = false;
  }
  function done(): void {
    addShelf(draft.planner, Math.max(2, Math.min(support || 2, maxSupport)), division);
    onclose();
  }
</script>

<div class="scrim" role="presentation" onclick={onclose} transition:fade={{ duration: 180 }}></div>
<div class="sheet" role="dialog" aria-label={t.loader.addShelf} transition:fly={{ y: 360, duration: 260 }}>
  <div class="handle"></div>
  <div class="head">
    <span class="title">{t.loader.addShelf.replace("+ ", "")}</span>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
  </div>

  <!-- Post preview: a line-art cylinder that grows with the summed height. -->
  <div class="preview">
    <PostCylinder cm={support} w={30} />
    <span class="sumtx">{t.loader.postsShelf(fmt(support), fmt(thickness))}</span>
  </div>

  <span class="lbl">{t.loader.shelfHeight}</span>
  <div class="presets">
    {#each kiln.standardPostHeightsCm as p (p)}
      <button class="chip" class:active={!summing && posts.length === 1 && posts[0] === p} disabled={!summing && p > maxSupport} onclick={() => addPost(p)}>
        {p}
      </button>
    {/each}
  </div>

  <!-- Sum strip: a "+" that turns into the stacked-posts slots -->
  <div class="sumstrip">
    {#if !summing}
      <button class="pluspill" onclick={() => (summing = true)} aria-label={t.loader.stackPosts}>+</button>
    {:else}
      <div class="slots">
        {#each posts as p, i (i)}
          <span class="slot">{p}</span>
          {#if i < posts.length - 1}<span class="op">+</span>{/if}
        {/each}
        <span class="eq">= {fmt(support)} {t.loader.cm}</span>
        <button class="xpill" onclick={clearSum} aria-label={t.common.close}>×</button>
      </div>
    {/if}
  </div>

  <div class="row2">
    <button class="chip alt" class:active={customOpen} onclick={() => (customOpen = !customOpen)}>{t.loader.custom}</button>
    <button class="chip alt fill" onclick={fillKiln}>{t.loader.fillKiln}</button>
  </div>
  {#if customOpen}
    <div class="customrow">
      <input type="number" min="2" max={maxSupport} bind:value={customVal} />
      <span class="unit">{t.loader.cm}</span>
      <button class="mini" onclick={() => { addPost(customVal); customOpen = false; }}>{summing ? t.loader.add : t.loader.set}</button>
    </div>
  {/if}

  <span class="lbl mt">{t.loader.splitShelf}</span>
  <div class="splits">
    {#each splits as s (s.n)}
      <button class="split" class:active={division === s.n} onclick={() => (division = s.n)}>{s.label}</button>
    {/each}
  </div>

  <div class="foot">
    <button class="doneb" onclick={done} disabled={maxSupport <= 0}>{t.loader.done}</button>
    <span class="total">{t.loader.totalCm(fmt(totalCm))}</span>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 60;
  }
  .sheet {
    position: fixed;
    z-index: 61;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    gap: 9px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px 18px 0 0;
    padding: 10px 18px calc(22px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
  }
  .handle {
    width: 36px;
    height: 4px;
    border-radius: 4px;
    background: var(--line);
    align-self: center;
    margin-bottom: 2px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .title {
    font-size: 15px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 22px;
    padding: 2px 6px;
  }
  .preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
  }
  .sumtx {
    font-size: 12px;
    color: var(--text-dim);
    letter-spacing: 0.02em;
  }
  .lbl {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .lbl.mt {
    margin-top: 4px;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .sumstrip {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 40px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 6px;
  }
  .pluspill {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--amber, #f4b880);
    background: color-mix(in srgb, var(--amber, #f4b880) 12%, var(--panel-2));
    color: var(--amber, #f4b880);
    font-size: 19px;
    line-height: 1;
  }
  .slots {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .slot {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 6px 11px;
    font-size: 14px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .op {
    color: var(--text-faint);
  }
  .eq {
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    margin-left: 2px;
  }
  .xpill {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text-dim);
    font-size: 15px;
    line-height: 1;
    margin-left: 2px;
  }
  .row2 {
    display: flex;
    gap: 8px;
  }
  .chip {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 11px 18px;
    color: var(--text-dim);
    font-size: 15px;
    font-variant-numeric: tabular-nums;
  }
  .chip.alt {
    flex: 1;
    text-align: center;
    font-size: 13px;
  }
  .chip.fill {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
  }
  .chip.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
    font-weight: 600;
  }
  .chip:disabled {
    opacity: 0.3;
  }
  .customrow {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .customrow input {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 11px 14px;
    color: var(--text);
    font: inherit;
    font-size: 15px;
  }
  .unit {
    color: var(--text-faint);
    font-size: 13px;
  }
  .mini {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 10px;
    padding: 11px 16px;
    font-size: 13px;
    font-weight: 600;
  }
  .splits {
    display: flex;
    gap: 6px;
  }
  .split {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 11px 0;
    color: var(--text-dim);
    font-size: 15px;
  }
  .split.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
    font-weight: 600;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
  }
  .doneb {
    flex: 1;
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 12px;
    padding: 14px;
    font-size: 15px;
    font-weight: 600;
  }
  .doneb:disabled {
    opacity: 0.4;
  }
  .total {
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
</style>
