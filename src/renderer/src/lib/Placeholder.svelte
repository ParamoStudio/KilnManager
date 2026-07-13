<script lang="ts">
  let { title, tramo, children } = $props<{
    title: string;
    tramo: string;
    children?: import("svelte").Snippet;
  }>();
</script>

<div class="ph panel">
  <span class="label">{tramo}</span>
  <h2>{title}</h2>
  <div class="body muted">
    {@render children?.()}
  </div>
</div>

<style>
  .ph {
    padding: 40px;
    max-width: 620px;
  }
  h2 {
    font-size: 22px;
    margin: 10px 0 16px;
    font-weight: 600;
  }
  .body {
    line-height: 1.65;
    font-size: 14px;
  }
</style>
