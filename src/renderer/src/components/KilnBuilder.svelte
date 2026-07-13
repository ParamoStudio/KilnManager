<script lang="ts">
  import {
    planner,
    currentKiln,
    addLevel,
    removeLevel,
    clearAll,
    setDivision,
    setSupportHeight,
    remainingCm,
    clientNames,
  } from "../lib/firing.svelte";
  import { COMPLEXITY } from "../lib/complexity";
  import { colorForName } from "../lib/colors";

  let { onassign, onheight } = $props<{
    onassign: (levelId: string, segIdx: number, rect: DOMRect) => void;
    onheight: (levelId: string, rect: DOMRect) => void;
  }>();

  const kiln = $derived(currentKiln());
  const names = $derived(clientNames());
  const remaining = $derived(remainingCm());
  const divisions = [1, 2, 3, 4];

  let stackH = $state(440);

  // ---- Drag to resize a level's support height ----
  let dragId: string | null = null;
  let startY = 0;
  let startSupport = 0;

  function onMove(e: PointerEvent): void {
    if (!dragId) return;
    const pxPerCm = stackH / kiln.usableHeightCm;
    const deltaCm = (startY - e.clientY) / pxPerCm;
    setSupportHeight(dragId, startSupport + deltaCm);
  }
  function endDrag(): void {
    dragId = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", endDrag);
  }
  function startDrag(id: string, support: number, e: PointerEvent): void {
    dragId = id;
    startY = e.clientY;
    startSupport = support;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    e.preventDefault();
  }

  const rect = (e: Event): DOMRect => (e.currentTarget as HTMLElement).getBoundingClientRect();
  const ticks = $derived(
    Array.from({ length: Math.floor(kiln.usableHeightCm / 10) + 1 }, (_, i) => i * 10),
  );
</script>

