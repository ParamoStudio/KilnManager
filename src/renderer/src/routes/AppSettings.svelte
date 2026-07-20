<script lang="ts">
  import { complexityKeys, COMPLEXITY } from "../lib/complexity";
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
    setElectricityMode,
    setElectricityBounds,
    cx,
    fuelLabel,
    fuelUnit,
    FUEL_KINDS,
  } from "../lib/settings.svelte";
  import { eur, num, fmtDay } from "../lib/format";
  import { vault, isDesktop } from "../lib/storage";
  import {
    t,
    LOCALES,
    CURRENCIES,
    getLocale,
    setLocale,
    getCurrency,
    setCurrency,
    type Locale,
    type Currency,
  } from "../lib/i18n.svelte";
  import { onMount } from "svelte";
  import CustomizeTicket from "../components/CustomizeTicket.svelte";

  let customizing = $state(false);

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
  <span class="screen-title">{t.appSettings.title}</span>
  <p class="faint sub">{t.appSettings.subtitle}</p>

  <div class="cols">
    <!-- LEFT: pricing inputs -->
    <section class="side">
      <div class="side-title-row">
        <span class="side-title">{t.appSettings.complexityFactors}</span>
        <span class="helpwrap">
          <button class="help" aria-label={t.appSettings.complexityHelp}>?</button>
          <span class="helptip">
            <span class="hth">{t.appSettings.complexityHelp}</span>
            <span>{t.appSettings.complexityHelpSimple}</span>
            <span>{t.appSettings.complexityHelpMedium}</span>
            <span>{t.appSettings.complexityHelpComplex}</span>
          </span>
        </span>
      </div>
      <p class="faint explain">{@html t.appSettings.complexityExplain}</p>
      <div class="rows">
        {#each complexityKeys as key (key)}
          <div class="lrow">
            <span class="grow cxname">{cx(key).label}</span>
            <div class="fac">
              <span class="mul">×</span>
              <input type="number" min="1" step="0.05" bind:value={settings.complexity[key].factor} onchange={persist} />
            </div>
          </div>
        {/each}
      </div>
      <button class="reset" onclick={resetComplexity}>
        {t.appSettings.resetDefaults(num(COMPLEXITY.simple.factor, 2), num(COMPLEXITY.medium.factor, 2), num(COMPLEXITY.complex.factor, 2))}
      </button>

      <span class="side-title mt">{t.appSettings.fuelPrices}</span>
      <p class="faint explain">{t.appSettings.fuelPricesExplain}</p>
      <div class="ftable">
        {#each FUEL_KINDS as fk (fk)}
          <div class="ftrow">
            <span class="flabel">{fuelLabel(fk)}</span>
            <input class="fprice" type="number" min="0" step="0.01" value={settings.fuels[fk].price} onchange={(e) => recordFuelPrice(fk, parseFloat(e.currentTarget.value))} />
            <span class="funit">/{fuelUnit(fk)}</span>
          </div>
        {/each}
      </div>
      {#if settings.priceHistory.length}
        <div class="hist">
          {#each settings.priceHistory.slice(0, 6) as h (h.id)}
            <span class="hitem">{fuelLabel(h.fuel)} {eur(h.price)} · {fmtDay(h.at)}</span>
          {/each}
        </div>
      {/if}

      <span class="side-title mt">{t.appSettings.electricityPricing}</span>
      <p class="faint explain">{t.appSettings.electricityExplain}</p>
      <div class="segmented">
        <button class:on={settings.electricityMode === "fixed"} onclick={() => setElectricityMode("fixed")}>{t.appSettings.fixed}</button>
        <button class:on={settings.electricityMode === "adaptive"} onclick={() => setElectricityMode("adaptive")}>{t.appSettings.adaptiveAverage}</button>
      </div>
      {#if settings.electricityMode === "adaptive"}
        <div class="band">
          <label class="bandf"><span>{t.appSettings.low}</span>
            <input type="number" min="0" step="0.01" value={settings.electricityLow}
              onchange={(e) => setElectricityBounds(parseFloat(e.currentTarget.value), settings.electricityHigh)} /></label>
          <label class="bandf"><span>{t.appSettings.high}</span>
            <input type="number" min="0" step="0.01" value={settings.electricityHigh}
              onchange={(e) => setElectricityBounds(settings.electricityLow, parseFloat(e.currentTarget.value))} /></label>
          <span class="mid">≈ {num(settings.fuels.electricity.price, 3)} €/kWh</span>
        </div>
      {:else}
        <p class="faint small">{t.appSettings.fixedHint}</p>
      {/if}
    </section>

    <!-- RIGHT: invoice, partners, display, data -->
    <section class="side">
      <button class="customize" onclick={() => (customizing = true)}>{t.appSettings.customizeClientTicket}</button>

      <span class="side-title mt">{t.appSettings.partners}</span>
      <p class="faint explain">{t.appSettings.partnersExplain}</p>
      <div class="partners">
        {#each settings.partners as p (p.id)}
          <div class="partner">
            <div class="prow">
              <input class="pname" bind:value={p.name} onchange={persist} />
              <button class="x" onclick={() => removePartner(p.id)} aria-label={t.appSettings.removePartner}>×</button>
            </div>
            <div class="tiers">
              {#each p.tiers as tier (tier.id)}
                <div class="tier">
                  <input class="grow" bind:value={tier.name} onchange={persist} />
                  <div class="fac">
                    <input type="number" min="0" max="100" step="1" value={Math.round(tier.pct * 100)} onchange={(e) => setPct(tier, e.currentTarget.value)} />
                    <span class="pct">%</span>
                  </div>
                  <button class="star" class:on={tier.default} onclick={() => setDefaultTier(p.id, tier.id)} title={t.appSettings.starTitle}>{tier.default ? "★" : "☆"}</button>
                  <button class="x" onclick={() => removeTier(p.id, tier.id)} aria-label={t.appSettings.removeTier}>×</button>
                </div>
              {/each}
              {#if p.tiers.length === 0}<p class="faint none">{t.appSettings.noTiersYet}</p>{/if}
            </div>
            <button class="add sm" onclick={() => addTier(p.id)}>{t.appSettings.addTier}</button>
          </div>
        {/each}
        {#if settings.partners.length === 0}<p class="faint none">{t.appSettings.noPartnersYet}</p>{/if}
      </div>
      <button class="add" onclick={addPartner}>{t.appSettings.addPartner}</button>

      <span class="side-title mt">{t.appSettings.displayTitle}</span>
      <p class="faint explain">{t.appSettings.displayExplain}</p>
      <div class="disprow">
        <label class="dispf"><span>{t.appSettings.language}</span>
          <select value={getLocale()} onchange={(e) => setLocale(e.currentTarget.value as Locale)}>
            {#each LOCALES as l (l.code)}<option value={l.code}>{l.label}</option>{/each}
          </select>
        </label>
        <label class="dispf"><span>{t.appSettings.currency}</span>
          <select value={getCurrency()} onchange={(e) => setCurrency(e.currentTarget.value as Currency)}>
            {#each CURRENCIES as c (c.code)}<option value={c.code}>{c.label}</option>{/each}
          </select>
        </label>
      </div>
      <p class="faint small">{t.appSettings.currencyHint}</p>

      {#if isDesktop}
        <span class="side-title mt">{t.appSettings.dataFolder}</span>
        <p class="faint explain">{t.appSettings.dataFolderExplain}</p>
        <div class="vault">
          <code class="vpath">{vaultPath ?? "—"}</code>
          <div class="vrow">
            <button class="vbtn" onclick={() => vault.reveal()}>{t.appSettings.revealInFinder}</button>
            <button class="vbtn" onclick={() => changeVault("locate")}>{t.appSettings.locateExisting}</button>
            <button class="vbtn" onclick={() => changeVault("create")}>{t.appSettings.moveOrNew}</button>
          </div>
        </div>
      {/if}
    </section>
  </div>
</div>

{#if customizing}
  <CustomizeTicket onclose={() => (customizing = false)} />
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
    color: var(--text);
    font-weight: 600;
    text-align: center;
    display: block;
  }
  .side-title.mt {
    margin-top: 18px;
  }
  .side-title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .helpwrap {
    position: relative;
    display: inline-flex;
  }
  .help {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid var(--text-faint);
    background: none;
    color: var(--text-faint);
    font-size: 10px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
  }
  .help:hover {
    color: var(--text);
    border-color: var(--text);
  }
  .helptip {
    display: none;
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    width: 270px;
    flex-direction: column;
    gap: 6px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.5);
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-dim);
    text-align: left;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
  }
  .helpwrap:hover .helptip {
    display: flex;
  }
  .hth {
    font-weight: 600;
    color: var(--text);
  }
  .cxname {
    font-size: 14px;
    color: var(--text);
    padding: 9px 2px;
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
  .customize {
    align-self: stretch;
    text-align: center;
    background: color-mix(in srgb, var(--amber) 16%, var(--panel));
    color: var(--amber);
    border: 1px solid color-mix(in srgb, var(--amber) 55%, var(--line));
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
  }
  .customize:hover {
    background: color-mix(in srgb, var(--amber) 26%, var(--panel));
    border-color: var(--amber);
  }
  .segmented {
    display: flex;
    gap: 6px;
  }
  .segmented button {
    flex: 1;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text-dim);
    font-size: 13px;
  }
  .segmented button.on {
    color: var(--text);
    border-color: var(--text-faint);
    background: var(--panel);
    font-weight: 600;
  }
  .band {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }
  .bandf {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .bandf input {
    width: 90px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mid {
    font-size: 13px;
    color: var(--amber);
    font-variant-numeric: tabular-nums;
    padding-bottom: 9px;
  }
  .small {
    font-size: 11.5px;
  }
  .disprow {
    display: flex;
    gap: 12px;
  }
  .dispf {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-dim);
    flex: 1;
  }
  .dispf select {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
    font-size: 13px;
  }
  .dispf select:focus {
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
