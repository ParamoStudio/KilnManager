<script lang="ts">
  import {
    planner,
    ui,
    currentKiln,
    toggleSelection,
    isSelected,
    zoneOwner,
    occupiedFraction,
    occupancyBand,
    openShelfEditor,
    removeLevel,
    roomForNewShelf,
    remainingCm,
    clientNames,
    zoneLabel,
  } from "../lib/firing.svelte";
  import { COMPLEXITY } from "../lib/complexity";
  import { colorForIndex } from "../lib/colors";

  const kiln = $derived(currentKiln());
  const names = $derived(clientNames());
  const colorOf = (owner: string): string => colorForIndex(names.indexOf(owner));

  // Geometry (viewBox units)
  const TOPY = 92;
  const BOTY = 566;
  const RY = 26;
  const X0 = 210;
  const X1 = 650;
  const CX = (X0 + X1) / 2;
  const RX = (X1 - X0) / 2;
  // Fixed headroom band below the rim holds the "+ Add shelf" button, so the
  // top shelf never collides with the rim regardless of how full the kiln is.
  const HEADROOM = 96;
  const yTopInner = TOPY + HEADROOM;
  const yBotInner = BOTY;
  const Hpx = yBotInner - yTopInner;

  const pxPerCm = $derived(Hpx / kiln.usableHeightCm);
  const yOfCm = (cm: number): number => yBotInner - cm * pxPerCm;

  // Shelves stack from the floor up; remaining is at the top.
  const rows = $derived.by(() => {
    const arr = planner.levels;
    const res: { id: string; consumed: number; yPlate: number; ySpaceTop: number; div: number }[] =
      new Array(arr.length);
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
  const remaining = $derived(Math.max(0, kiln.usableHeightCm - usedCm));
  const yRemBottom = $derived(yOfCm(usedCm));
  const canAdd = $derived(roomForNewShelf() > 0);

  const ticks = $derived(
    Array.from({ length: Math.floor(kiln.usableHeightCm / 10) + 1 }, (_, i) => i * 10),
  );

  const bandColor: Record<string, string> = {
    low: "var(--blue)",
    balanced: "var(--green)",
    high: "var(--amber)",
  };

  function truncate(name: string, division: number): string {
    const max = Math.max(4, Math.floor(30 / division));
    return name.length > max ? name.slice(0, max - 1) + "…" : name;
  }
</script>

<svg viewBox="0 0 880 640" class="kiln-svg" preserveAspectRatio="xMidYMid meet">
  <defs>
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
      <path d="M1,1 L6,3.5 L1,6" fill="none" stroke="var(--line)" stroke-width="1" />
    </marker>
    <pattern id="rem-hatch" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="9" stroke="var(--line-soft)" stroke-width="0.75" />
    </pattern>
  </defs>

  <!-- Diameter dimension: value centred on the line, with a gap -->
  <text x={CX} y="20" text-anchor="middle" class="lbl">USABLE DIAMETER</text>
  <line x1={X0} y1="40" x2={CX - 52} y2="40" class="dim" marker-start="url(#arrow)" />
  <line x1={CX + 52} y1="40" x2={X1} y2="40" class="dim" marker-end="url(#arrow)" />
  <text x={CX} y="45" text-anchor="middle" class="val">
    {kiln.shape === "cylinder" ? `${kiln.diameterCm} cm Ø` : `${kiln.widthCm} × ${kiln.depthCm} cm`}
  </text>

  <!-- Height ruler -->
  <text x="118" y={yTopInner - 26} text-anchor="end" class="lbl">USABLE H.</text>
  <text x="118" y={yTopInner - 12} text-anchor="end" class="val">{kiln.usableHeightCm} cm</text>
  <line x1="120" y1={yTopInner} x2="120" y2={yBotInner} class="dim-soft" />
  {#each ticks as t (t)}
    <line x1="115" y1={yOfCm(t)} x2="125" y2={yOfCm(t)} class="tick" />
    <text x="108" y={yOfCm(t) + 3.5} text-anchor="end" class="tick-lbl">{t}</text>
  {/each}

  <!-- Kiln body -->
  {#if kiln.shape === "cylinder"}
    <ellipse cx={CX} cy={TOPY} rx={RX} ry={RY} class="rim" />
    <path d="M {X0} {TOPY} L {X0} {BOTY}" class="side" />
    <path d="M {X1} {TOPY} L {X1} {BOTY}" class="side" />
    <path d="M {X0} {BOTY} A {RX} {RY} 0 0 0 {X1} {BOTY}" class="rim rim-bottom" />
    <path d="M {X0} {BOTY} A {RX} {RY} 0 0 1 {X1} {BOTY}" class="rim-back" />
  {:else}
    <rect x={X0} y={TOPY} width={X1 - X0} height={BOTY - TOPY} rx="4" class="side" fill="none" />
  {/if}

  <!-- Remaining space + Add shelf (top) -->
  <!-- Empty height (below the fixed add-shelf band, above the top shelf) -->
  {#if remaining > 0.5}
    <rect x={X0 + 3} y={yTopInner} width={X1 - X0 - 6} height={Math.max(0, yRemBottom - yTopInner)} fill="url(#rem-hatch)" opacity="0.5" />
  {/if}

  <!-- Add shelf: fixed band below the rim, always clear of shelves + lid;
       remaining space shown right under it. -->
  {#if canAdd}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <g class="add" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); openShelfEditor("new", { x: e.clientX, y: e.clientY }); }}>
      <rect x={CX - 86} y={TOPY + 26} width="172" height="40" rx="9" class="add-rect" />
      <text x={CX} y={TOPY + 51} text-anchor="middle" class="add-lbl">+ Add shelf</text>
    </g>
    {#if remaining > 0.5}
      <text x={CX} y={TOPY + 84} text-anchor="middle" class="rem-lbl">({Math.round(remaining)} cm remaining)</text>
    {/if}
  {:else if remaining > 0.5}
    <text x={CX} y={TOPY + 52} text-anchor="middle" class="rem-lbl">{Math.round(remaining)} cm remaining</text>
  {/if}

  <!-- Shelves -->
  {#each rows as row, i (row.id)}
    {@const lvl = planner.levels[i]!}
    {@const colW = (X1 - X0) / row.div}
    {@const occ = occupiedFraction(lvl)}

    <!-- zones (space above the plate) -->
    {#each lvl.segments as seg, k (k)}
      {@const zx = X0 + k * colW}
      {@const owner = seg?.contactName ?? null}
      {@const sel = isSelected(row.id, k)}
      {@const hovered = ui.hoverZone?.levelId === row.id && ui.hoverZone?.segIdx === k}
      {@const bandH = row.yPlate - row.ySpaceTop}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <g
        class="zone"
        role="button"
        tabindex="-1"
        onclick={(e) => { e.stopPropagation(); toggleSelection(row.id, k); }}
        ondblclick={(e) => { e.stopPropagation(); openShelfEditor(row.id, { x: e.clientX, y: e.clientY }); }}
      >
        <rect
          x={zx + 2}
          y={row.ySpaceTop + 2}
          width={colW - 4}
          height={row.yPlate - row.ySpaceTop - 3}
          rx="3"
          fill={owner ? colorOf(owner) : "transparent"}
          fill-opacity={owner ? 0.13 : 0}
          class="zone-rect"
          class:sel
          class:hovered
          class:free={!owner}
          style={owner ? `--z:${colorOf(owner)}` : ""}
        />
        <text x={zx + 8} y={row.ySpaceTop + 17} class="zid">{zoneLabel(row.id, k)}</text>
        {#if k === 0 && bandH > 30}
          <text x={zx + 8} y={row.ySpaceTop + 32} class="zh">{Math.round(row.consumed)} cm</text>
        {/if}
        {#if owner && seg}
          {#if bandH > 40}
            <text x={zx + colW / 2} y={(row.ySpaceTop + row.yPlate) / 2} text-anchor="middle" class="zname">
              {truncate(owner, row.div)}
            </text>
            <text x={zx + colW / 2} y={(row.ySpaceTop + row.yPlate) / 2 + 15} text-anchor="middle" class="zcx">
              {COMPLEXITY[seg.complexity].label}
            </text>
          {:else}
            <!-- short shelf: name + complexity on the top line, clear of overlap -->
            <text x={zx + colW / 2 + 18} y={row.ySpaceTop + 17} text-anchor="middle" class="zname-sm">
              {truncate(owner, row.div)} · {COMPLEXITY[seg.complexity].label}
            </text>
          {/if}
        {:else if bandH > 24}
          <text x={zx + colW / 2} y={(row.ySpaceTop + row.yPlate) / 2 + 4} text-anchor="middle" class="zfrac">
            {row.div === 1 ? "FULL" : `1/${row.div}`}
          </text>
        {/if}
      </g>
      {#if k > 0}
        <line x1={zx} y1={row.ySpaceTop + 3} x2={zx} y2={row.yPlate - 2} class="divider" />
      {/if}
    {/each}

    <!-- shelf plate (perspective) -->
    {#if kiln.shape === "cylinder"}
      <ellipse cx={CX} cy={row.yPlate} rx={RX - 6} ry="9" class="plate" />
      <path d="M {X0 + 6} {row.yPlate} A {RX - 6} 9 0 0 0 {X1 - 6} {row.yPlate}" class="plate-front" />
    {:else}
      <line x1={X0 + 4} y1={row.yPlate} x2={X1 - 4} y2={row.yPlate} class="plate-line" />
    {/if}

    <!-- shelf controls + occupancy, grouped in a soft bordered card -->
    {@const midY = (row.ySpaceTop + row.yPlate) / 2}
    <rect x={X1 + 16} y={midY - 18} width="156" height="36" rx="9" class="occ-card" />
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <g class="ctrl" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); openShelfEditor(row.id, { x: e.clientX, y: e.clientY }); }}>
      <circle cx={X1 + 38} cy={midY} r="13" class="ctrl-c" />
      <text x={X1 + 38} y={midY + 4} text-anchor="middle" class="ctrl-i">✎</text>
    </g>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <g class="ctrl del" role="button" tabindex="-1" onclick={(e) => { e.stopPropagation(); removeLevel(row.id); }}>
      <circle cx={X1 + 70} cy={midY} r="13" class="ctrl-c" />
      <text x={X1 + 70} y={midY + 5} text-anchor="middle" class="ctrl-i">×</text>
    </g>
    <line x1={X1 + 94} y1={midY - 12} x2={X1 + 94} y2={midY + 12} class="occ-sep" />
    <text x={X1 + 134} y={midY + 5} text-anchor="middle" class="occ" style="fill:{bandColor[occupancyBand(occ)]}">
      {Math.round(occ * 100)}%
    </text>
  {/each}

  {#if rows.length > 0}
    <text x={X1 + 134} y={yTopInner - 12} text-anchor="middle" class="lbl">OCCUPANCY</text>
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
    letter-spacing: 0.14em;
    fill: var(--text-faint);
  }
  .val {
    font-size: 15px;
    fill: var(--text);
  }
  .dim {
    stroke: var(--line);
    stroke-width: 1;
  }
  .dim-soft {
    stroke: var(--line-soft);
    stroke-width: 1;
  }
  .tick {
    stroke: var(--line-soft);
    stroke-width: 1;
  }
  .tick-lbl {
    font-size: 9px;
    fill: var(--text-faint);
  }
  .rim {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.25;
  }
  .rim-bottom {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.25;
  }
  .rim-back {
    fill: none;
    stroke: var(--line-soft);
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }
  .side {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.25;
  }
  .rem-lbl {
    font-size: 13px;
    fill: var(--text-dim);
    letter-spacing: 0.02em;
  }
  .add {
    cursor: pointer;
  }
  .add-rect {
    fill: var(--panel-2);
    stroke: color-mix(in srgb, var(--accent) 45%, var(--line));
    stroke-width: 1;
    stroke-dasharray: 5 4;
  }
  .add:hover .add-rect {
    stroke: var(--accent);
    fill: color-mix(in srgb, var(--accent) 8%, var(--panel-2));
  }
  .add-lbl {
    font-size: 15px;
    fill: var(--text);
  }
  .zone {
    cursor: pointer;
  }
  .zone-rect {
    stroke: var(--z, var(--line-soft));
    stroke-opacity: 0.6;
    stroke-width: 1;
    transition: fill-opacity 0.15s ease, stroke-opacity 0.15s ease;
  }
  .zone-rect.free {
    stroke: var(--line-soft);
    stroke-dasharray: 3 4;
  }
  .zone-rect.sel {
    stroke: var(--amber);
    stroke-width: 2;
    stroke-opacity: 0.85;
    stroke-dasharray: none;
    fill: #ffffff;
    fill-opacity: 0.14;
  }
  .zone-rect.hovered {
    stroke: var(--amber);
    stroke-width: 2.5;
    stroke-opacity: 1;
    stroke-dasharray: none;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--amber) 60%, transparent));
  }
  .zone:hover .zone-rect {
    stroke-opacity: 1;
    stroke: var(--text-faint);
  }
  .divider {
    stroke: var(--line-soft);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .plate {
    fill: rgba(255, 255, 255, 0.015);
    stroke: var(--line);
    stroke-width: 1;
  }
  .plate-front {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.25;
  }
  .plate-line {
    stroke: var(--line);
    stroke-width: 1.5;
  }
  .zname {
    font-size: 15px;
    fill: var(--text);
  }
  .zname-sm {
    font-size: 12px;
    fill: var(--text);
  }
  .zfrac {
    font-size: 11px;
    letter-spacing: 0.08em;
    fill: var(--text-faint);
  }
  .zid {
    font-size: 12px;
    fill: var(--text);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .zh {
    font-size: 12px;
    fill: var(--text-dim);
  }
  .ctrl {
    cursor: pointer;
  }
  .ctrl-c {
    fill: var(--panel-2);
    stroke: var(--line);
    stroke-width: 1;
  }
  .ctrl:hover .ctrl-c {
    stroke: var(--text-faint);
  }
  .ctrl.del:hover .ctrl-c {
    stroke: #e88;
  }
  .ctrl-i {
    font-size: 13px;
    fill: var(--text);
  }
  .ctrl:hover .ctrl-i {
    fill: var(--text);
  }
  .ctrl.del:hover .ctrl-i {
    fill: #e88;
  }
  .zcx {
    font-size: 11px;
    fill: var(--text-dim);
    letter-spacing: 0.03em;
  }
  .occ {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .occ-card {
    fill: rgba(255, 255, 255, 0.015);
    stroke: var(--line-soft);
    stroke-width: 1;
  }
  .occ-sep {
    stroke: var(--line-soft);
    stroke-width: 1;
  }
</style>
