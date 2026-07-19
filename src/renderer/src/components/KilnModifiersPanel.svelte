<script lang="ts">
  import type { KilnModifier } from "@core";
  import { getKiln, addModifier, removeModifier, setModifierMode, saveKilns } from "../lib/kilns.svelte";
  import { t } from "../lib/i18n.svelte";

  let { kilnId, onclose }: { kilnId: string; onclose: () => void } = $props();

  const kiln = $derived(getKiln(kilnId));
  let tab = $state<"surcharge" | "discount">("surcharge");
  const persist = (): void => saveKilns();

  const rows = (family: "surcharge" | "discount", scope: "full-kiln" | "client"): KilnModifier[] =>
    (kiln?.modifiers ?? []).filter((m) => m.family === family && m.scope === scope);
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="pop" role="dialog" aria-label={t.kilnModifiers.ariaLabel}>
  <div class="head">
    <h3>{t.kilnModifiers.title}</h3>
    <button class="x" onclick={onclose} aria-label={t.common.close}>×</button>
  </div>

  <div class="tabs">
    <button class:active={tab === "surcharge"} onclick={() => (tab = "surcharge")}>{t.kilnModifiers.surcharges}</button>
    <button class:active={tab === "discount"} onclick={() => (tab = "discount")}>{t.kilnModifiers.discounts}</button>
  </div>

  {#each [{ scope: "full-kiln", label: t.kilnModifiers.fullKilnModifier }, { scope: "client", label: t.kilnModifiers.clientModifier }] as blk, i (blk.scope)}
    {@const scope = blk.scope as "full-kiln" | "client"}
    <div class="block" class:divide={i === 1}>
      <span class="blabel">{blk.label}</span>
      <div class="list">
        {#each rows(tab, scope) as m (m.id)}
          <div class="mrow">
            <input class="grow" bind:value={m.name} onchange={persist} />
            <div class="modeseg">
              <button class:active={m.mode === "percent"} onclick={() => setModifierMode(m, "percent")}>%</button>
              <button class:active={m.mode === "fixed"} onclick={() => setModifierMode(m, "fixed")}>€</button>
            </div>
            <input class="mval" type="number" min="0" step="0.5" bind:value={m.value} onchange={persist} />
            <button class="del" onclick={() => removeModifier(kilnId, m.id)} aria-label={t.kilnModifiers.removeModifier}>×</button>
          </div>
        {/each}
        {#if rows(tab, scope).length === 0}<p class="none faint">{t.kilnModifiers.noneYet}</p>{/if}
      </div>
      <button class="add" onclick={() => addModifier(kilnId, tab, scope)}>
        {tab === "surcharge" ? t.kilnModifiers.addSurcharge : t.kilnModifiers.addDiscount}
      </button>
    </div>
  {/each}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(3px);
    z-index: 60;
  }
  .pop {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: 94vw;
    max-height: 88vh;
    overflow-y: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 20px 22px 22px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
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
  }
  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 16px;
  }
  .tabs button {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 8px 14px;
    color: var(--text-faint);
    font-size: 14px;
  }
  .tabs button.active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 4px 0 14px;
  }
  .block.divide {
    border-top: 1px solid var(--line-soft);
    padding-top: 16px;
    margin-top: 4px;
  }
  .blabel {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .mrow {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  input {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
    font-size: 14px;
  }
  input:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .modeseg {
    display: flex;
    flex-shrink: 0;
  }
  .modeseg button {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    color: var(--text-dim);
    padding: 8px 10px;
    font-size: 12px;
  }
  .modeseg button:first-child {
    border-radius: 8px 0 0 8px;
  }
  .modeseg button:last-child {
    border-radius: 0 8px 8px 0;
    border-left: none;
  }
  .modeseg button.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .mval {
    width: 64px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .del {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 18px;
    padding: 0 2px;
  }
  .del:hover {
    color: #e88;
  }
  .add {
    align-self: flex-start;
    background: none;
    border: 1px dashed color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 8px;
    padding: 6px 12px;
    color: var(--text-dim);
    font-size: 12.5px;
  }
  .add:hover {
    border-color: var(--accent);
    color: var(--text);
  }
  .none {
    font-size: 12px;
    margin: 0;
  }
</style>
