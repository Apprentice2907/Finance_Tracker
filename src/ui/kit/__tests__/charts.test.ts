/**
 * Unit tests for D3 chart geometry helpers and kit logic.
 * Imports from chartGeometry.ts and categories.ts —
 * runs safely in Node (ts-jest) environment.
 */

import {
  computeDonutSegments,
  computeBars,
  clampTooltipX,
  mapToPoints,
  computeGaugeSegments,
  polarToCartesian,
  semicircleArcPath,
  STEP1_CHART_PALETTE,
} from '../charts/chartGeometry';
import {
  mapEmojiOrNameToIcon,
  ICON_KEYS,
  DEFAULT_CATEGORIES,
} from '../../../domain/categories';

// ─────────────────────────────────────────────────────────────────────────────
// DonutChart geometry (Section 1.3)
// ─────────────────────────────────────────────────────────────────────────────
describe('computeDonutSegments (Step 1 spec)', () => {
  const segments = [
    { key: 'transport', label: 'Transport', amountPaise: 100000 },
    { key: 'food', label: 'Food', amountPaise: 300000 },
    { key: 'bills', label: 'Bills', amountPaise: 200000 },
  ];
  const size = 200;
  const strokeWidth = 40; // 20% of diameter
  const radius = (size - strokeWidth) / 2; // 80

  test('returns segments sorted largest first', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius, STEP1_CHART_PALETTE, 6);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('food'); // 3000
    expect(result[1].key).toBe('bills'); // 2000
    expect(result[2].key).toBe('transport'); // 1000
  });

  test('percentages sum to exactly 1.0', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius, STEP1_CHART_PALETTE, 6);
    const totalPct = result.reduce((s, r) => s + r.pct, 0);
    expect(totalPct).toBeCloseTo(1, 5);
  });

  test('uses Step 1 segment palette in order', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius, STEP1_CHART_PALETTE, 6);
    expect(result[0].color).toBe(STEP1_CHART_PALETTE[0]); // mint
    expect(result[1].color).toBe(STEP1_CHART_PALETTE[1]); // cyan
    expect(result[2].color).toBe(STEP1_CHART_PALETTE[2]); // white
  });

  test('empty segments returns empty array', () => {
    expect(computeDonutSegments([], strokeWidth, radius)).toEqual([]);
  });

  test('zero total returns empty array', () => {
    expect(
      computeDonutSegments([{ key: 'x', label: 'X', amountPaise: 0 }], strokeWidth, radius),
    ).toEqual([]);
  });

  test('single segment: pct === 1 and dashLen spans full circumference', () => {
    const result = computeDonutSegments(
      [{ key: 'only', label: 'Only', amountPaise: 500000 }],
      strokeWidth,
      radius,
      STEP1_CHART_PALETTE,
      6,
    );
    expect(result).toHaveLength(1);
    expect(result[0].pct).toBeCloseTo(1, 5);
    const circumference = 2 * Math.PI * radius;
    expect(result[0].dashLen).toBeCloseTo(circumference, 1);
  });

  test('rotate values are monotonically increasing clockwise', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius, STEP1_CHART_PALETTE, 6);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].rotate).toBeGreaterThan(result[i - 1].rotate);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BarChart geometry (Section 1.2)
// ─────────────────────────────────────────────────────────────────────────────
describe('computeBars (Step 1 spec)', () => {
  const data = [
    { key: 'w1', label: 'W1', amountPaise: 200000 },
    { key: 'w2', label: 'W2', amountPaise: 500000 },
    { key: 'w3', label: 'W3', amountPaise: 300000 },
    { key: 'w4', label: 'W4', amountPaise: 0 },
    { key: 'w5', label: 'W5', amountPaise: 600000 },
  ];
  const chartWidth = 320;
  const plotHeight = 190;
  const barRadius = 9;

  test('computes equal-width bars with 80% slot and 20% gap', () => {
    const bars = computeBars(data, chartWidth, plotHeight, barRadius, 0.8, 0.9, 6);
    expect(bars).toHaveLength(5);

    const slotWidth = chartWidth / 5; // 64
    const expectedBarW = slotWidth * 0.8; // 51.2
    bars.forEach((b) => {
      expect(b.w).toBeCloseTo(expectedBarW, 4);
    });
  });

  test('tallest bar reaches about 90% of plot height', () => {
    const bars = computeBars(data, chartWidth, plotHeight, barRadius, 0.8, 0.9, 6);
    const maxBar = bars.find((b) => b.key === 'w5')!;
    expect(maxBar.h).toBeCloseTo(plotHeight * 0.9, 1);
  });

  test('zero-value bar shows 6px stub', () => {
    const bars = computeBars(data, chartWidth, plotHeight, barRadius, 0.8, 0.9, 6);
    const zeroBar = bars.find((b) => b.key === 'w4')!;
    expect(zeroBar.h).toBe(6);
  });

  test('bars are ordered left-to-right within chart bounds', () => {
    const bars = computeBars(data, chartWidth, plotHeight, barRadius, 0.8, 0.9, 6);
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i].x).toBeGreaterThan(bars[i - 1].x);
    }
    const lastBar = bars[bars.length - 1];
    expect(lastBar.x + lastBar.w).toBeLessThanOrEqual(chartWidth + 0.1);
  });

  test('empty dataset returns empty array', () => {
    expect(computeBars([], chartWidth, plotHeight)).toHaveLength(0);
  });
});

