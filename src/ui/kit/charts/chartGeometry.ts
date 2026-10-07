/**
 * Pure geometry helpers for chart calculations.
 * No React/RN imports — safe to run in a Node test environment.
 *
 * Implements WINI_DESIGN_DECISIONS.md Sections 1.2 & 1.3:
 * - Bar chart: 80% bar slot ratio, 20% gap ratio, 9px radius, 190px plot height, 90% max bar height, 6px stub, clamped tooltip.
 * - Donut chart: 20% thickness, 6° gap, rounded caps, clockwise from 12 o'clock, 9-colour palette.
 */

import { chartPalette } from '../../tokens';

// ─── DonutChart ──────────────────────────────────────────────────────────────

export interface DonutSegmentInput {
  key: string;
  label: string;
  amountPaise: number;
  color?: string;
}

export interface ComputedDonutSegment {
  key: string;
  label: string;
  amountPaise: number;
  color: string;
  dashLen: number;
  gapLen: number;
  rotate: number;
  pct: number;
}

export const STEP1_CHART_PALETTE: string[] = chartPalette;



export function computeDonutSegments(
  segments: DonutSegmentInput[],
  strokeWidth: number,
  radius: number,
  palette: string[] = STEP1_CHART_PALETTE,
  gapDeg: number = 6,
): ComputedDonutSegment[] {
  const total = segments.reduce((s, seg) => s + seg.amountPaise, 0);
  if (total === 0 || segments.length === 0) return [];

  // Filter out 0 amounts and sort descending by amount (largest first per 1.3)
  const nonZero = segments
    .filter((s) => s.amountPaise > 0)
    .sort((a, b) => b.amountPaise - a.amountPaise);

  if (nonZero.length === 0) return [];

  const circumference = 2 * Math.PI * radius;
  const numSegments = nonZero.length;
  // If only 1 segment, no gap needed; otherwise gapDeg per segment
  const actualGapDeg = numSegments > 1 ? gapDeg : 0;
  const totalGapDeg = actualGapDeg * numSegments;
  const availableDeg = Math.max(360 - totalGapDeg, 0);

  // Clockwise starting at 12 o'clock (-90 degrees in standard polar coords)
  let cumulativeDeg = -90;

  return nonZero.map((seg, i) => {
    const pct = seg.amountPaise / total;
    const arcDeg = (seg.amountPaise / total) * availableDeg;
    const startDeg = cumulativeDeg;
    const endDeg = startDeg + arcDeg;

    const arcFrac = arcDeg / 360;
    const dashLen = arcFrac * circumference;
    const gapLen = Math.max(circumference - dashLen, 0);
    const rotate = startDeg + 90; // offset for SVG coordinate rotation

    cumulativeDeg = endDeg + actualGapDeg;

    const color = seg.color || palette[i % Math.max(palette.length, 1)];

    return {
      key: seg.key,
      label: seg.label,
      amountPaise: seg.amountPaise,
      color,
      dashLen,
      gapLen,
      rotate,
      pct,
    };
  });
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

export interface BarDataPointInput {
  key: string;
  label: string;
  amountPaise: number;
}

export interface ComputedBar {
  key: string;
  label: string;
  amountPaise: number;
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
}

/**
 * Computes bar slot positions and heights according to Section 1.2:
 * - 80% bar width, 20% gap (slot = width / N, bar = 0.8 * slot, gap = 0.2 * slot)
 * - Corner radius 9px on top and bottom
 * - Max bar reaches 90% of chart plot height
 * - 0-value bars show a 6px stub
 */
export function computeBars(
  data: BarDataPointInput[],
  chartWidth: number,
  plotHeight: number = 190,
  barRadius: number = 9,
  barWidthRatio: number = 0.8,
  maxBarHeightRatio: number = 0.9,
  zeroStubHeight: number = 6,
): ComputedBar[] {
  if (data.length === 0) return [];

  const maxVal = Math.max(...data.map((d) => d.amountPaise), 1);
  const n = data.length;
  const slotWidth = chartWidth / n;
  const barW = slotWidth * barWidthRatio;
  const slotMargin = (slotWidth - barW) / 2;

  const maxDrawableHeight = plotHeight * maxBarHeightRatio;

  return data.map((d, i) => {
    let barH: number;
    if (d.amountPaise === 0) {
      barH = zeroStubHeight;
    } else {
      const scaled = (d.amountPaise / maxVal) * maxDrawableHeight;
      barH = Math.max(barRadius * 2, scaled);
    }

    const x = i * slotWidth + slotMargin;
    const y = plotHeight - barH;

    return {
      key: d.key,
      label: d.label,
      amountPaise: d.amountPaise,
      x,
      y,
      w: barW,
      h: barH,
      index: i,
    };
  });
}

/**
 * Clamps tooltip X position so it never overflows the card padding.
 * @param barCenterX center X of the selected bar
 * @param tooltipWidth width of tooltip box (default ~70px)
 * @param cardWidth total card width
 * @param cardPadding horizontal padding (default 12px)
 */
export function clampTooltipX(
  barCenterX: number,
  tooltipWidth: number = 70,
  cardWidth: number = 320,
  cardPadding: number = 12,
): number {
  const half = tooltipWidth / 2;
  const minX = cardPadding + half;
  const maxX = cardWidth - cardPadding - half;
  return Math.min(Math.max(barCenterX, minX), maxX);
}

// ─── CashflowLineChart ───────────────────────────────────────────────────────

export interface LineDataPointInput {
  key: string;
  label: string;
  amountPaise: number;
  projected?: boolean;
}

export function mapToPoints(
  data: LineDataPointInput[],
  w: number,
  h: number,
  padX: number,
  padY: number,
) {
  if (data.length === 0) return [];
  const vals = data.map((d) => d.amountPaise);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  return data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (w - padX * 2);
    const y = padY + (1 - (d.amountPaise - minV) / range) * (h - padY * 2);
    return { x, y, projected: !!d.projected, label: d.label, amountPaise: d.amountPaise };
  });
}

// ─── SemicircleGauge ─────────────────────────────────────────────────────────

export interface GaugeSegmentInput {
  key: string;
  label: string;
  amountPaise: number;
  color?: string;
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function semicircleArcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function computeGaugeSegments(
  segments: GaugeSegmentInput[],
  cx: number,
  cy: number,
  r: number,
  defaultColors: string[] = [],
) {
  const total = segments.reduce((s, seg) => s + seg.amountPaise, 0);
  if (total === 0) return [];

  const gapDeg = 4;
  const availableDeg = 180 - gapDeg * (segments.length - 1);

  let cumDeg = 0;

  return segments.map((seg, i) => {
    const pct = seg.amountPaise / total;
    const arcDeg = pct * availableDeg;
    const startDeg = cumDeg + (i > 0 ? gapDeg : 0);
    const endDeg = startDeg + arcDeg;
    cumDeg = endDeg;

    const color = seg.color || defaultColors[i % Math.max(defaultColors.length, 1)] || 'gray';
    const path = semicircleArcPath(cx, cy, r, startDeg, endDeg);

    return { key: seg.key, label: seg.label, amountPaise: seg.amountPaise, color, path, pct };
  });
}
