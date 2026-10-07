import { median, percentile } from '../stats';

describe('Statistical Helpers', () => {
  describe('median', () => {
    it('returns 0 for an empty array or undefined input', () => {
      expect(median([])).toBe(0);
      expect(median(undefined as any)).toBe(0);
    });

    it('returns single element for 1-element array', () => {
      expect(median([42])).toBe(42);
    });

    it('returns middle element for odd length array', () => {
      expect(median([3, 1, 2])).toBe(2);
      expect(median([10, 50, 20, 40, 30])).toBe(30);
    });

    it('returns mean of two middle elements for even length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([10, 40, 20, 30])).toBe(25);
    });

    it('handles arrays with negative numbers and floats', () => {
      expect(median([-10, -5, 0, 5, 10])).toBe(0);
      expect(median([1.5, 2.5, 3.5])).toBe(2.5);
    });
  });

  describe('percentile', () => {
    it('returns 0 for empty array', () => {
      expect(percentile([], 95)).toBe(0);
      expect(percentile(null as any, 95)).toBe(0);
    });

    it('returns min for p <= 0', () => {
      expect(percentile([10, 20, 30, 40, 50], 0)).toBe(10);
      expect(percentile([10, 20, 30, 40, 50], -5)).toBe(10);
    });

    it('returns max for p >= 100', () => {
      expect(percentile([10, 20, 30, 40, 50], 100)).toBe(50);
      expect(percentile([10, 20, 30, 40, 50], 105)).toBe(50);
    });

    it('returns 50th percentile as median', () => {
      const data = [10, 20, 30, 40, 50];
      expect(percentile(data, 50)).toBe(30);
    });

    it('calculates 95th percentile accurately', () => {
      // 100 items from 1 to 100
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      // 95th percentile of 1..100 with index 0.95 * 99 = 94.05
      // 95 * 0.95 + 96 * 0.05 = 95.05
      expect(percentile(data, 95)).toBeCloseTo(95.05, 1);
    });

    it('handles small datasets correctly', () => {
      const data = [100, 200];
      expect(percentile(data, 50)).toBe(150);
      expect(percentile(data, 25)).toBe(125);
      expect(percentile(data, 75)).toBe(175);
    });
  });
});
