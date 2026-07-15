<script lang="ts">
  // A tiny line-art cylinder whose body height scales with the post height, so
  // short/medium/tall/very-tall posts read at a glance.
  let { cm }: { cm: number } = $props();

  const BOTTOM = 42;
  const RX = 11;
  const RY = 3.4;
  const bodyH = $derived(8 + (Math.max(2, Math.min(40, cm)) - 2) * (26 / 38));
  const topY = $derived(BOTTOM - bodyH);
</script>

<svg viewBox="0 0 30 46" class="post" aria-hidden="true">
  <!-- body -->
  <path
    d="M 4 {topY} L 4 {BOTTOM} A {RX} {RY} 0 0 0 26 {BOTTOM} L 26 {topY}"
    class="body"
  />
  <!-- bottom front rim -->
  <path d="M 4 {BOTTOM} A {RX} {RY} 0 0 0 26 {BOTTOM}" class="edge" />
  <!-- top rim -->
  <ellipse cx="15" cy={topY} rx={RX} ry={RY} class="edge top" />
</svg>

<style>
  .post {
    width: 30px;
    height: 46px;
    display: block;
  }
  .body {
    fill: rgba(255, 255, 255, 0.05);
    stroke: color-mix(in srgb, var(--text-faint) 70%, var(--line));
    stroke-width: 1;
  }
  .edge {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 55%, var(--line));
    stroke-width: 1;
  }
  .edge.top {
    fill: var(--panel);
  }
</style>
