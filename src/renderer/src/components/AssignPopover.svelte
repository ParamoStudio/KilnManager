<script lang="ts">
  import Popover from "./Popover.svelte";
  import { setSegment, clientNames, type Segment } from "../lib/firing.svelte";
  import { COMPLEXITY, complexityKeys, type ComplexityKey } from "../lib/complexity";

  let { levelId, segIdx, current, x, y, onclose } = $props<{
    levelId: string;
    segIdx: number;
    current: Segment | null;
    x: number;
    y: number;
    onclose: () => void;
  }>();

  let name = $state(current?.contactName ?? "");
  let complexity = $state<ComplexityKey>(current?.complexity ?? "simple");
  const suggestions = clientNames().filter((n) => n !== current?.contactName);

  let inputEl: HTMLInputElement | undefined = $state();
  $effect(() => {
    inputEl?.focus();
  });

  function assign(): void {
    const n = name.trim();
    if (!n) return;
    setSegment(levelId, segIdx, { contactName: n, complexity });
    onclose();
  }
  function clear(): void {
    setSegment(levelId, segIdx, null);
    onclose();
  }
  function onkey(e: KeyboardEvent): void {
    if (e.key === "Enter") assign();
  }
</script>

<Popover {x} {y} {onclose}>
  <div class="label">Assign client</div>

  <input
    bind:this={inputEl}
    bind:value={name}
    onkeydown={onkey}
    placeholder="Client name"
    class="name-input"
    list="client-suggestions"
  />
  {#if suggestions.length}
    <datalist id="client-suggestions">
      {#each suggestions as s (s)}<option value={s}></option>{/each}
    </datalist>
    <div class="chips">
      {#each suggestions.slice(0, 4) as s (s)}
        <button class="chip" onclick={() => (name = s)}>{s}</button>
      {/each}
    </div>
  {/if}

  <div class="label mt">Complexity</div>
  <div class="complexity">
    {#each complexityKeys as key (key)}
      <button
        class="cx"
        class:active={complexity === key}
        onclick={() => (complexity = key)}
      >
        {COMPLEXITY[key].label}
        <span class="factor">×{COMPLEXITY[key].factor.toFixed(2)}</span>
      </button>
    {/each}
  </div>

  <div class="actions">
    {#if current}
      <button class="btn ghost" onclick={clear}>Clear</button>
    {/if}
    <button class="btn primary" onclick={assign} disabled={!name.trim()}>
      {current ? "Update" : "Assign"}
    </button>
  </div>
</Popover>

<style>
  .mt {
    margin-top: 14px;
  }
  .name-input {
    width: 100%;
    margin-top: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
  }
  .name-input:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .chip {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .chip:hover {
    color: var(--text);
  }
  .complexity {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .cx {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 8px 4px;
    font-size: 12px;
    color: var(--text-dim);
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
  }
  .cx.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .factor {
    font-size: 10px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
  .btn {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    background: var(--panel-2);
    color: var(--text-dim);
  }
  .btn.primary {
    background: var(--accent);
    color: #111;
    border-color: var(--accent);
    font-weight: 600;
  }
  .btn.primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn.ghost:hover {
    color: var(--text);
  }
</style>
