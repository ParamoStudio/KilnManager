<script lang="ts">
  import {
    planner,
    ui,
    currentKiln,
    addShelf,
    removeLevel,
    setDivision,
    setSupportHeight,
    roomForNewShelf,
    closeShelfEditor,
  } from "../lib/firing.svelte";

  const kiln = $derived(currentKiln());
  const isNew = $derived(ui.shelfEditor === "new");
  const editing = $derived(
    ui.shelfEditor && ui.shelfEditor !== "new"
      ? planner.levels.find((l) => l.id === ui.shelfEditor)
      : null,
  );

  const thickness = $derived(kiln.defaultShelfThicknessCm);
  const maxSupport = $derived(
    isNew ? roomForNewShelf() : (editing?.supportHeightCm ?? 0) + roomForNewShelf(),
  );

  // Local state for a new shelf
  let newSupport = $state(10);
  let newDivision = $state(1);

  const splits = [
    { n: 1, label: "Full" },
    { n: 2, label: "½" },
    { n: 3, label: "⅓" },
    { n: 4, label: "¼" },
  ];

  const support = $derived(isNew ? newSupport : (editing?.supportHeightCm ?? 0));
  const division = $derived(isNew ? newDivision : (editing?.division ?? 1));

  function setSupport(cm: number): void {
    if (isNew) newSupport = Math.max(2, Math.min(cm, maxSupport));
    else if (editing) setSupportHeight(editing.id, cm);
  }
  function setDiv(n: number): void {
    if (isNew) newDivision = n;
    else if (editing) setDivision(editing.id, n);
  }
  function create(): void {
    addShelf(newSupport, newDivision);
    closeShelfEditor();
  }
  function remove(): void {
    if (editing) removeLevel(editing.id);
    closeShelfEditor();
  }
</script>

<div class="scrim" role="presentation" onclick={closeShelfEditor}></div>
<div class="modal" role="dialog" aria-label="Shelf">
  <div class="head">
    <h3>{isNew ? "Add shelf" : "Edit shelf"}</h3>
    <button class="x" onclick={closeShelfEditor} aria-label="Close">×</button>
  </div>

  <span class="label">Shelf height</span>
  <div class="presets">
    {#each kiln.standardPostHeightsCm as p (p)}
      <button class="chip" class:active={Math.round(support) === p} onclick={() => setSupport(p)} disabled={p > maxSupport}>
        {p}
      </button>
    {/each}
  </div>
  <input
    class="slider"
    type="range"
    min="2"
    max={Math.max(3, Math.round(maxSupport))}
    step="0.5"
    value={support}
    oninput={(e) => setSupport(+e.currentTarget.value)}
  />
  <div class="faint hint">
    {Math.round(support + thickness)} cm reserved (posts {Math.round(support)} + shelf {thickness}) · drag to adjust
  </div>

  <span class="label mt">Split shelf</span>
  <div class="splits">
    {#each splits as s (s.n)}
      <button class="split" class:active={division === s.n} onclick={() => setDiv(s.n)}>{s.label}</button>
    {/each}
  </div>

  <div class="actions">
    {#if isNew}
      <button class="ghost" onclick={closeShelfEditor}>Cancel</button>
      <button class="primary" onclick={create} disabled={roomForNewShelf() <= 0}>Add shelf</button>
    {:else}
      <button class="ghost danger" onclick={remove}>Remove shelf</button>
      <button class="primary" onclick={closeShelfEditor}>Done</button>
    {/if}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 50;
  }
  .modal {
    position: fixed;
    z-index: 51;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 340px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
    line-height: 1;
  }
  .mt {
    margin-top: 18px;
    display: block;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 8px 0;
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
  .slider {
    width: 100%;
    accent-color: var(--accent);
  }
  .hint {
    font-size: 11px;
    margin-top: 6px;
    line-height: 1.5;
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
  .actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 22px;
  }
  .ghost {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 14px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .ghost.danger:hover {
    color: #e88;
    border-color: #e88;
  }
  .primary {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-weight: 600;
    font-size: 13px;
  }
  .primary:disabled {
    opacity: 0.4;
  }
</style>
