<script lang="ts">
  import { fade } from "svelte/transition";
  import {
    planner,
    ui,
    currentKiln,
    addShelf,
    setDivision,
    setSupportHeight,
    roomForNewShelf,
    closeShelfEditor,
  } from "../lib/firing.svelte";
  import PostCylinder from "./PostCylinder.svelte";
  import { t } from "../lib/i18n.svelte";

  const kiln = $derived(currentKiln());
  const isNew = $derived(ui.shelfEditor === "new");
  const editing = $derived(
    ui.shelfEditor && ui.shelfEditor !== "new" ? planner.levels.find((l) => l.id === ui.shelfEditor) : null,
  );
  const thickness = $derived(kiln.defaultShelfThicknessCm);
  const maxSupport = $derived(
    isNew ? roomForNewShelf() : (editing?.supportHeightCm ?? 0) + roomForNewShelf(),
  );

  // Posts model: the support height is the sum of the chosen posts.
  let posts = $state<number[]>([]);
  let division = $state(1);
  let summing = $state(false);
  let customOpen = $state(false);
  let customVal = $state(8);
  let inited = false;

  $effect(() => {
    if (inited) return;
    inited = true;
    if (editing) {
      posts = [Math.round(editing.supportHeightCm)];
      division = editing.division;
    } else {
      // Pre-select the smallest available standard post that still fits.
      const fit = [...kiln.standardPostHeightsCm].sort((a, b) => a - b).find((p) => p <= maxSupport);
      posts = [fit ?? Math.max(2, Math.floor(maxSupport))];
      division = 1;
    }
  });

  const support = $derived(posts.reduce((a, b) => a + b, 0));
  const reserved = $derived(support + thickness);

  function addPost(v: number): void {
    if (summing) {
      if (posts.length >= 4) return; // never stack more than 4 posts
      const room = maxSupport - support;
      if (v <= room + 1e-6) posts = [...posts, v];
    } else {
      posts = [Math.min(v, maxSupport)];
    }
  }
  // The "×" in stack mode: first clears the extra posts, then collapses. Never
  // leaves the shelf with zero posts (that would be physically impossible).
  function clearSum(): void {
    if (posts.length > 1) posts = [posts[0]!];
    else summing = false;
  }
  function fillKiln(): void {
    posts = [Math.max(2, Math.round(maxSupport))];
    summing = false;
  }

  const splits = $derived([
    { n: 1, label: t.shelfEditor.splitFull },
    { n: 2, label: "½" },
    { n: 3, label: "⅓" },
    { n: 4, label: "¼" },
    { n: 5, label: "⅕" },
  ]);

  function done(): void {
    const s = Math.max(2, Math.min(support || 2, maxSupport));
    if (isNew) {
      addShelf(s, division);
    } else if (editing) {
      setDivision(editing.id, division);
      setSupportHeight(editing.id, s);
    }
    closeShelfEditor();
  }

  // Popover placement: it emanates from the edit button (the anchor), opening
  // below it, or flipping above when there isn't room below. Its real height is
  // measured so the flip and the on-screen clamp are always correct — the arrow
  // stays pinned on the button.
  const W = 296;
  const GAP = 14;
  let popH = $state(340);
  const winW = typeof window !== "undefined" ? window.innerWidth : 1400;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const ax = $derived(ui.shelfEditorAnchor?.x ?? 400);
  const ay = $derived(ui.shelfEditorAnchor?.y ?? 140);
  const px = $derived(Math.min(Math.max(12, ax - W / 2), winW - W - 12));
  const above = $derived(ay + GAP + popH > winH && ay - GAP - popH > 12);
  const py = $derived(above ? ay - popH - GAP : Math.min(ay + GAP, winH - popH - 12));
  const arrowX = $derived(Math.max(16, Math.min(ax - px, W - 16)));
</script>

