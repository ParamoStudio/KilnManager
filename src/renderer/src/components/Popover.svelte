<script lang="ts">
  import type { Snippet } from "svelte";

  let { x, y, onclose, children } = $props<{
    x: number;
    y: number;
    onclose: () => void;
    children: Snippet;
  }>();

  function onkey(e: KeyboardEvent): void {
    if (e.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={onkey} />

<button class="backdrop" onclick={onclose} aria-label="Close"></button>
<div class="pop" style="left: {x}px; top: {y}px" role="dialog">
  {@render children()}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: transparent;
    border: none;
    cursor: default;
  }
  .pop {
    position: fixed;
    z-index: 41;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 14px 44px rgba(0, 0, 0, 0.55);
    min-width: 236px;
  }
</style>
