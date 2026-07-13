<script lang="ts">
  import {
    planner,
    ui,
    currentKiln,
    selectShelf,
    toggleZone,
    zoneOwner,
    occupiedFraction,
    occupancyBand,
    clientNames,
  } from "../lib/firing.svelte";
  import { colorForName } from "../lib/colors";

  const kiln = $derived(currentKiln());
  const names = $derived(clientNames());

  // viewBox geometry
  const Y0 = 64;
  const Y1 = 504;
  const H = Y1 - Y0;
  const X0 = 170;
  const X1 = 580;
  const CX = (X0 + X1) / 2;
  const RX = (X1 - X0) / 2;
  const RY = 24;

  const pxPerCm = $derived(H / kiln.usableHeightCm);

  // Stack shelves from the top; remaining height sits at the bottom (mockup style).
  const rows = $derived.by(() => {
    let accTop = 0;
    return planner.levels.map((l) => {
      const consumed = l.supportHeightCm + l.shelfThicknessCm;
      const yTop = Y0 + accTop * pxPerCm;
      accTop += consumed;
      return { level: l, consumed, yTop, yBottom: Y0 + accTop * pxPerCm };
    });
  });
  const usedCm = $derived(rows.reduce((a, r) => a + r.consumed, 0));
  const remainingCm = $derived(Math.max(0, kiln.usableHeightCm - usedCm));
  const yUsedBottom = $derived(Y0 + usedCm * pxPerCm);

  const ticks = $derived(
    Array.from({ length: Math.floor(kiln.usableHeightCm / 10) + 1 }, (_, i) => i * 10),
  );
  const yOfCm = (cm: number): number => Y1 - cm * pxPerCm;

  function zoneClick(levelId: string, segIdx: number): void {
    if (ui.mode === "structure") selectShelf(levelId);
    else toggleZone(levelId, segIdx);
  }

  function fillOpacity(levelId: string, segIdx: number): number {
    const owner = zoneOwner(levelId, segIdx);
    if (!owner) return 0;
    if (ui.mode === "assign" && owner === ui.activeClient) return 0.3;
    return 0.14;
  }

  const bandColor: Record<string, string> = {
    low: "var(--blue)",
    balanced: "var(--green)",
    high: "var(--amber)",
  };

  function truncate(name: string, division: number): string {
    const maxChars = Math.max(3, Math.floor(28 / division));
    return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
  }
</script>

