<script lang="ts">
  /**
   * The visual kiln — a portrait/touch port of the desktop app's KilnSvg.
   * Same identity: kiln body (cylinder/box), a usable-height ruler, shelves
   * stacked from the floor up, zones labelled (shelf/position) and colour-coded
   * by client. Tap a zone to select it (amber outline); the parent turns the
   * selection into an assignment. "+ Add shelf" floats in the free headroom.
   */
  import {
    draft,
    currentKiln,
    isSelected,
    toggleSelection,
    occupiedFraction,
    occupancyBand,
    removeLevel,
    roomForNewShelf,
    clientNames,
    zoneLabel,
    complexityFactor,
    MYSELF,
    type PlannerLevel,
  } from "../lib/loader.svelte";
  import { t } from "../lib/i18n.svelte";
  import { colorForIndex } from "../lib/colors";

  let { onAddShelf }: { onAddShelf: () => void } = $props();

  const kiln = $derived(currentKiln(draft.planner));
  const names = $derived(clientNames());
  const colorOf = (owner: string): string =>
    owner === MYSELF ? "#ffffff" : colorForIndex(names.filter((n) => n !== MYSELF).indexOf(owner));

  const cxInitial: Record<string, string> = { simple: "S", medium: "M", complex: "C" };
  const cxLabel: Record<string, string> = $derived({
    simple: t.loader.complexitySimple,
    medium: t.loader.complexityMedium,
    complex: t.loader.complexityComplex,
  });
  const displayName = (owner: string): string => (owner === MYSELF ? t.loader.myself : owner);

  // Portrait geometry (viewBox units). A fixed headroom band below the rim
  // always holds the add-shelf button, so it never collides with the top shelf.
  // Deliberately squat (short body) so the whole kiln fits with little scroll.
  const TOPY = 64;
  const RY = 13;
  const X0 = 66;
  const X1 = 300;
  const CX = (X0 + X1) / 2;
  const RX = (X1 - X0) / 2;
  const HEADROOM = 52;
  const BODYPX = 300;
  const yTopInner = TOPY + HEADROOM;
  const yBotInner = yTopInner + BODYPX;
  const BOTY = yBotInner;
  const VB_H = yBotInner + 28;

  const pxPerCm = $derived(kiln ? BODYPX / kiln.usableHeightCm : 1);
  const yOfCm = (cm: number): number => yBotInner - cm * pxPerCm;
  const fmtCm = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  const rows = $derived.by(() => {
    const arr = draft.planner.levels;
    const res: { id: string; consumed: number; yPlate: number; ySpaceTop: number; div: number }[] = new Array(arr.length);
    let acc = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      const l = arr[i]!;
      const consumed = l.supportHeightCm + l.shelfThicknessCm;
      const yPlate = yBotInner - acc * pxPerCm;
      acc += consumed;
      res[i] = { id: l.id, consumed, yPlate, ySpaceTop: yBotInner - acc * pxPerCm, div: l.division };
    }
    return res;
  });

  const usedCm = $derived(rows.reduce((a, r) => a + r.consumed, 0));
  const remaining = $derived(kiln ? Math.max(0, kiln.usableHeightCm - usedCm) : 0);
  const yRemBottom = $derived(yOfCm(usedCm));
  const canAdd = $derived(roomForNewShelf(draft.planner) > 0);

  const ticks = $derived(
    kiln ? Array.from({ length: Math.floor(kiln.usableHeightCm / 10) + 1 }, (_, i) => i * 10) : [],
  );

  const bandColor: Record<string, string> = {
    low: "var(--blue, #8ab6f0)",
    balanced: "var(--green, #7fdca4)",
    high: "var(--amber, #f4b880)",
  };

  function truncate(name: string, division: number): string {
    const max = Math.max(4, Math.floor(22 / division));
    return name.length > max ? name.slice(0, max - 1) + "…" : name;
  }
</script>

