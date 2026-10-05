/**
 * Pure geometry helpers for chart calculations.
 * No React/RN imports — safe to run in a Node test environment.
 */

// ─── DonutChart ──────────────────────────────────────────────────────────────

export interface DonutSegmentInput {
  key: string;
  label: string;
  amountPaise: number;
  color?: string;
}

export function computeDonutSegments(
  segments: DonutSegmentInput[],
  strokeWidth: number,
  radius: number,
  defaultColors: string[] = [],
) {
  const total = segments.reduce((s, seg) => s + seg.amountPaise, 0);
  if (total === 0) return [];

  const circumference = 2 * Math.PI * radius;
  const gapDeg = 3;
  const totalGapDeg = gapDeg * segments.length;
  const availableDeg = 360 - totalGapDeg;

  let cumulativeDeg = -90;

  return segments.map((seg, i) => {
    const pct = seg.amountPaise / total;
    const arcDeg = pct * availableDeg;
    const startDeg = cumulativeDeg + (i === 0 ? 0 : gapDeg / 2);
    const endDeg = startDeg + arcDeg;

    const arcFrac = arcDeg / 360;
    const dashLen = arcFrac * circumference;
    const gapLen = circumference - dashLen;
    const rotate = startDeg + 90;

    cumulativeDeg = endDeg + gapDeg / 2;

    const color = seg.color || defaultColors[i % Math.max(defaultColors.length, 1)] || 'gray';

    return { key: seg.key, label: seg.label, amountPaise: seg.amountPaise, color, dashLen, gapLen, rotate, pct };
  });
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

export interface BarDataPointInput {
  key: string;
  label: string;
  amountPaise: number;
}

export function computeBars(
  data: BarDataPointInput[],
  chartWidth: number,
  chartHeight: number,
  barRadius: number,
  gap: number,
) {
  if (data.length === 0) return [];
  const maxVal = Math.max(...data.map((d) => d.amountPaise), 1);
  const totalBars = data.length;
  const barW = (chartWidth - gap * (totalBars + 1)) / totalBars;

  return data.map((d, i) => {
    const barH = Math.max(barRadius * 2, (d.amountPaise / maxVal) * chartHeight);
    const x = gap + i * (barW + gap);
    const y = chartHeight - barH;
    return { ...d, x, y, w: barW, h: barH, index: i };
  });
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
