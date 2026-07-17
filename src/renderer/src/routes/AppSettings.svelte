<script lang="ts">
  import { complexityKeys } from "../lib/complexity";
  import {
    settings,
    saveSettings,
    resetComplexity,
    addPartner,
    removePartner,
    addTier,
    removeTier,
    setDefaultTier,
    recordFuelPrice,
    FUEL_KINDS,
  } from "../lib/settings.svelte";
  import { eur, fmtDay } from "../lib/format";
  import { vault, isDesktop } from "../lib/storage";
  import { onMount } from "svelte";

  const persist = (): void => saveSettings();

  function setPct(tier: { pct: number }, raw: string): void {
    const v = parseFloat(raw);
    tier.pct = Number.isNaN(v) ? 0 : Math.max(0, Math.min(100, v)) / 100;
    persist();
  }

  // Data folder (vault) — desktop only.
  let vaultPath = $state<string | null>(null);
  onMount(async () => {
    if (isDesktop) vaultPath = (await vault.status()).path;
  });
  async function changeVault(mode: "create" | "locate"): Promise<void> {
    const r = await vault.pick(mode);
    if (r.ok) location.reload(); // re-read data from the new folder
  }
</script>

<div class="wrap">
  <span class="screen-title">App Settings</span>
  <p class="faint sub">Studio-wide settings. Kiln-specific prices and costs live in Kiln Profiles.</p>

  <div class="cols">
    <!-- Complexity -->
    <section class="side">
      <span class="side-title">Complexity factors</span>
      <p class="faint explain">
        Every piece counts as its shelf volume <b>×</b> its complexity factor — that's its
        <b>KLU</b> (kiln-load unit). A firing's price is split across everyone by their share of
        the total KLU, so a trickier load fairly carries a bit more.
      </p>
      <div class="rows">
        {#each complexityKeys as key (key)}
          <div class="lrow">
            <input class="grow" bind:value={settings.complexity[key].label} onchange={persist} />
            <div class="fac">
              <span class="mul">×</span>
              <input type="number" min="1" step="0.05" bind:value={settings.complexity[key].factor} onchange={persist} />
            </div>
          </div>
        {/each}
      </div>
      <button class="reset" onclick={resetComplexity}>Reset to defaults (1.00 / 1.15 / 1.30)</button>

      <span class="side-title mt">Fuel prices</span>
      <p class="faint explain">
        The volatile part of each firing's cost. Set the current price per unit; it multiplies each
        service's fuel use. You can also update these quickly from Home when you buy.
      </p>
      <div class="ftable">
        {#each FUEL_KINDS as fk (fk)}
          {@const f = settings.fuels[fk]}
          <div class="ftrow">
            <span class="flabel">{f.label}</span>
            <input class="fprice" type="number" min="0" step="0.01" value={f.price} onchange={(e) => recordFuelPrice(fk, parseFloat(e.currentTarget.value))} />
            <span class="funit">/{f.unit}</span>
          </div>
        {/each}
      </div>
      {#if settings.priceHistory.length}
        <div class="hist">
          {#each settings.priceHistory.slice(0, 6) as h (h.id)}
            <span class="hitem">{settings.fuels[h.fuel].label} {eur(h.price)} · {fmtDay(h.at)}</span>
          {/each}
        </div>
      {/if}

      {#if isDesktop}
        <span class="side-title mt">Data folder</span>
        <p class="faint explain">
          Everything is stored as plain JSON files here — yours to open, back up, or move.
        </p>
        <div class="vault">
          <code class="vpath">{vaultPath ?? "—"}</code>
          <div class="vrow">
            <button class="vbtn" onclick={() => vault.reveal()}>Reveal in Finder</button>
            <button class="vbtn" onclick={() => changeVault("locate")}>Locate existing…</button>
            <button class="vbtn" onclick={() => changeVault("create")}>Move / new…</button>
          </div>
        </div>
      {/if}
    </section>

    <!-- Partners -->
    <section class="side">
      <span class="side-title">Partners</span>
      <p class="faint explain">
        Collaborators who take an agreed cut of the gross profit, each with named tiers (e.g.
        their client vs. your client). Shown only in your internal breakdown. Mark a tier with
        ★ to apply it by default on every new firing (uncheck it per firing if needed).
      </p>
      <div class="partners">
        {#each settings.partners as p (p.id)}
          <div class="partner">
            <div class="prow">
              <input class="pname" bind:value={p.name} onchange={persist} />
              <button class="x" onclick={() => removePartner(p.id)} aria-label="Remove partner">×</button>
            </div>
            <div class="tiers">
              {#each p.tiers as t (t.id)}
                <div class="tier">
                  <input class="grow" bind:value={t.name} onchange={persist} />
                  <div class="fac">
                    <input type="number" min="0" max="100" step="1" value={Math.round(t.pct * 100)} onchange={(e) => setPct(t, e.currentTarget.value)} />
                    <span class="pct">%</span>
                  </div>
                  <button class="star" class:on={t.default} onclick={() => setDefaultTier(p.id, t.id)} title="Apply by default on new firings">{t.default ? "★" : "☆"}</button>
                  <button class="x" onclick={() => removeTier(p.id, t.id)} aria-label="Remove tier">×</button>
                </div>
              {/each}
              {#if p.tiers.length === 0}<p class="faint none">No tiers yet.</p>{/if}
            </div>
            <button class="add sm" onclick={() => addTier(p.id)}>+ Add tier</button>
          </div>
        {/each}
        {#if settings.partners.length === 0}<p class="faint none">No partners yet.</p>{/if}
      </div>
      <button class="add" onclick={addPartner}>+ Add partner</button>

      <span class="side-title mt">Client ticket</span>
      <p class="faint explain">
        The name that heads the ticket and the message you copy when sending it.
        Use <b>{"{client}"}</b> and <b>{"{total}"}</b> as placeholders.
      </p>
      <label class="field">
        <span class="fl">Studio / workshop name</span>
        <input bind:value={settings.studioName} onchange={persist} placeholder="Ranxo Taller" />
        <span class="hint">Where you fire. If you fire at a communal or shared workshop, put its name here.</span>
      </label>
      <label class="field">
        <span class="fl">Message</span>
        <textarea class="msg" rows="3" bind:value={settings.ticketMessage} onchange={persist}></textarea>
      </label>
    </section>
  </div>
</div>

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
  .side-title.mt {
    margin-top: 18px;
  }
  .explain {
    font-size: 12.5px;
    line-height: 1.6;
    margin: 0;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .lrow,
  .tier {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .grow {
    flex: 1;
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
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 8px;
  }
  .fl {
    font-size: 12px;
    color: var(--text-dim);
  }
  .hint {
    font-size: 11px;
    color: var(--text-faint);
    line-height: 1.5;
  }
  .msg {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
    font-size: 13px;
    resize: vertical;
    line-height: 1.5;
  }
  .msg:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .fac {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .fac input {
    width: 74px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mul,
  .pct {
    color: var(--text-faint);
    font-size: 13px;
  }
  /* Fuel prices as an aligned little table with row dividers + a border. */
  .ftable {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
  }
  .ftrow {
    display: grid;
    grid-template-columns: 1fr 96px 54px;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--line-soft);
  }
  .ftrow:last-child {
    border-bottom: none;
  }
  .flabel {
    font-size: 14px;
    color: var(--text);
  }
  .fprice {
    width: 100%;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .funit {
    color: var(--text-faint);
    font-size: 12px;
  }
  .hist {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--line-soft);
  }
  .hitem {
    font-size: 10.5px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .vault {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .vpath {
    font-size: 11.5px;
    color: var(--text-dim);
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 8px 10px;
    word-break: break-all;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .vrow {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .vbtn {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 12px;
    color: var(--text-dim);
    font-size: 12px;
  }
  .vbtn:hover {
    border-color: var(--text-faint);
    color: var(--text);
  }
  .reset {
    align-self: flex-start;
    background: none;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 13px;
    color: var(--text-faint);
    font-size: 12px;
    margin-top: 2px;
  }
  .reset:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .partners {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .partner {
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .prow {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .pname {
    font-weight: 600;
  }
  .tiers {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-left: 2px;
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
  .star {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 15px;
    padding: 0 2px;
  }
  .star.on {
    color: var(--amber);
  }
  .star:hover {
    color: var(--amber);
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
  .add.sm {
    padding: 5px 10px;
    font-size: 12px;
  }
  .none {
    font-size: 12px;
    margin: 2px 0;
  }
</style>
