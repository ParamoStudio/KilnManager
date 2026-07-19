<script lang="ts">
  import { app, go } from "../lib/firing.svelte";
  import { addKiln } from "../lib/kilns.svelte";
  import { t } from "../lib/i18n.svelte";

  function continueToKiln(): void {
    const k = addKiln("cylinder");
    app.editKilnId = k.id;
    app.firstKilnOpen = false;
    go("kilnProfiles");
  }
</script>

<div class="scrim" role="presentation" onclick={() => (app.firstKilnOpen = false)}></div>
<div class="card" role="dialog" aria-label={t.firstKilnPrompt.ariaLabel}>
  <div class="mark"><span class="wm">PÁRAMO</span><span class="tl">KILN MANAGER</span></div>
  <h2>{t.firstKilnPrompt.title}</h2>
  <p>{t.firstKilnPrompt.body}</p>
  <div class="row">
    <button class="primary" onclick={continueToKiln}>{t.firstKilnPrompt.continue}</button>
    <button class="ghost" onclick={() => (app.firstKilnOpen = false)}>{t.firstKilnPrompt.later}</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.68);
    backdrop-filter: blur(4px);
    z-index: 80;
  }
  .card {
    position: fixed;
    z-index: 81;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 440px;
    max-width: 92vw;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 30px 30px 26px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    text-align: center;
  }
  .mark {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 20px;
  }
  .wm {
    font-size: 15px;
    letter-spacing: 0.24em;
    font-weight: 300;
    color: var(--text);
  }
  .tl {
    font-size: 15px;
    letter-spacing: 0.12em;
    font-weight: 600;
    color: var(--text);
  }
  h2 {
    font-size: 19px;
    font-weight: 600;
    margin: 0 0 10px;
  }
  p {
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-dim);
    margin: 0 0 16px;
  }
  .row {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .primary {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 9px;
    padding: 11px 24px;
    font-size: 14px;
    font-weight: 600;
  }
  .ghost {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 11px 20px;
    color: var(--text-dim);
    font-size: 14px;
  }
  .ghost:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
</style>
