<script lang="ts">
  import type { KilnShape, KilnEnergy } from "@core";
  import {
    kilnStore,
    addKiln,
    removeKiln,
    kilnVolumeL,
    saveKilns,
    newServiceId,
    BUILTIN_FIXED,
  } from "../lib/kilns.svelte";
  import { app } from "../lib/firing.svelte";
  import { settings, fuelDefFor, fuelKeyForKiln, fuelCostFor } from "../lib/settings.svelte";
  import { eur } from "../lib/format";
  import KilnThumb from "../components/KilnThumb.svelte";
  import PostCylinder from "../components/PostCylinder.svelte";
  import KilnModifiersPanel from "../components/KilnModifiersPanel.svelte";

  let editingId = $state<string | null>(null);
  let confirmDelete = $state(false);
  let modsOpen = $state(false);

  const editing = $derived(kilnStore.list.find((k) => k.id === editingId) ?? null);

  // The "add your first kiln" prompt (and similar) can hand us a kiln to open.
  $effect(() => {
    if (app.editKilnId) {
      editingId = app.editKilnId;
      confirmDelete = false;
      app.editKilnId = null;
    }
  });
  const persist = (): void => saveKilns();

  const energyOptions: { key: KilnEnergy; label: string }[] = [
    { key: "electric", label: "Electric" },
    { key: "gas", label: "Gas" },
    { key: "wood", label: "Wood" },
    { key: "other", label: "Other" },
  ];
  const energyLabel = (k: (typeof kilnStore.list)[number]): string =>
    k.energy === "gas" ? (k.gasType === "butane" ? "Butane" : "Propane") : fuelDefFor(k).label;

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
  function setEnergy(energy: KilnEnergy): void {
    if (!editing) return;
    editing.energy = energy;
    if (energy === "gas" && !editing.gasType) editing.gasType = "propane";
    persist();
  }

  function addService(): void {
    if (!editing) return;
    editing.services.push({ id: newServiceId(), name: "New service", basePrice: 0, fuelUse: 0 });
    persist();
  }
  function removeService(id: string): void {
    if (!editing || editing.services.length <= 1) return;
    editing.services = editing.services.filter((s) => s.id !== id);
    persist();
  }
  function addCost(): void {
    if (!editing) return;
    editing.defaultCostItems.push({ name: "New cost", amount: 0, kind: "fixed" });
    persist();
  }
  function removeCost(idx: number): void {
    if (!editing) return;
    editing.defaultCostItems.splice(idx, 1);
    persist();
  }
  const isBuiltin = (name: string): boolean => (BUILTIN_FIXED as readonly string[]).includes(name);

  // Standard posts as editable mini-cards.
  function addPost(): void {
    if (!editing) return;
    const last = editing.standardPostHeightsCm.at(-1) ?? 8;
    editing.standardPostHeightsCm = [...editing.standardPostHeightsCm, last + 2];
    persist();
  }
  function setPost(i: number, v: number): void {
    if (!editing) return;
    editing.standardPostHeightsCm[i] = Math.max(1, v || 1);
    persist();
  }
  function removePost(i: number): void {
    if (!editing || editing.standardPostHeightsCm.length <= 1) return;
    editing.standardPostHeightsCm.splice(i, 1);
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
          {#if k.location}<div class="faint kloc">{k.location}</div>{/if}
          <div class="faint kmeta">{dimsLabel(k)} · {k.usableHeightCm} cm · {energyLabel(k)}</div>
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
    {@const fuel = fuelDefFor(editing)}
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
            <span class="fl">Energy</span>
            <div class="seg four">
              {#each energyOptions as o (o.key)}
                <button class:active={(editing.energy ?? "other") === o.key} onclick={() => setEnergy(o.key)}>{o.label}</button>
              {/each}
            </div>
            {#if editing.energy === "gas"}
              <div class="seg sub">
                <button class:active={editing.gasType !== "butane"} onclick={() => { editing.gasType = "propane"; persist(); }}>Propane</button>
                <button class:active={editing.gasType === "butane"} onclick={() => { editing.gasType = "butane"; persist(); }}>Butane</button>
              </div>
            {/if}
          </div>

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

          <label class="field">
            <span class="fl">Shelf thickness (cm)</span>
            <input type="number" min="0" step="0.1" bind:value={editing.defaultShelfThicknessCm} onchange={persist} />
          </label>

          <div class="field">
            <span class="fl">Standard post heights</span>
            <div class="posts">
              {#each editing.standardPostHeightsCm as p, i (i)}
                <div class="postcard">
                  <button class="postx" onclick={() => removePost(i)} disabled={editing.standardPostHeightsCm.length <= 1} aria-label="Remove post">×</button>
                  <PostCylinder cm={p} />
                  <div class="postval">
                    <input type="number" min="1" value={p} onchange={(e) => setPost(i, parseFloat(e.currentTarget.value))} />
                    <span class="cmlbl">cm</span>
                  </div>
                </div>
              {/each}
              <button class="postadd" onclick={addPost}>＋<span>Add post</span></button>
            </div>
          </div>
        </section>

        <!-- Pricing -->
        <section class="side">
          <span class="side-title">Pricing &amp; costs</span>

          <div class="field">
            <span class="fl">Services <span class="opt">price + fuel used per firing</span></span>
            <div class="fuelnote faint">
              Fuel: <b>{fuel.label}</b> · {eur(fuel.price)}/{fuel.unit} — update in Home / App Settings.
              Cost = fuel used × this price.
            </div>
            <div class="srow shead">
              <span>Service</span><span class="r">Price</span><span class="r">Fuel ({fuel.unit})</span><span class="r">= fuel</span><span></span>
            </div>
            {#each editing.services as s (s.id)}
              <div class="srow">
                <input class="grow" bind:value={s.name} onchange={persist} />
                <div class="money"><input type="number" min="0" step="0.5" bind:value={s.basePrice} onchange={persist} /><span class="cur">€</span></div>
                <input class="num" type="number" min="0" step="0.1" bind:value={s.fuelUse} onchange={persist} />
                <span class="fcost">{eur(fuelCostFor(editing, s.fuelUse ?? 0))}</span>
                <button class="x" onclick={() => removeService(s.id)} disabled={editing.services.length <= 1} aria-label="Remove">×</button>
              </div>
            {/each}
            <button class="add" onclick={addService}>+ Add service</button>
          </div>

          <div class="field">
            <span class="fl">Fixed costs <span class="opt">flat per firing — internal margin only</span></span>
            <div class="rows">
              {#each editing.defaultCostItems as c, i (i)}
                <div class="lrow">
                  {#if isBuiltin(c.name)}
                    <span class="grow lockname">{c.name}</span>
                  {:else}
                    <input class="grow" bind:value={c.name} onchange={persist} />
                  {/if}
                  <div class="money"><input type="number" min="0" step="0.5" bind:value={c.amount} onchange={persist} /><span class="cur">€</span></div>
                  {#if isBuiltin(c.name)}
                    <span class="xspace"></span>
                  {:else}
                    <button class="x" onclick={() => removeCost(i)} aria-label="Remove">×</button>
                  {/if}
                </div>
              {/each}
            </div>
            <button class="add" onclick={addCost}>+ Add fixed cost</button>
          </div>

          <div class="field">
            <span class="fl">Price modifiers <span class="opt">surcharges &amp; discounts · full-kiln or per-client</span></span>
            <button class="modbtn" onclick={() => (modsOpen = true)}>Kiln Price Modifiers</button>
          </div>
        </section>
      </div>
    </div>
  {/key}
{/if}

{#if modsOpen && editingId}
  <KilnModifiersPanel kilnId={editingId} onclose={() => (modsOpen = false)} />
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
  .kloc {
    font-size: 11.5px;
    margin-top: 1px;
  }
  .kloc::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 10px;
    margin-right: 4px;
    vertical-align: -1px;
    background-color: currentColor;
    opacity: 0.7;
    -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M8%201C5.24%201%203%203.24%203%206c0%203.5%205%208.5%205%208.5s5-5%205-8.5c0-2.76-2.24-5-5-5zm0%206.75A1.75%201.75%200%201%201%208%204.25a1.75%201.75%200%200%201%200%203.5z'/%3E%3C/svg%3E")
      no-repeat center / contain;
    mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M8%201C5.24%201%203%203.24%203%206c0%203.5%205%208.5%205%208.5s5-5%205-8.5c0-2.76-2.24-5-5-5zm0%206.75A1.75%201.75%200%201%201%208%204.25a1.75%201.75%200%200%201%200%203.5z'/%3E%3C/svg%3E")
      no-repeat center / contain;
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
  .seg.sub {
    margin-top: 6px;
  }
  .seg.sub button {
    padding: 7px 0;
    font-size: 12px;
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

  /* Post cards */
  .posts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-end;
  }
  .postcard {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    width: 68px;
    padding: 8px 6px 7px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 10px;
  }
  .postx {
    position: absolute;
    top: 2px;
    right: 3px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 13px;
    line-height: 1;
    padding: 0;
  }
  .postx:hover {
    color: #e88;
  }
  .postx:disabled {
    opacity: 0.25;
  }
  .postval {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }
  .postval input {
    width: 42px;
    padding: 3px 3px;
    text-align: center;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .cmlbl {
    font-size: 10px;
    color: var(--text-faint);
  }
  .postadd {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 68px;
    height: 88px;
    background: none;
    border: 1px dashed color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 10px;
    color: var(--text-dim);
    font-size: 18px;
  }
  .postadd span {
    font-size: 10px;
  }
  .postadd:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  /* Services + costs */
  .fuelnote {
    font-size: 11.5px;
    line-height: 1.5;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 7px 10px;
  }
  .srow {
    display: grid;
    grid-template-columns: 1fr 92px 70px 52px 20px;
    gap: 6px;
    align-items: center;
  }
  .srow.shead {
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .srow.shead .r {
    text-align: right;
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
  .modbtn {
    align-self: flex-start;
    background: var(--panel-2);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 9px 16px;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
  }
  .modbtn:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--panel-2));
  }
  .grow {
    flex: 1;
  }
  .lockname {
    font-size: 14px;
    color: var(--text);
    padding: 9px 2px;
  }
  .money {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .money input {
    width: 100%;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .fcost {
    text-align: right;
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .cur {
    color: var(--text-faint);
    font-size: 13px;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 18px;
    padding: 0;
  }
  .x:hover {
    color: #e88;
  }
  .x:disabled {
    opacity: 0.3;
  }
  .xspace {
    width: 14px;
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
</style>