<button class="catch" onclick={closeShelfEditor} aria-label="Close"></button>
<div class="pop" bind:clientHeight={popH} style="left:{px}px; top:{py}px; width:{W}px">
  <div class="arrow" class:down={above} style="left:{arrowX}px"></div>

  <div class="head">
    <h3>{isNew ? t.shelfEditor.addShelf : t.shelfEditor.editShelf}</h3>
    <button class="x" onclick={closeShelfEditor} aria-label={t.shelfEditor.close}>×</button>
  </div>

  <div class="postpreview"><PostCylinder cm={support} w={26} /></div>

  <span class="label center">{t.shelfEditor.shelfHeight}</span>
  <div class="presets">
    {#each kiln.standardPostHeightsCm as p (p)}
      <button class="chip" class:active={!summing && posts.length === 1 && posts[0] === p} onclick={() => addPost(p)} disabled={!summing && p > maxSupport}>{p}</button>
    {/each}
  </div>

  <div class="sum-strip">
    {#if !summing}
      <button class="pluspill" transition:fade={{ duration: 90 }} onclick={() => (summing = true)} title={t.shelfEditor.stackTitle}>+</button>
    {:else}
      <div class="slots" transition:fade={{ duration: 90 }}>
        {#each posts as p, i (i)}
          <span class="slot">{p}</span>
          {#if i < posts.length - 1}<span class="op">+</span>{/if}
        {/each}
        <button class="xpill" onclick={clearSum} title={t.shelfEditor.clearTitle}>×</button>
      </div>
    {/if}
  </div>

  <div class="faint reserved">
    {#if posts.length > 1}{posts.join(" + ")} = {support} cm · {/if}{t.shelfEditor.reservedPosts(support, thickness)}
  </div>

  <div class="cf-row">
    <button class="chip" class:active={customOpen} onclick={() => (customOpen = !customOpen)}>{t.shelfEditor.custom}</button>
    <button class="chip fill" onclick={fillKiln} title={t.shelfEditor.fillKilnTitle}>{t.shelfEditor.fillKiln}</button>
  </div>

  {#if customOpen}
    <div class="custom">
      <input type="number" min="2" max={maxSupport} bind:value={customVal} />
      <span class="unit">{t.shelfEditor.cm}</span>
      <button class="mini" onclick={() => { addPost(customVal); customOpen = false; }}>{summing ? t.shelfEditor.add : t.shelfEditor.set}</button>
    </div>
  {/if}

  <span class="label center mt">{t.shelfEditor.splitShelf}</span>
  <div class="splits">
    {#each splits as s (s.n)}
      <button class="split" class:active={division === s.n} onclick={() => (division = s.n)}>{s.label}</button>
    {/each}
  </div>

  {#if editing && editing.segments.some((z) => z !== null) && division !== editing.division}
    <div class="warn">{t.shelfEditor.redivideWarning}</div>
  {/if}

  <div class="actions">
    <button class="doneb" onclick={done} disabled={isNew && roomForNewShelf() <= 0}>{t.shelfEditor.done}</button>
    <div class="total-box">{t.shelfEditor.totalCm(reserved)}</div>
  </div>
</div>

<style>
  .postpreview {
    display: flex;
    justify-content: center;
    margin: 2px 0 8px;
  }
  .catch {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: transparent;
    border: none;
    cursor: default;
  }
  .pop {
    position: fixed;
    z-index: 51;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
    text-align: center;
  }
  .total-box {
    border: 1px solid color-mix(in srgb, var(--amber) 45%, var(--line));
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .arrow {
    position: absolute;
    top: -7px;
    width: 12px;
    height: 12px;
    background: var(--panel);
    border-left: 1px solid var(--line);
    border-top: 1px solid var(--line);
    transform: translateX(-50%) rotate(45deg);
  }
  .arrow.down {
    top: auto;
    bottom: -7px;
    border-left: none;
    border-top: none;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  h3 {
    font-size: 15px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 19px;
  }
  .center {
    display: block;
    text-align: center;
  }
  .fill {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    margin: 8px 0 6px;
  }
  .chip {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 6px 11px;
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    transition: border-color 0.12s ease, color 0.12s ease;
  }
  .chip:hover {
    border-color: var(--amber);
    color: var(--text);
  }
  .chip.active {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .chip:disabled {
    opacity: 0.3;
  }
  /* Grid so the "+" and the slots row share one cell and cross-fade in place,
     with no layout sweep when toggling. */
  .sum-strip {
    display: grid;
    justify-items: center;
    align-items: center;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 7px;
    margin-bottom: 6px;
    min-height: 40px;
  }
  .sum-strip > :global(*) {
    grid-area: 1 / 1;
  }
  .pluspill {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--amber);
    background: color-mix(in srgb, var(--amber) 12%, var(--panel-2));
    color: var(--amber);
    font-size: 17px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .pluspill:hover {
    background: var(--amber);
    color: #1a1200;
  }
  .slots {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .slot {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 13px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .op {
    color: var(--text-faint);
  }
  .xpill {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: 2px;
  }
  .xpill:hover {
    border-color: var(--amber);
    color: var(--amber);
  }
  .cf-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 10px 0;
  }
  .custom {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .custom input {
    width: 70px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 7px 9px;
    color: var(--text);
    font: inherit;
  }
  .unit {
    color: var(--text-faint);
    font-size: 12px;
  }
  .mini {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 7px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
  }
  .reserved {
    font-size: 11px;
    line-height: 1.5;
  }
  .mt {
    margin-top: 10px;
    display: block;
  }
  .splits {
    display: flex;
    gap: 5px;
    margin-top: 8px;
  }
  .split {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 9px 0;
    color: var(--text-dim);
    font-size: 13px;
  }
  .split.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .warn {
    font-size: 11px;
    color: var(--amber);
    margin-top: 8px;
  }
  .actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
  }
  .doneb {
    background: var(--accent);
    color: #111;
    border: 1px solid color-mix(in srgb, var(--amber) 45%, var(--accent));
    border-radius: 8px;
    padding: 9px 22px;
    font-weight: 600;
    font-size: 14px;
  }
  .doneb:disabled {
    opacity: 0.4;
  }
</style>