{#if kiln}
  <svg viewBox="0 0 360 {VB_H}" class="kiln-svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <marker id="marr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
        <path d="M1,1 L6,3.5 L1,6" fill="none" stroke="var(--line)" stroke-width="1" />
      </marker>
      <pattern id="rem-hatch" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="9" stroke="var(--line-soft)" stroke-width="0.75" />
      </pattern>
    </defs>

    <!-- Diameter dimension — label, then value, then the arrow line, each on
         its own row with clear gaps from the rim below. -->
    <text x={CX} y="12" text-anchor="middle" class="lbl">{kiln.shape === "cylinder" ? t.kiln.usableDiameter : t.kiln.usableSize}</text>
    <text x={CX} y="30" text-anchor="middle" class="val">
      {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm} × ${kiln.depthCm} cm`}
    </text>
    <line x1={X0} y1="40" x2={X1} y2="40" class="dim" marker-start="url(#marr)" marker-end="url(#marr)" />

    <!-- Height ruler -->
    <text x="2" y={yTopInner - 26} text-anchor="start" class="lbl">{t.kiln.usableHeight}</text>
    <text x="2" y={yTopInner - 10} text-anchor="start" class="val">{kiln.usableHeightCm} cm</text>
    <line x1="44" y1={yTopInner} x2="44" y2={yBotInner} class="dim-soft" />
    {#each ticks as tk (tk)}
      <line x1="40" y1={yOfCm(tk)} x2="48" y2={yOfCm(tk)} class="tick" />
      <text x="35" y={yOfCm(tk) + 3} text-anchor="end" class="tick-lbl">{tk}</text>
    {/each}

    <!-- Kiln body -->
    {#if kiln.shape === "cylinder"}
      <ellipse cx={CX} cy={TOPY} rx={RX} ry={RY} class="rim" />
      <path d="M {X0} {TOPY} L {X0} {BOTY}" class="side" />
      <path d="M {X1} {TOPY} L {X1} {BOTY}" class="side" />
      <path d="M {X0} {BOTY} A {RX} {RY} 0 0 0 {X1} {BOTY}" class="rim" />
      <path d="M {X0} {BOTY} A {RX} {RY} 0 0 1 {X1} {BOTY}" class="rim-back" />
    {:else}
      <rect x={X0} y={TOPY} width={X1 - X0} height={BOTY - TOPY} rx="4" class="side" fill="none" />
    {/if}

    <!-- Remaining hatch + "+ Add shelf" floating in the free headroom -->
    {#if remaining > 0.5}
      <rect x={X0 + 3} y={yTopInner} width={X1 - X0 - 6} height={Math.max(0, yRemBottom - yTopInner)} fill="url(#rem-hatch)" opacity="0.5" />
    {/if}
    {#if canAdd}
      {@const spanTop = TOPY + RY + 16}
      {@const cy = Math.max(spanTop + 18, Math.min((spanTop + yRemBottom) / 2, yRemBottom - 30))}
      {@const showRem = remaining > 0.5 && yRemBottom - cy > 42}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <g class="add" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); onAddShelf(); }}>
        <rect x={CX - 80} y={cy - 18} width="160" height="36" rx="9" class="add-rect" />
        <text x={CX} y={cy + 5} text-anchor="middle" class="add-lbl">{t.loader.addShelf}</text>
      </g>
      {#if showRem}
        <text x={CX} y={cy + 32} text-anchor="middle" class="rem-lbl">{t.kiln.remaining(fmtCm(remaining))}</text>
      {/if}
    {:else if remaining > 0.5}
      <text x={CX} y={(TOPY + RY + 16 + yRemBottom) / 2} text-anchor="middle" class="rem-lbl">{t.kiln.remaining(fmtCm(remaining))}</text>
    {/if}

    <!-- Shelves -->
    {#each rows as row, i (row.id)}
      {@const lvl = draft.planner.levels[i] as PlannerLevel}
      {@const colW = (X1 - X0) / row.div}
      {@const occ = occupiedFraction(lvl)}
      {@const bandH = row.yPlate - row.ySpaceTop}

      <!-- height dimension on the left of the shelf -->
      {#if bandH > 14}
        <line x1={X0 - 12} y1={row.ySpaceTop + 3} x2={X0 - 12} y2={row.yPlate - 3} class="dim-br" />
        <text x={X0 - 16} y={(row.ySpaceTop + row.yPlate) / 2 + 3.5} text-anchor="end" class="dim-cm">{fmtCm(row.consumed)}</text>
      {/if}

      <!-- zones -->
      {#each lvl.segments as seg, k (k)}
        {@const zx = X0 + k * colW}
        {@const owner = seg?.contactName ?? null}
        {@const s = isSelected(row.id, k)}
        {@const nameFs = Math.max(8, Math.min(bandH > 34 ? 13 : 11, colW * 0.13))}
        {@const midY = (row.ySpaceTop + row.yPlate) / 2}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g class="zone" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); toggleSelection(row.id, k); }}>
          <rect
            x={zx + 1.5}
            y={row.ySpaceTop + 1.5}
            width={colW - 3}
            height={row.yPlate - row.ySpaceTop - 2.5}
            rx="3"
            fill={owner ? colorOf(owner) : "transparent"}
            fill-opacity={owner ? 0.14 : 0}
            class="zone-rect"
            class:sel={s}
            class:free={!owner}
            style={owner ? `--z:${colorOf(owner)}` : ""}
          />
          <text x={zx + 6} y={row.ySpaceTop + 14} class="zid">{zoneLabel(draft.planner, row.id, k)}</text>
          {#if owner && seg}
            {#if bandH > 34}
              <text x={zx + colW / 2} y={midY - 1} text-anchor="middle" class="zname" style="font-size:{nameFs}px">{truncate(displayName(owner), row.div)}</text>
              <text x={zx + colW / 2} y={midY + 13} text-anchor="middle" class="zcx">{cxLabel[seg.complexity]}</text>
            {:else}
              <text x={zx + colW / 2 + 8} y={row.ySpaceTop + 14} text-anchor="middle" class="zname" style="font-size:{nameFs}px">
                {truncate(displayName(owner), row.div * 2)} · {cxInitial[seg.complexity]}
              </text>
            {/if}
          {:else if bandH > 20}
            <text x={zx + colW / 2} y={midY + 3.5} text-anchor="middle" class="zfrac">
              {row.div === 1 ? t.kiln.full : `1/${row.div}`}
            </text>
          {/if}
        </g>
        {#if k > 0}
          <line x1={zx} y1={row.ySpaceTop + 3} x2={zx} y2={row.yPlate - 2} class="divider" />
        {/if}
      {/each}

      <!-- shelf plate -->
      {#if kiln.shape === "cylinder"}
        <ellipse cx={CX} cy={row.yPlate} rx={RX - 5} ry="6" class="plate" />
        <path d="M {X0 + 5} {row.yPlate} A {RX - 5} 6 0 0 0 {X1 - 5} {row.yPlate}" class="plate-front" />
      {:else}
        <line x1={X0 + 3} y1={row.yPlate} x2={X1 - 3} y2={row.yPlate} class="plate-line" />
      {/if}

      <!-- occupancy % + remove, just right of the body -->
      {@const midY = (row.ySpaceTop + row.yPlate) / 2}
      <text x={X1 + 34} y={midY + 4} text-anchor="end" class="occ" style="fill:{bandColor[occupancyBand(occ)]}">{Math.round(occ * 100)}%</text>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <g class="ctrl del" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); removeLevel(draft.planner, row.id); }}>
        <circle cx={X1 + 47} cy={midY} r="11" class="ctrl-c" />
        <text x={X1 + 47} y={midY + 4} text-anchor="middle" class="ctrl-i">×</text>
      </g>
    {/each}
  </svg>
{/if}

<style>
  .kiln-svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .lbl {
    font-size: 9px;
    letter-spacing: 0.12em;
    fill: var(--text-faint);
  }
  .val {
    font-size: 13px;
    fill: var(--text);
  }
  .dim {
    stroke: var(--line);
    stroke-width: 1;
  }
  .dim-soft {
    stroke: color-mix(in srgb, var(--text-faint) 60%, var(--line));
    stroke-width: 1;
  }
  .tick {
    stroke: color-mix(in srgb, var(--text-faint) 70%, var(--line));
    stroke-width: 1;
  }
  .tick-lbl {
    font-size: 8px;
    fill: var(--text-dim);
  }
  .rim {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 55%, var(--line));
    stroke-width: 1.3;
  }
  .rim-back {
    fill: none;
    stroke: color-mix(in srgb, var(--text-faint) 60%, var(--line));
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }
  .side {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 55%, var(--line));
    stroke-width: 1.3;
  }
  .rem-lbl {
    font-size: 11px;
    fill: var(--text-dim);
  }
  .add-rect {
    fill: var(--panel-2);
    stroke: color-mix(in srgb, var(--accent) 50%, var(--line));
    stroke-width: 1;
    stroke-dasharray: 5 4;
  }
  .add-lbl {
    font-size: 13px;
    fill: var(--text);
  }
  .zone-rect {
    stroke: var(--z, var(--line-soft));
    stroke-opacity: 0.6;
    stroke-width: 1;
    transition: fill-opacity 0.12s ease;
  }
  .zone-rect.free {
    stroke: rgba(255, 255, 255, 0.3);
    stroke-dasharray: 4 4;
  }
  .zone-rect.sel {
    stroke: var(--amber, #f4b880);
    stroke-width: 2;
    stroke-opacity: 0.9;
    stroke-dasharray: none;
    fill: #ffffff;
    fill-opacity: 0.16;
  }
  .divider {
    stroke: color-mix(in srgb, var(--text-faint) 55%, var(--line));
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .plate {
    fill: rgba(255, 255, 255, 0.025);
    stroke: color-mix(in srgb, var(--text-faint) 55%, var(--line));
    stroke-width: 1;
  }
  .plate-front {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 45%, var(--line));
    stroke-width: 1.2;
  }
  .plate-line {
    stroke: color-mix(in srgb, var(--text-dim) 45%, var(--line));
    stroke-width: 1.4;
  }
  .zname {
    fill: var(--text);
  }
  .zfrac {
    font-size: 10px;
    letter-spacing: 0.06em;
    fill: var(--text-dim);
  }
  .zid {
    font-size: 10px;
    fill: var(--text);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .zcx {
    font-size: 9px;
    fill: var(--text-dim);
    letter-spacing: 0.02em;
  }
  .dim-br {
    stroke: color-mix(in srgb, var(--text-faint) 75%, var(--line));
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .dim-cm {
    font-size: 10px;
    fill: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .ctrl-c {
    fill: var(--panel-2);
    stroke: var(--line);
    stroke-width: 1;
  }
  .ctrl-i {
    font-size: 12px;
    fill: var(--text-dim);
  }
  .occ {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
</style>