<svg viewBox="0 0 780 560" class="kiln-svg" preserveAspectRatio="xMidYMid meet">
  <defs>
    <pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--line-soft)" stroke-width="1" />
    </pattern>
  </defs>

  <!-- Diameter dimension -->
  <g class="dim" text-anchor="middle">
    <text x={CX} y="20" class="lbl">USABLE DIAMETER</text>
    <line x1={X0} y1="34" x2={X1} y2="34" class="dim-line" />
    <line x1={X0} y1="30" x2={X0} y2="38" class="dim-line" />
    <line x1={X1} y1="30" x2={X1} y2="38" class="dim-line" />
    <text x={CX} y="49" class="val">
      {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm} × ${kiln.depthCm} cm`}
    </text>
  </g>

  <!-- Ruler -->
  <g class="ruler" text-anchor="end">
    <text x="104" y={Y0 - 14} class="lbl">USABLE H.</text>
    <text x="104" y={Y0 - 1} class="val">{kiln.usableHeightCm} cm</text>
    {#each ticks as t (t)}
      <g>
        <line x1="112" y1={yOfCm(t)} x2="124" y2={yOfCm(t)} class="tick" />
        <text x="104" y={yOfCm(t) + 4} class="tick-lbl">{t}</text>
      </g>
    {/each}
  </g>

  <!-- Kiln body -->
  {#if kiln.shape === "cylinder"}
    <ellipse cx={CX} cy={Y0} rx={RX} ry={RY} class="rim" />
    <ellipse cx={CX} cy={Y1} rx={RX} ry={RY} class="rim rim-bottom" />
    <line x1={X0} y1={Y0} x2={X0} y2={Y1} class="side" />
    <line x1={X1} y1={Y0} x2={X1} y2={Y1} class="side" />
  {:else}
    <rect x={X0} y={Y0} width={X1 - X0} height={H} rx="6" class="side" fill="none" />
  {/if}

  <!-- Remaining space (bottom) -->
  {#if remainingCm > 0.5}
    <rect x={X0 + 2} y={yUsedBottom} width={X1 - X0 - 4} height={Y1 - yUsedBottom} fill="url(#hatch)" class="remaining-fill" />
    <text x={CX} y={(yUsedBottom + Y1) / 2 + 4} text-anchor="middle" class="remaining-lbl">
      {Math.round(remainingCm)} cm remaining
    </text>
  {/if}

  <!-- Levels -->
  {#each rows as row, i (row.level.id)}
    {@const lvl = row.level}
    {@const selected = ui.mode === "structure" && ui.selectedShelfId === lvl.id}
    {@const occ = occupiedFraction(lvl)}
    {@const colW = (X1 - X0 - 16) / lvl.division}
    {@const bandH = row.yBottom - row.yTop}

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <g
      class="band"
      class:selected
      class:clickable={ui.mode === "structure"}
      role="button"
      tabindex="-1"
      onclick={() => ui.mode === "structure" && selectShelf(lvl.id)}
    >
      <!-- band frame -->
      <rect x={X0 + 6} y={row.yTop + 2} width={X1 - X0 - 12} height={Math.max(2, bandH - 4)} class="band-rect" class:selected rx="4" />

      <!-- zones -->
      {#each lvl.segments as seg, k (k)}
        {@const zx = X0 + 8 + k * colW}
        {@const owner = seg?.contactName ?? null}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g
          class="zone"
          class:assignable={ui.mode === "assign"}
          role="button"
          tabindex="-1"
          onclick={(e) => {
            e.stopPropagation();
            zoneClick(lvl.id, k);
          }}
        >
          <rect
            x={zx}
            y={row.yTop + 4}
            width={colW - 2}
            height={Math.max(2, bandH - 8)}
            rx="3"
            fill={owner ? colorForName(owner, names) : "transparent"}
            fill-opacity={fillOpacity(lvl.id, k)}
            class="zone-rect"
            class:free={!owner}
            style={owner ? `--z: ${colorForName(owner, names)}` : ""}
          />
          {#if bandH > 22}
            {#if owner}
              <text x={zx + colW / 2} y={(row.yTop + row.yBottom) / 2 + 4} text-anchor="middle" class="zone-name">
                {truncate(owner, lvl.division)}
              </text>
            {:else if ui.mode === "structure"}
              <text x={zx + colW / 2} y={(row.yTop + row.yBottom) / 2 + 4} text-anchor="middle" class="zone-frac">
                {lvl.division === 1 ? "FULL" : `1/${lvl.division}`}
              </text>
            {:else}
              <text x={zx + colW / 2} y={(row.yTop + row.yBottom) / 2 + 4} text-anchor="middle" class="zone-free">free</text>
            {/if}
          {/if}
        </g>
        {#if k > 0}
          <line x1={zx - 1} y1={row.yTop + 6} x2={zx - 1} y2={row.yBottom - 4} class="divider" />
        {/if}
      {/each}

      <!-- shelf slab -->
      {#if kiln.shape === "cylinder"}
        <ellipse cx={CX} cy={row.yBottom} rx={RX - 8} ry="7" class="slab" />
      {:else}
        <line x1={X0 + 6} y1={row.yBottom} x2={X1 - 6} y2={row.yBottom} class="slab-line" />
      {/if}

      <!-- index + height -->
      <text x={X0 + 16} y={row.yTop + 20} class="idx">{String(rows.length - i).padStart(2, "0")}</text>
      <text x={X0 + 16} y={row.yTop + 34} class="idx-h">{Math.round(row.consumed)} cm</text>

      <!-- occupancy -->
      <text x={X1 + 34} y={(row.yTop + row.yBottom) / 2 - 2} text-anchor="start" class="occ" style="fill: {bandColor[occupancyBand(occ)]}">
        {Math.round(occ * 100)}%
      </text>
    </g>
  {/each}

  {#if rows.length === 0}
    <text x={CX} y={(Y0 + Y1) / 2} text-anchor="middle" class="empty">Add a shelf to start</text>
  {/if}
</svg>

<style>
  .kiln-svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .lbl {
    font-size: 10px;
    letter-spacing: 0.12em;
    fill: var(--text-faint);
  }
  .val {
    font-size: 13px;
    fill: var(--text-dim);
  }
  .dim-line {
    stroke: var(--line);
    stroke-width: 1;
  }
  .tick {
    stroke: var(--line-soft);
    stroke-width: 1;
  }
  .tick-lbl {
    font-size: 10px;
    fill: var(--text-faint);
  }
  .rim {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.25;
  }
  .rim-bottom {
    stroke: var(--line-soft);
  }
  .side {
    stroke: var(--line);
    stroke-width: 1.25;
  }
  .band-rect {
    fill: transparent;
    stroke: var(--line-soft);
    stroke-width: 1;
  }
  .band-rect.selected {
    stroke: var(--accent);
    stroke-width: 1.5;
  }
  .band.clickable {
    cursor: pointer;
  }
  .zone.assignable {
    cursor: pointer;
  }
  .zone-rect {
    stroke: var(--z, transparent);
    stroke-opacity: 0.55;
    stroke-width: 1;
    transition:
      fill-opacity 0.18s ease,
      stroke-opacity 0.18s ease;
  }
  .zone-rect.free {
    stroke: var(--line-soft);
    stroke-dasharray: 3 3;
  }
  .zone.assignable:hover .zone-rect {
    stroke: var(--text-faint);
    stroke-dasharray: none;
  }
  .divider {
    stroke: var(--line-soft);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .slab {
    fill: rgba(255, 255, 255, 0.02);
    stroke: var(--line);
    stroke-width: 1;
  }
  .slab-line {
    stroke: var(--line);
    stroke-width: 1.5;
  }
  .idx {
    font-size: 13px;
    font-weight: 600;
    fill: var(--text);
  }
  .idx-h {
    font-size: 10px;
    fill: var(--text-faint);
  }
  .zone-name {
    font-size: 12px;
    fill: var(--text);
  }
  .zone-frac {
    font-size: 11px;
    letter-spacing: 0.08em;
    fill: var(--text-faint);
  }
  .zone-free {
    font-size: 10px;
    fill: var(--text-faint);
    opacity: 0.5;
  }
  .occ {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .remaining-fill {
    opacity: 0.5;
  }
  .remaining-lbl {
    font-size: 11px;
    fill: var(--text-faint);
  }
  .empty {
    font-size: 14px;
    fill: var(--text-faint);
  }
</style>
