<script lang="ts">
  let { shape = "cylinder", size = 46 }: { shape?: "cylinder" | "box"; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 48 48" class="thumb" aria-hidden="true">
  {#if shape === "cylinder"}
    <ellipse cx="24" cy="12" rx="14" ry="4.5" class="ln" />
    <path d="M10 12 L10 36" class="ln" />
    <path d="M38 12 L38 36" class="ln" />
    <path d="M10 36 A14 4.5 0 0 0 38 36" class="ln" />
    <line x1="11" y1="22" x2="37" y2="22" class="ln soft" />
    <line x1="11" y1="29" x2="37" y2="29" class="ln soft" />
  {:else}
    <path d="M10 14 L24 9 L38 14 L38 36 L24 41 L10 36 Z" class="ln" />
    <path d="M10 14 L24 19 L38 14" class="ln" />
    <path d="M24 19 L24 41" class="ln soft" />
    <line x1="10" y1="26" x2="24" y2="31" class="ln soft" />
    <line x1="38" y1="26" x2="24" y2="31" class="ln soft" />
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
  }
  .ln.soft {
    stroke: var(--line);
  }
</style>
