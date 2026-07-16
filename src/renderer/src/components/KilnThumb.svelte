<script lang="ts">
  let { shape = "cylinder", size = 46 }: { shape?: "cylinder" | "box"; size?: number } = $props();
</script>

<!-- The protruding burner door (front box + depth + flame), placed at (ox,oy). -->
{#snippet door(ox: number, oy: number)}
  <rect x={ox} y={oy} width="11" height="15" rx="1" class="ln" />
  <path d="M{ox + 11} {oy} L{ox + 14} {oy - 2.4} L{ox + 14} {oy + 12.6} L{ox + 11} {oy + 15}" class="ln" />
  <path d="M{ox} {oy} L{ox + 3} {oy - 2.4} L{ox + 14} {oy - 2.4}" class="ln" />
  <path
    d="M{ox + 5.5} {oy + 3.4} C {ox + 8.1} {oy + 5.9} {ox + 8} {oy + 8.9} {ox + 5.5} {oy + 10.8} C {ox + 3} {oy + 8.9} {ox + 2.9} {oy + 5.9} {ox + 5.5} {oy + 3.4} Z"
    class="flame"
  />
{/snippet}

<svg width={size} height={size} viewBox="0 0 48 52" class="thumb" aria-hidden="true">
  {#if shape === "cylinder"}
    <!-- construction axis -->
    <line x1="24" y1="3" x2="24" y2="50" class="axis" />
    <!-- rim (open, with thickness) -->
    <ellipse cx="24" cy="9" rx="17" ry="5" class="ln" />
    <path d="M9 10.4 A15 4 0 0 0 39 10.4" class="ln" />
    <!-- body -->
    <path d="M7 9 L7 42" class="ln" />
    <path d="M41 9 L41 42" class="ln" />
    <path d="M7 42 A17 5 0 0 0 41 42" class="ln" />
    <!-- section bands -->
    <path d="M7 16 A17 5 0 0 0 41 16" class="soft" />
    <path d="M7 37 A17 5 0 0 0 41 37" class="soft" />
    <!-- feet -->
    <path d="M12 45 L12 49 L17 49 L17 44.5" class="ln" />
    <path d="M31 44.5 L31 49 L36 49 L36 45" class="ln" />
    <!-- knob -->
    <circle cx="34" cy="36" r="2" class="ln" />
    {@render door(18, 25)}
  {:else}
    <!-- hidden edges (CAD) -->
    <path d="M18 10 L18 37 M18 37 L8 45 M18 37 L42 37" class="axis" />
    <!-- cube faces -->
    <path d="M8 18 L32 18 L32 45 L8 45 Z" class="ln" />
    <path d="M8 18 L18 10 L42 10 L32 18" class="ln" />
    <path d="M32 18 L42 10 L42 37 L32 45" class="ln" />
    <!-- corner rivets -->
    <circle cx="8" cy="18" r="0.7" class="dot" />
    <circle cx="32" cy="18" r="0.7" class="dot" />
    <circle cx="8" cy="45" r="0.7" class="dot" />
    <circle cx="32" cy="45" r="0.7" class="dot" />
    <circle cx="42" cy="10" r="0.7" class="dot" />
    <circle cx="42" cy="37" r="0.7" class="dot" />
    <!-- feet -->
    <path d="M10 45 L10 49 L15 49 L15 45" class="ln" />
    <path d="M24 45 L24 49 L29 49 L29 45" class="ln" />
    <path d="M35 42 L39 40 L39 43 L35 45 Z" class="ln" />
    <!-- knob -->
    <circle cx="27" cy="41" r="1.8" class="ln" />
    {@render door(13, 29)}
  {/if}
</svg>

<style>
  .thumb {
    display: block;
  }
  .ln {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.1;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .flame {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .soft {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 45%, transparent);
    stroke-width: 1;
  }
  .axis {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 32%, transparent);
    stroke-width: 0.8;
    stroke-dasharray: 1.6 1.8;
  }
  .dot {
    fill: color-mix(in srgb, var(--text-dim) 55%, transparent);
    stroke: none;
  }
</style>
