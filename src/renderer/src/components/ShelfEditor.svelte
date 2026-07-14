<script lang="ts">
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
      // Suggest the tallest standard post that still fits the remaining space.
      const fit = [...kiln.standardPostHeightsCm].sort((a, b) => b - a).find((p) => p <= maxSupport);
      posts = [fit ?? Math.max(2, Math.floor(maxSupport))];
      division = 1;
    }
  });

  const support = $derived(posts.reduce((a, b) => a + b, 0));
  const reserved = $derived(support + thickness);

  function addPost(v: number): void {
    if (summing) {
      const room = maxSupport - support;
      if (v <= room + 1e-6) posts = [...posts, v];
    } else {
      posts = [Math.min(v, maxSupport)];
    }
  }
  function clearPosts(): void {
    posts = [];
  }
  function fillKiln(): void {
    // Last shelf, tall piece: reserve all the remaining space.
    posts = [Math.max(2, Math.round(maxSupport))];
    summing = false;
  }

  const splits = [
    { n: 1, label: "Full" },
    { n: 2, label: "½" },
    { n: 3, label: "⅓" },
    { n: 4, label: "¼" },
  ];

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

  // Popover placement near the anchor. Opens below it, or flips above when there
  // isn't room below (always fits somewhere).
  const W = 296;
  const POPH = 340;
  const winW = typeof window !== "undefined" ? window.innerWidth : 1400;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const ax = $derived(ui.shelfEditorAnchor?.x ?? 400);
  const ay = $derived(ui.shelfEditorAnchor?.y ?? 140);
  const px = $derived(Math.min(Math.max(12, ax - W / 2), winW - W - 12));
  const above = $derived(ay + 14 + POPH > winH);
  const py = $derived(above ? Math.max(12, ay - POPH - 14) : Math.min(ay + 14, winH - POPH - 12));
  const arrowX = $derived(Math.max(16, Math.min(ax - px, W - 16)));
</script>

<button class="catch" onclick={closeShelfEditor} aria-label="Close"></button>
<div class="pop" style="left:{px}px; top:{py}px; width:{W}px">
  <div class="arrow" class:down={above} style="left:{arrowX}px"></div>

  <div class="head">
    <h3>{isNew ? "Add shelf" : "Edit shelf"}</h3>
    <button class="x" onclick={closeShelfEditor} aria-label="Close">×</button>
  </div>

  <div class="hrow">
    <span class="label">Shelf height</span>
    <button class="pill" class:active={summing} onclick={() => (summing = !summing)} title="Stack several posts (e.g. 8 + 5)">+</button>
    <button class="pill" onclick={clearPosts} disabled={!summing} title="Clear the stack">×</button>
    {#if summing}<span class="faint summing-h">stacking posts</span>{/if}
  </div>

  <div class="presets">
    {#each kiln.standardPostHeightsCm as p (p)}
      <button class="chip" class:active={!summing && support === p} onclick={() => addPost(p)} disabled={!summing && p > maxSupport}>{p}</button>
    {/each}
    <button class="chip" class:active={customOpen} onclick={() => (customOpen = !customOpen)}>Custom</button>
    <button class="chip fill" onclick={fillKiln} title="Reserve all remaining height (last shelf / tall piece)">Fill kiln</button>
  </div>

  {#if customOpen}
    <div class="custom">
      <input type="number" min="2" max={maxSupport} bind:value={customVal} />
      <span class="unit">cm</span>
      <button class="mini" onclick={() => { addPost(customVal); customOpen = false; }}>{summing ? "Add" : "Set"}</button>
    </div>
  {/if}

  <div class="faint reserved">
    {#if posts.length > 1}{posts.join(" + ")} = {support} cm · {/if}posts {support} + shelf {thickness}
  </div>
  <div class="total-box">{reserved} cm total</div>

  <span class="label mt">Split shelf</span>
  <div class="splits">
    {#each splits as s (s.n)}
      <button class="split" class:active={division === s.n} onclick={() => (division = s.n)}>{s.label}</button>
    {/each}
  </div>

  {#if editing && editing.segments.some((z) => z !== null) && division !== editing.division}
    <div class="warn">Re-dividing clears this shelf's clients.</div>
  {/if}

  <div class="actions">
    <button class="doneb" onclick={done} disabled={isNew && roomForNewShelf() <= 0}>Done</button>
  </div>
</div>

<style>
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
    display: inline-block;
    margin: 4px auto 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 6px 16px;
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
  .hrow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .pill {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--text-dim);
    font-size: 15px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .pill.active {
    color: #111;
    background: var(--amber);
    border-color: var(--amber);
  }
  .pill:disabled {
    opacity: 0.35;
  }
  .summing-h {
    font-size: 11px;
    color: var(--amber);
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
    margin: 9px 0 8px;
  }
  .chip {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 6px 11px;
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .chip.active {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .chip:disabled {
    opacity: 0.3;
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
    margin-top: 16px;
  }
  .doneb {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 9px 22px;
    font-weight: 600;
    font-size: 13px;
  }
  .doneb:disabled {
    opacity: 0.4;
  }
</style>
