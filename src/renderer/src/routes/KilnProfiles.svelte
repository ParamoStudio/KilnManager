<script lang="ts">
  import type { KilnShape } from "@core";
  import {
    kilnStore,
    addKiln,
    removeKiln,
    kilnVolumeL,
    saveKilns,
    newServiceId,
  } from "../lib/kilns.svelte";
  import { eur } from "../lib/format";
  import KilnThumb from "../components/KilnThumb.svelte";

  let editingId = $state<string | null>(null);
  let confirmDelete = $state(false);

  const editing = $derived(kilnStore.list.find((k) => k.id === editingId) ?? null);

  const persist = (): void => saveKilns();

  const dimsLabel = (k: (typeof kilnStore.list)[number]): string =>
    k.shape === "cylinder" ? `${k.diameterCm ?? 0} cm Ø` : `${k.widthCm ?? 0} × ${k.depthCm ?? 0} cm`;

  function setShape(shape: KilnShape): void {
    if (!editing) return;
    editing.shape = shape;
    if (shape === "cylinder" && !editing.diameterCm) editing.diameterCm = 40;
    if (shape === "box") {
      if (!editing.widthCm) editing.widthCm = 40;
      if (!editing.depthCm) editing.depthCm = 30;
    }
    persist();
  }

  function addService(): void {
    if (!editing) return;
    editing.services.push({ id: newServiceId(), name: "New service", basePrice: 0 });
    persist();
  }
  function removeService(id: string): void {
    if (!editing || editing.services.length <= 1) return;
    editing.services = editing.services.filter((s) => s.id !== id);
    persist();
  }
  function addCost(): void {
    if (!editing) return;
    editing.defaultCostItems.push({ name: "New cost", amount: 0, kind: "variable" });
    persist();
  }
  function removeCost(idx: number): void {
    if (!editing) return;
    editing.defaultCostItems.splice(idx, 1);
    persist();
  }

  // Standard post heights edited as a comma list; parsed on change.
  let postsText = $state("");
  $effect(() => {
    if (editing) postsText = editing.standardPostHeightsCm.join(", ");
  });
  function commitPosts(): void {
    if (!editing) return;
    const nums = postsText
      .split(/[,\s]+/)
      .map((s) => parseFloat(s))
      .filter((n) => !Number.isNaN(n) && n > 0)
      .sort((a, b) => a - b);
    editing.standardPostHeightsCm = nums.length ? nums : [5, 10];
    postsText = editing.standardPostHeightsCm.join(", ");
    persist();
  }

  function doDelete(): void {
    if (!editingId) return;
    removeKiln(editingId);
    editingId = null;
    confirmDelete = false;
  }
  function openNew(): void {
    const k = addKiln("cylinder");
    editingId = k.id;
    confirmDelete = false;
  }
</script>

