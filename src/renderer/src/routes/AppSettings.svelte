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
  } from "../lib/settings.svelte";
  import { contacts } from "../lib/firing.svelte";

  const persist = (): void => saveSettings();

  function setPct(tier: { pct: number }, raw: string): void {
    const v = parseFloat(raw);
    tier.pct = Number.isNaN(v) ? 0 : Math.max(0, Math.min(100, v)) / 100;
    persist();
  }

  // Agenda plain-text export.
  const agendaText = $derived(
    [
      "PÁRAMO — Agenda",
      "",
      ...contacts.list
        .slice()
        .sort((a, b) => `${a.name} ${a.surname ?? ""}`.localeCompare(`${b.name} ${b.surname ?? ""}`))
        .map((c) => {
          const parts = [`${c.name}${c.surname ? ` ${c.surname}` : ""}`];
          if (c.phone) parts.push(c.phone);
          if (c.notes) parts.push(c.notes);
          return "• " + parts.join(" · ");
        }),
    ].join("\n"),
  );
  let copied = $state(false);
  async function copyAgenda(): Promise<void> {
    try {
      await navigator.clipboard.writeText(agendaText);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      copied = false;
    }
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
    </section>

    <!-- Partners -->
    <section class="side">
      <span class="side-title">Partners</span>
      <p class="faint explain">
        Collaborators who take an agreed cut of the gross profit, each with named tiers (e.g.
        their client vs. your client). Shown only in your internal breakdown.
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

      <span class="side-title mt">Agenda export</span>
      <p class="faint explain">Copy your whole contact book as plain text — paste it anywhere.</p>
      <button class="copy" onclick={copyAgenda}>{copied ? "Copied ✓" : `Copy agenda (${contacts.list.length})`}</button>
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
  .copy {
    align-self: flex-start;
    background: var(--panel-2);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 9px 16px;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
  }
  .copy:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--panel-2));
  }
  .none {
    font-size: 12px;
    margin: 2px 0;
  }
</style>