describe('clampTooltipX (Section 1.2)', () => {
  const cardWidth = 320;
  const tooltipWidth = 76;
  const padding = 12;

  test('clamps left edge to prevent overflow', () => {
    const clamped = clampTooltipX(10, tooltipWidth, cardWidth, padding);
    expect(clamped).toBe(padding + tooltipWidth / 2); // 12 + 38 = 50
  });

  test('clamps right edge to prevent overflow', () => {
    const clamped = clampTooltipX(315, tooltipWidth, cardWidth, padding);
    expect(clamped).toBe(cardWidth - padding - tooltipWidth / 2); // 320 - 12 - 38 = 270
  });

  test('keeps centered X when safely within bounds', () => {
    const clamped = clampTooltipX(160, tooltipWidth, cardWidth, padding);
    expect(clamped).toBe(160);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Category Icon Mapping (Section 1.4)
// ─────────────────────────────────────────────────────────────────────────────
describe('Category Icon Mapping (Section 1.4)', () => {
  test('every default category has an icon in ICON_KEYS', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect((ICON_KEYS as readonly string[]).includes(cat.icon)).toBe(true);
    });
  });

  test('maps known names to line icons', () => {
    expect(mapEmojiOrNameToIcon('Food')).toBe('restaurant-outline');
    expect(mapEmojiOrNameToIcon('Transport')).toBe('car-outline');
    expect(mapEmojiOrNameToIcon('Shopping')).toBe('bag-handle-outline');
    expect(mapEmojiOrNameToIcon('Bills')).toBe('receipt-outline');
    expect(mapEmojiOrNameToIcon('Health')).toBe('heart-outline');
    expect(mapEmojiOrNameToIcon('Fun')).toBe('game-controller-outline');
    expect(mapEmojiOrNameToIcon('Other')).toBe('ellipsis-horizontal');
    expect(mapEmojiOrNameToIcon('Income')).toBe('trending-up-outline');
  });

  test('maps known emojis to line icons', () => {
    expect(mapEmojiOrNameToIcon('🍔')).toBe('restaurant-outline');
    expect(mapEmojiOrNameToIcon('🛺')).toBe('car-outline');
    expect(mapEmojiOrNameToIcon('🛍️')).toBe('bag-handle-outline');
    expect(mapEmojiOrNameToIcon('🧾')).toBe('receipt-outline');
    expect(mapEmojiOrNameToIcon('💊')).toBe('heart-outline');
    expect(mapEmojiOrNameToIcon('🎉')).toBe('game-controller-outline');
    expect(mapEmojiOrNameToIcon('✨')).toBe('ellipsis-horizontal');
    expect(mapEmojiOrNameToIcon('💰')).toBe('trending-up-outline');
  });

  test('returns ellipsis-horizontal default for unknown emoji/name', () => {
    expect(mapEmojiOrNameToIcon('🦄')).toBe('ellipsis-horizontal');
    expect(mapEmojiOrNameToIcon('UnknownNonexistent')).toBe('ellipsis-horizontal');
    expect(mapEmojiOrNameToIcon(null)).toBe('ellipsis-horizontal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CashflowLineChart geometry
// ─────────────────────────────────────────────────────────────────────────────
describe('mapToPoints', () => {
  const W = 320, H = 160, padX = 12, padY = 24;

  const data = [
    { key: 'd1', label: '1', amountPaise: 100000, projected: false },
    { key: 'd2', label: '2', amountPaise: 200000, projected: false },
    { key: 'd3', label: '3', amountPaise: 150000, projected: false },
    { key: 'd4', label: '4', amountPaise: 300000, projected: true },
    { key: 'd5', label: '5', amountPaise: 250000, projected: true },
  ];

  test('returns one point per data item', () => {
    expect(mapToPoints(data, W, H, padX, padY)).toHaveLength(5);
  });

  test('first x is padX and last x is W - padX', () => {
    const pts = mapToPoints(data, W, H, padX, padY);
    expect(pts[0].x).toBeCloseTo(padX, 1);
    expect(pts[pts.length - 1].x).toBeCloseTo(W - padX, 1);
  });

  test('highest amount maps to lowest y (top)', () => {
    const pts = mapToPoints(data, W, H, padX, padY);
    const highest = pts.reduce((a, b) => (a.amountPaise > b.amountPaise ? a : b));
    const lowest = pts.reduce((a, b) => (a.amountPaise < b.amountPaise ? a : b));
    expect(highest.y).toBeLessThan(lowest.y);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SemicircleGauge geometry
// ─────────────────────────────────────────────────────────────────────────────
describe('polarToCartesian & semicircleArcPath', () => {
  test('0 degrees returns leftmost point', () => {
    const pt = polarToCartesian(110, 110, 90, 0);
    expect(pt.x).toBeCloseTo(20, 0);
    expect(pt.y).toBeCloseTo(110, 0);
  });

  test('returns non-empty SVG path string', () => {
    const path = semicircleArcPath(110, 110, 90, 0, 90);
    expect(typeof path).toBe('string');
    expect(path).toContain('A');
  });
});

describe('computeGaugeSegments', () => {
  const segs = [
    { key: 'a', label: 'A', amountPaise: 400000 },
    { key: 'b', label: 'B', amountPaise: 300000 },
    { key: 'c', label: 'C', amountPaise: 300000 },
  ];

  test('returns one result per segment', () => {
    expect(computeGaugeSegments(segs, 110, 110, 90)).toHaveLength(3);
  });
});
