<script lang="ts">
  // A small badge that reads a kiln's shape at a glance: a circle for a
  // cylinder, a rounded square for a box kiln.
  let { shape, size = 34 }: { shape: "cylinder" | "box"; size?: number } = $props();
</script>

<span class="glyph" style="width:{size}px;height:{size}px" aria-hidden="true">
  {#if shape === "cylinder"}
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>
  {:else}
    <svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3" /></svg>
  {/if}
</span>

<style>
  .glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  svg {
    width: 62%;
    height: 62%;
  }
  circle,
  rect {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
</style>