{#if !editing}
  <div class="wrap">
    <span class="screen-title">Kiln Profiles</span>
    <p class="faint sub">Your kilns. Prices and costs are per kiln — you don't charge every kiln the same.</p>
    <div class="grid">
      {#each kilnStore.list as k (k.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="kcard" role="button" tabindex="0" onclick={() => (editingId = k.id)}>
          <div class="kthumb"><KilnThumb shape={k.shape} size={58} /></div>
          <div class="kname">{k.name}</div>
          <div class="faint kmeta">{dimsLabel(k)} · {k.usableHeightCm} cm</div>
          <div class="kvol">{kilnVolumeL(k).toFixed(1)} L</div>
          <div class="kservices">
            {#each k.services as s (s.id)}
              <span class="kchip">{s.name} <span class="kprice">{eur(s.basePrice)}</span></span>
            {/each}
          </div>
        </div>
      {/each}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="kcard new" role="button" tabindex="0" onclick={openNew}>
        <span class="plus">+</span>
        <span>New kiln</span>
      </div>
    </div>
  </div>
{:else}
  {#key editingId}
    <div class="editor">
      <div class="ehead">
        <button class="back" onclick={() => { editingId = null; confirmDelete = false; }}>← All kilns</button>
        {#if confirmDelete}
          <button class="del confirm" onclick={doDelete}>Delete “{editing.name}” — confirm?</button>
        {:else}
          <button class="del" onclick={() => (confirmDelete = true)}>Delete kiln</button>
        {/if}
      </div>

      <div class="cols">
        <!-- Properties -->
        <section class="side">
          <span class="side-title">Properties</span>

          <label class="field">
            <span class="fl">Name</span>
            <input bind:value={editing.name} onchange={persist} />
          </label>
          <label class="field">
            <span class="fl">Location <span class="opt">optional</span></span>
            <input bind:value={editing.location} onchange={persist} placeholder="e.g. Back studio" />
          </label>

          <div class="field">
            <span class="fl">Shape</span>
            <div class="seg">
              <button class:active={editing.shape === "cylinder"} onclick={() => setShape("cylinder")}>Cylinder</button>
              <button class:active={editing.shape === "box"} onclick={() => setShape("box")}>Box</button>
            </div>
          </div>

          <div class="row2">
            {#if editing.shape === "cylinder"}
              <label class="field">
                <span class="fl">Diameter (cm)</span>
                <input type="number" min="1" bind:value={editing.diameterCm} onchange={persist} />
              </label>
            {:else}
              <label class="field">
                <span class="fl">Width (cm)</span>
                <input type="number" min="1" bind:value={editing.widthCm} onchange={persist} />
              </label>
              <label class="field">
                <span class="fl">Depth (cm)</span>
                <input type="number" min="1" bind:value={editing.depthCm} onchange={persist} />
              </label>
            {/if}
            <label class="field">
              <span class="fl">Usable height (cm)</span>
              <input type="number" min="1" bind:value={editing.usableHeightCm} onchange={persist} />
            </label>
          </div>

          <div class="volbox">
            <span class="fl">Loadable volume</span>
            <span class="vol">{kilnVolumeL(editing).toFixed(1)} L</span>
          </div>

          <div class="row2">
            <label class="field">
              <span class="fl">Shelf thickness (cm)</span>
              <input type="number" min="0" step="0.1" bind:value={editing.defaultShelfThicknessCm} onchange={persist} />
            </label>
            <label class="field">
              <span class="fl">Standard post heights (cm)</span>
              <input bind:value={postsText} onchange={commitPosts} placeholder="5, 8, 10, 13" />
            </label>
          </div>
        </section>

        <!-- Pricing -->
        <section class="side">
          <span class="side-title">Pricing &amp; costs</span>

          <div class="field">
            <span class="fl">Services <span class="opt">name + full-kiln price</span></span>
            <div class="rows">
              {#each editing.services as s (s.id)}
                <div class="lrow">
                  <input class="grow" bind:value={s.name} onchange={persist} />
                  <div class="money">
                    <input type="number" min="0" step="0.5" bind:value={s.basePrice} onchange={persist} />
                    <span class="cur">€</span>
                  </div>
                  <button class="x" onclick={() => removeService(s.id)} disabled={editing.services.length <= 1} aria-label="Remove">×</button>
                </div>
              {/each}
            </div>
            <button class="add" onclick={addService}>+ Add service</button>
          </div>

          <div class="field">
            <span class="fl">Cost items <span class="opt">internal margin only — never the client price</span></span>
            <div class="rows">
              {#each editing.defaultCostItems as c, i (i)}
                <div class="lrow">
                  <input class="grow" bind:value={c.name} onchange={persist} />
                  <div class="money">
                    <input type="number" min="0" step="0.5" bind:value={c.amount} onchange={persist} />
                    <span class="cur">€</span>
                  </div>
                  <button class="kind" onclick={() => { c.kind = c.kind === "fixed" ? "variable" : "fixed"; persist(); }} title="Fixed = default from profile · Variable = adjust per firing">
                    {c.kind === "fixed" ? "fixed" : "variable"}
                  </button>
                  <button class="x" onclick={() => removeCost(i)} aria-label="Remove">×</button>
                </div>
              {/each}
              {#if editing.defaultCostItems.length === 0}<p class="faint none">No cost items yet.</p>{/if}
            </div>
            <button class="add" onclick={addCost}>+ Add cost item</button>
          </div>
        </section>
      </div>
    </div>
  {/key}
{/if}

<style>
  .wrap {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
  }
  .screen-title {
    font-size: 18px;
    font-weight: 600;
  }
  .sub {
    font-size: 13px;
    margin: 0 0 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
    overflow-y: auto;
    padding: 2px;
    min-height: 0;
    align-content: start;
  }
  .kcard {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 22px 18px;
    cursor: pointer;
    transition: border-color 0.15s ease;
    text-align: center;
  }
  .kcard:hover {
    border-color: var(--text-faint);
  }
  .kthumb {
    margin-bottom: 4px;
  }
  .kname {
    font-size: 15px;
    font-weight: 600;
  }
  .kmeta {
    font-size: 12px;
  }
  .kvol {
    font-size: 13px;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
  }
  .kservices {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    justify-content: center;
    margin-top: 8px;
  }
  .kchip {
    font-size: 11px;
    color: var(--text-dim);
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 3px 9px;
  }
  .kprice {
    color: var(--green);
    font-variant-numeric: tabular-nums;
  }
  .kcard.new {
    justify-content: center;
    border-style: dashed;
    border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
    color: var(--text-dim);
    font-size: 14px;
    font-weight: 600;
  }
  .kcard.new:hover {
    border-color: var(--accent);
    color: var(--text);
  }
  .kcard.new .plus {
    font-size: 34px;
    font-weight: 300;
    color: var(--accent);
    line-height: 1;
  }

  /* Editor */
  .editor {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }
  .ehead {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .back {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 14px;
    font-weight: 600;
  }
  .back:hover {
    color: var(--text);
  }
  .del {
    background: none;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 13px;
    color: var(--text-faint);
    font-size: 12px;
  }
  .del:hover {
    color: #e88;
    border-color: #e88;
  }
  .del.confirm {
    color: #e88;
    border-color: #e88;
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 4px;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .side-title {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .fl {
    font-size: 12px;
    color: var(--text-dim);
  }
  .opt {
    color: var(--text-faint);
    font-size: 11px;
  }
  input {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    width: 100%;
  }
  input:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .seg {
    display: flex;
    gap: 6px;
  }
  .seg button {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 9px 0;
    color: var(--text-dim);
    font-size: 13px;
  }
  .seg button.active {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
  }
  .volbox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .vol {
    font-size: 20px;
    font-weight: 600;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .lrow {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .grow {
    flex: 1;
  }
  .money {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .money input {
    width: 78px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .cur {
    color: var(--text-faint);
    font-size: 13px;
  }
  .kind {
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    padding: 6px 9px;
    color: var(--text-dim);
    font-size: 11px;
    white-space: nowrap;
  }
  .kind:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 18px;
    padding: 0 4px;
  }
  .x:hover {
    color: #e88;
  }
  .x:disabled {
    opacity: 0.3;
  }
  .add {
    align-self: flex-start;
    background: none;
    border: 1px dashed color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 8px;
    padding: 7px 13px;
    color: var(--text-dim);
    font-size: 13px;
    margin-top: 2px;
  }
  .add:hover {
    border-color: var(--accent);
    color: var(--text);
  }
  .none {
    font-size: 12px;
    margin: 2px 0;
  }
</style>
