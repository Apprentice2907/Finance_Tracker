/**
 * Unit tests for D3 chart geometry helpers.
 * Imports from chartGeometry.ts which has NO React/RN dependencies —
 * runs safely in Node (ts-jest) environment.
 */

import {
  computeDonutSegments,
  computeBars,
  mapToPoints,
  computeGaugeSegments,
  polarToCartesian,
  semicircleArcPath,
} from '../charts/chartGeometry';

// ─────────────────────────────────────────────────────────────────────────────
// DonutChart geometry
// ─────────────────────────────────────────────────────────────────────────────
describe('computeDonutSegments', () => {
  const segments = [
    { key: 'food', label: 'Food', amountPaise: 300000 },
    { key: 'transport', label: 'Transport', amountPaise: 100000 },
    { key: 'bills', label: 'Bills', amountPaise: 100000 },
  ];
  const strokeWidth = 18;
  const radius = 82;

  test('returns one entry per segment', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius);
    expect(result).toHaveLength(3);
  });

  test('percentages sum to approximately 1', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius);
    const totalPct = result.reduce((s, r) => s + r.pct, 0);
    expect(totalPct).toBeCloseTo(1, 5);
  });

  test('largest segment has largest dashLen', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius);
    const largest = result.reduce((a, b) => (a.dashLen > b.dashLen ? a : b));
    expect(largest.key).toBe('food');
  });

  test('empty segments returns empty array', () => {
    expect(computeDonutSegments([], strokeWidth, radius)).toEqual([]);
  });

  test('zero total returns empty array', () => {
    expect(
      computeDonutSegments([{ key: 'x', label: 'X', amountPaise: 0 }], strokeWidth, radius),
    ).toEqual([]);
  });

  test('single segment: pct === 1', () => {
    const result = computeDonutSegments(
      [{ key: 'only', label: 'Only', amountPaise: 500000 }],
      strokeWidth,
      radius,
    );
    expect(result).toHaveLength(1);
    expect(result[0].pct).toBeCloseTo(1, 5);
  });

  test('rotate values are monotonically increasing', () => {
    const result = computeDonutSegments(segments, strokeWidth, radius);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].rotate).toBeGreaterThan(result[i - 1].rotate);
    }
  });

  test('12-month dataset has correct length', () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      key: `m${i}`,
      label: `Month ${i + 1}`,
      amountPaise: (i + 1) * 50000,
    }));
    expect(computeDonutSegments(monthly, strokeWidth, radius)).toHaveLength(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BarChart geometry
// ─────────────────────────────────────────────────────────────────────────────
describe('computeBars', () => {
  const data = [
    { key: 'mon', label: 'Mon', amountPaise: 200000 },
    { key: 'tue', label: 'Tue', amountPaise: 500000 },
    { key: 'wed', label: 'Wed', amountPaise: 300000 },
    { key: 'thu', label: 'Thu', amountPaise: 100000 },
    { key: 'fri', label: 'Fri', amountPaise: 450000 },
    { key: 'sat', label: 'Sat', amountPaise: 600000 },
    { key: 'sun', label: 'Sun', amountPaise: 150000 },
  ];
  const W = 320, H = 140, barRadius = 6, gap = 8;

  test('returns one bar per data point', () => {
    expect(computeBars(data, W, H, barRadius, gap)).toHaveLength(7);
  });

  test('tallest bar corresponds to highest amount', () => {
    const bars = computeBars(data, W, H, barRadius, gap);
    const tallest = bars.reduce((a, b) => (a.h > b.h ? a : b));
    expect(tallest.key).toBe('sat');
  });

  test('bars are sorted left-to-right', () => {
    const bars = computeBars(data, W, H, barRadius, gap);
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i].x).toBeGreaterThan(bars[i - 1].x);
    }
  });

  test('empty dataset returns empty array', () => {
    expect(computeBars([], W, H, barRadius, gap)).toHaveLength(0);
  });

  test('single bar fills chart height', () => {
    const bars = computeBars([{ key: 'x', label: 'X', amountPaise: 100000 }], W, H, barRadius, gap);
    expect(bars[0].h).toBeCloseTo(H, 0);
  });

  test('zero amount bar has minimum height >= 2 * barRadius', () => {
    const bars = computeBars(
      [{ key: 'a', label: 'A', amountPaise: 100000 }, { key: 'b', label: 'B', amountPaise: 0 }],
      W, H, barRadius, gap,
    );
    expect(bars[1].h).toBeGreaterThanOrEqual(barRadius * 2);
  });

  test('12 bars fit within chart width', () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      key: `m${i}`, label: `M${i + 1}`, amountPaise: (i + 1) * 50000,
    }));
    const bars = computeBars(monthly, W, H, barRadius, gap);
    const rightmost = bars[bars.length - 1];
    expect(rightmost.x + rightmost.w).toBeLessThanOrEqual(W + 1);
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

  test('projected flag is preserved', () => {
    const pts = mapToPoints(data, W, H, padX, padY);
    expect(pts[0].projected).toBe(false);
    expect(pts[3].projected).toBe(true);
  });

  test('empty dataset returns empty array', () => {
    expect(mapToPoints([], W, H, padX, padY)).toHaveLength(0);
  });

  test('single point placed at padX', () => {
    const pts = mapToPoints(
      [{ key: 'x', label: 'X', amountPaise: 100000, projected: false }],
      W, H, padX, padY,
    );
    expect(pts[0].x).toBeCloseTo(padX, 1);
  });

  test('12 monthly points: x is monotonically increasing', () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      key: `m${i}`, label: `M${i + 1}`, amountPaise: (i + 1) * 50000, projected: i >= 10,
    }));
    const pts = mapToPoints(monthly, W, H, padX, padY);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SemicircleGauge geometry
// ─────────────────────────────────────────────────────────────────────────────
describe('polarToCartesian', () => {
  test('0 degrees returns leftmost point', () => {
    const pt = polarToCartesian(110, 110, 90, 0);
    expect(pt.x).toBeCloseTo(20, 0);
    expect(pt.y).toBeCloseTo(110, 0);
  });

  test('180 degrees returns rightmost point', () => {
    const pt = polarToCartesian(110, 110, 90, 180);
    expect(pt.x).toBeCloseTo(200, 0);
    expect(pt.y).toBeCloseTo(110, 0);
  });
});

describe('semicircleArcPath', () => {
  test('returns non-empty SVG path string', () => {
    const path = semicircleArcPath(110, 110, 90, 0, 90);
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
    expect(path).toContain('A');
  });

  test('arc > 180 deg has largeArc=1', () => {
    const path = semicircleArcPath(110, 110, 90, 0, 181);
    expect(path).toContain(' 1 1 ');
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

  test('percentages sum to approximately 1', () => {
    const result = computeGaugeSegments(segs, 110, 110, 90);
    const sum = result.reduce((s, r) => s + r.pct, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  test('each segment has a non-empty path', () => {
    computeGaugeSegments(segs, 110, 110, 90).forEach((r) => {
      expect(r.path.length).toBeGreaterThan(0);
    });
  });

  test('empty segments returns empty array', () => {
    expect(computeGaugeSegments([], 110, 110, 90)).toEqual([]);
  });

  test('zero total returns empty array', () => {
    expect(
      computeGaugeSegments([{ key: 'x', label: 'X', amountPaise: 0 }], 110, 110, 90),
    ).toEqual([]);
  });
});
