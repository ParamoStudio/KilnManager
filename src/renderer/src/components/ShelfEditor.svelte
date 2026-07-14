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
      posts = [10];
      division = 1;
    }
  });

  const support = $derived(posts.reduce((a, b) => a + b, 0));
  const reserved = $derived(support + thickness);

  function addPost(v: number): void {
    if (summing) posts = [...posts, v];
    else posts = [v];
  }
  function clearPosts(): void {
    posts = [];
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

  // Popover placement near the anchor (below it), clamped to the viewport.
  const W = 300;
  const px = $derived(
    Math.min(Math.max(12, (ui.shelfEditorAnchor?.x ?? 400) - W / 2), (typeof window !== "undefined" ? window.innerWidth : 1400) - W - 12),
  );
  const py = $derived(Math.min((ui.shelfEditorAnchor?.y ?? 140) + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 340));
  const arrowX = $derived(Math.max(16, Math.min((ui.shelfEditorAnchor?.x ?? px + W / 2) - px, W - 16)));
</script>

<button class="catch" onclick={closeShelfEditor} aria-label="Close"></button>
<div class="pop" style="left:{px}px; top:{py}px; width:{W}px">
  <div class="arrow" style="left:{arrowX}px"></div>

  <div class="head">
    <h3>{isNew ? "Add shelf" : "Edit shelf"}</h3>
    <button class="x" onclick={closeShelfEditor} aria-label="Close">×</button>
  </div>

  <div class="hrow">
    <span class="label">Shelf height</span>
    <div class="hpills">
      <button class="pill" class:active={summing} onclick={() => (summing = !summing)} title="Stack several posts">+</button>
      {#if summing}
        <button class="pill" onclick={clearPosts} title="Clear">×</button>
      {/if}
    </div>
  </div>

  <div class="presets">
    {#each kiln.standardPostHeightsCm as p (p)}
      <button class="chip" class:active={!summing && support === p} onclick={() => addPost(p)} disabled={!summing && p > maxSupport}>{p}</button>
    {/each}
    <button class="chip" class:active={customOpen} onclick={() => (customOpen = !customOpen)}>Custom</button>
  </div>

  {#if customOpen}
    <div class="custom">
      <input type="number" min="2" max={maxSupport} bind:value={customVal} />
      <span class="unit">cm</span>
      <button class="mini" onclick={() => { addPost(customVal); customOpen = false; }}>{summing ? "Add" : "Set"}</button>
    </div>
  {/if}

  <div class="faint reserved">
    {#if posts.length > 1}{posts.join(" + ")} = {support} cm · {/if}{reserved} cm reserved (posts {support} + shelf {thickness})
  </div>

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
    padding: 16px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
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
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
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
    justify-content: space-between;
  }
  .hpills {
    display: flex;
    gap: 5px;
  }
  .pill {
    width: 24px;
    height: 22px;
    border-radius: 6px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--text-dim);
    font-size: 13px;
  }
  .pill.active {
    color: #111;
    background: var(--accent);
    border-color: var(--accent);
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
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
    margin-left: auto;
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
    margin-top: 14px;
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
    justify-content: flex-end;
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
