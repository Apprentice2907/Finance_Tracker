/**
 * Pure statistical helper functions for Wini latency and benchmark analysis.
 * Where it fits: Used by Voice Lab and Voice Check to calculate median and p95 latencies.
 *
 * Implements WINI_V2_FEATURES.md Section 4.3.
 */

/**
 * Computes the median of an array of numbers.
 * Returns 0 for an empty array.
 */
export function median(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Computes the p-th percentile (0 to 100) of an array of numbers using linear interpolation.
 * Returns 0 for an empty array.
 */
export function percentile(numbers: number[], p: number): number {
  if (!numbers || numbers.length === 0) return 0;
  if (p <= 0) return Math.min(...numbers);
  if (p >= 100) return Math.max(...numbers);

  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 100) / 100;
}