<div class="builder">
  <div class="ruler">
    <span class="label ruler-cap">{kiln.usableHeightCm} cm</span>
    {#each ticks as t (t)}
      <div class="tick" style="bottom: {(t / kiln.usableHeightCm) * 100}%">
        <span>{t}</span>
      </div>
    {/each}
  </div>

  <div class="kiln" class:cyl={kiln.shape === "cylinder"}>
    <div class="cap top"></div>
    <div class="stack" bind:clientHeight={stackH}>
      {#if planner.levels.length === 0}
        <div class="empty-kiln faint">
          Empty kiln.<br />Add a shelf / level to start loading.
        </div>
      {/if}

      {#each planner.levels as level, i (level.id)}
        {@const consumed = level.supportHeightCm + level.shelfThicknessCm}
        <div class="band" style="flex-grow: {consumed}">
          <div
            class="resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Drag to change level height"
            onpointerdown={(e) => startDrag(level.id, level.supportHeightCm, e)}
            title="Drag to change height"
          ></div>

          <div class="band-in">
            <div class="idx">{String(planner.levels.length - i).padStart(2, "0")}</div>

            <button class="h-chip" onclick={(e) => onheight(level.id, rect(e))}>
              {Math.round(consumed)} cm
            </button>

            <div class="segments">
              {#each level.segments as seg, sIdx (sIdx)}
                <button
                  class="seg"
                  class:filled={!!seg}
                  style="--dot: {seg ? colorForName(seg.contactName, names) : 'transparent'}"
                  onclick={(e) => onassign(level.id, sIdx, rect(e))}
                >
                  {#if seg}
                    <span class="dot"></span>
                    <span class="seg-name">{seg.contactName}</span>
                    <span class="seg-cx">{COMPLEXITY[seg.complexity].label}</span>
                  {:else}
                    <span class="seg-add">+</span>
                  {/if}
                </button>
              {/each}
            </div>

            <div class="divs">
              {#each divisions as d (d)}
                <button
                  class="div-btn"
                  class:active={level.division === d}
                  onclick={() => setDivision(level.id, d)}
                  title="{d} portion{d > 1 ? 's' : ''}"
                >
                  {d}
                </button>
              {/each}
            </div>

            <button class="rm" onclick={() => removeLevel(level.id)} title="Remove level">×</button>
          </div>
        </div>
      {/each}

      {#if remaining > 0.5}
        <div class="remaining" style="flex-grow: {remaining}">
          <span class="faint">{Math.round(remaining)} cm remaining</span>
        </div>
      {/if}
    </div>
    <div class="cap bottom"></div>
  </div>
</div>

<div class="controls">
  <button class="ctrl add" onclick={addLevel} disabled={remaining < 3}>+ Add shelf / level</button>
  <button class="ctrl" onclick={clearAll} disabled={planner.levels.length === 0}>Clear all</button>
</div>

<style>
  .builder {
    display: flex;
    gap: 14px;
    align-items: stretch;
  }
  .ruler {
    position: relative;
    width: 42px;
    flex-shrink: 0;
    margin: 18px 0;
  }
  .ruler-cap {
    position: absolute;
    top: -18px;
    left: 0;
    white-space: nowrap;
    font-size: 10px;
  }
  .tick {
    position: absolute;
    right: 0;
    width: 100%;
    border-top: 1px solid var(--line-soft);
  }
  .tick span {
    position: absolute;
    right: 2px;
    top: -8px;
    font-size: 10px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .kiln {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 480px;
  }
  .cap {
    height: 14px;
    border: 1px solid var(--line);
  }
  .cyl .cap {
    border-radius: 50%;
    height: 20px;
    background: var(--panel-2);
  }
  .cyl .cap.top {
    margin-bottom: -10px;
    z-index: 2;
  }
  .cyl .cap.bottom {
    margin-top: -10px;
  }
  .kiln:not(.cyl) .cap {
    border-radius: 4px;
  }

  .stack {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    border-left: 1px solid var(--line);
    border-right: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent);
  }

  .empty-kiln {
    margin: auto;
    text-align: center;
    line-height: 1.7;
    font-size: 13px;
  }

  .band {
    position: relative;
    flex-basis: 0;
    min-height: 46px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 12px;
    transition: min-height 0.15s ease;
  }
  .resize {
    position: absolute;
    top: -3px;
    left: 12px;
    right: 12px;
    height: 8px;
    cursor: ns-resize;
    border-radius: 4px;
  }
  .resize:hover {
    background: color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .band-in {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .idx {
    font-size: 12px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    width: 20px;
    flex-shrink: 0;
  }
  .h-chip {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 4px 9px;
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .h-chip:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }

  .segments {
    display: flex;
    gap: 5px;
    flex: 1;
    min-width: 0;
  }
  .seg {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    background: transparent;
    border: 1px dashed var(--line);
    border-radius: 7px;
    padding: 6px 9px;
    color: var(--text-faint);
    min-height: 34px;
    overflow: hidden;
  }
  .seg.filled {
    border-style: solid;
    border-color: color-mix(in srgb, var(--dot) 45%, var(--line-soft));
    background: color-mix(in srgb, var(--dot) 9%, transparent);
    color: var(--text);
  }
  .seg:hover {
    border-color: var(--text-faint);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot);
    flex-shrink: 0;
  }
  .seg-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .seg-cx {
    font-size: 11px;
    color: var(--text-faint);
    margin-left: auto;
    flex-shrink: 0;
  }
  .seg-add {
    font-size: 15px;
    margin: 0 auto;
  }

  .divs {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
  .div-btn {
    width: 24px;
    height: 26px;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    color: var(--text-faint);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .div-btn:first-child {
    border-radius: 7px 0 0 7px;
  }
  .div-btn:last-child {
    border-radius: 0 7px 7px 0;
  }
  .div-btn.active {
    color: var(--text);
    background: var(--panel-2);
    border-color: var(--text-faint);
  }

  .rm {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1;
    padding: 2px 4px;
    flex-shrink: 0;
  }
  .rm:hover {
    color: #e88;
  }

  .remaining {
    flex-basis: 0;
    min-height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--line-soft);
    border-radius: var(--radius-sm);
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 8px,
      rgba(255, 255, 255, 0.02) 8px,
      rgba(255, 255, 255, 0.02) 16px
    );
    font-size: 12px;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
  }
  .ctrl {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 10px 16px;
    font-size: 13px;
    color: var(--text);
  }
  .ctrl.add {
    border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
  }
  .ctrl:hover:not(:disabled) {
    border-color: var(--text-faint);
  }
  .ctrl:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
