import {
  getDaysInMonth,
  getWeeklyBucketsForMonth,
  getDailyBucketsForWeek,
  calculateHomeTotals,
  getDonutBreakdownData,
} from '../homeHelpers';
import { TransactionWithCategory } from '../types';

function createMockTx(overrides: Partial<TransactionWithCategory>): TransactionWithCategory {
  return {
    id: 'tx-default',
    type: 'expense',
    amount_paise: 1000,
    category_id: 'cat-default',
    category_name: 'General',
    category_icon: 'ellipsis-horizontal',
    category_color: '#8E8E93',
    note: '',
    occurred_on: '2026-10-01',
    source: 'typed',
    raw_text: null,
    device_id: 'test',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('Home Helpers: Pure Functions', () => {
  describe('getDaysInMonth & Leap Year Handling', () => {
    it('returns 31 for October', () => {
      expect(getDaysInMonth(2026, 10)).toBe(31);
    });

    it('returns 30 for April, June, September, November', () => {
      expect(getDaysInMonth(2026, 4)).toBe(30);
      expect(getDaysInMonth(2026, 6)).toBe(30);
      expect(getDaysInMonth(2026, 9)).toBe(30);
      expect(getDaysInMonth(2026, 11)).toBe(30);
    });

    it('returns 28 for February in non-leap year (2025, 2026, 2027)', () => {
      expect(getDaysInMonth(2025, 2)).toBe(28);
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(getDaysInMonth(2027, 2)).toBe(28);
    });

    it('returns 29 for February in leap year (2024, 2028)', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2028, 2)).toBe(29);
    });
  });

  describe('getWeeklyBucketsForMonth', () => {
    const mockTxs: TransactionWithCategory[] = [
      createMockTx({
        id: 'tx-1',
        type: 'expense',
        amount_paise: 5000,
        category_id: 'cat-food',
        category_name: 'Food',
        category_icon: 'restaurant-outline',
        note: 'Lunch',
        occurred_on: '2026-10-02',
        source: 'typed',
      }),
      createMockTx({
        id: 'tx-2',
        type: 'expense',
        amount_paise: 12000,
        category_id: 'cat-food',
        category_name: 'Food',
        category_icon: 'restaurant-outline',
        note: 'Dinner',
        occurred_on: '2026-10-10',
        source: 'voice',
      }),
      createMockTx({
        id: 'tx-3',
        type: 'expense',
        amount_paise: 30000,
        category_id: 'cat-bills',
        category_name: 'Bills',
        category_icon: 'receipt-outline',
        note: 'Electricity',
        occurred_on: '2026-10-20',
        source: 'typed',
      }),
      createMockTx({
        id: 'tx-4',
        type: 'expense',
        amount_paise: 15000,
        category_id: 'cat-transport',
        category_name: 'Transport',
        category_icon: 'car-outline',
        note: 'Cab',
        occurred_on: '2026-10-25',
        source: 'voice',
      }),
      createMockTx({
        id: 'tx-5',
        type: 'expense',
        amount_paise: 8000,
        category_id: 'cat-food',
        category_name: 'Food',
        category_icon: 'restaurant-outline',
        note: 'Groceries',
        occurred_on: '2026-10-31',
        source: 'voice',
      }),
      createMockTx({
        id: 'tx-income-1',
        type: 'income',
        amount_paise: 500000,
        category_id: 'cat-salary',
        category_name: 'Salary',
        category_icon: 'cash-outline',
        note: 'Salary credit',
        occurred_on: '2026-10-01',
        source: 'typed',
      }),
    ];

    it('returns 5 buckets for a 31-day month with accurate amounts', () => {
      const buckets = getWeeklyBucketsForMonth(2026, 10, mockTxs, 'expense');
      expect(buckets).toHaveLength(5);
      expect(buckets[0].label).toBe('W1');
      expect(buckets[0].amountPaise).toBe(5000);
      expect(buckets[1].label).toBe('W2');
      expect(buckets[1].amountPaise).toBe(12000);
      expect(buckets[2].label).toBe('W3');
      expect(buckets[2].amountPaise).toBe(30000);
      expect(buckets[3].label).toBe('W4');
      expect(buckets[3].amountPaise).toBe(15000);
      expect(buckets[4].label).toBe('W5');
      expect(buckets[4].amountPaise).toBe(8000);
    });

    it('returns 4 buckets for a 28-day non-leap February', () => {
      const buckets = getWeeklyBucketsForMonth(2026, 2, [], 'expense');
      expect(buckets).toHaveLength(4);
      expect(buckets[3].endDate).toBe('2026-02-28');
    });

    it('returns 5 buckets for a 29-day leap February', () => {
      const buckets = getWeeklyBucketsForMonth(2024, 2, [], 'expense');
      expect(buckets).toHaveLength(5);
      expect(buckets[4].startDate).toBe('2024-02-29');
      expect(buckets[4].endDate).toBe('2024-02-29');
    });

    it('filters income correctly when type is income', () => {
      const buckets = getWeeklyBucketsForMonth(2026, 10, mockTxs, 'income');
      expect(buckets[0].amountPaise).toBe(500000);
      expect(buckets[1].amountPaise).toBe(0);
      expect(buckets[2].amountPaise).toBe(0);
    });

    it('handles empty transactions gracefully (zero buckets)', () => {
      const buckets = getWeeklyBucketsForMonth(2026, 10, [], 'expense');
      expect(buckets).toHaveLength(5);
      buckets.forEach((b) => expect(b.amountPaise).toBe(0));
    });
  });

  describe('getDailyBucketsForWeek', () => {
    const mockTxs: TransactionWithCategory[] = [
      createMockTx({
        id: 'tx-1',
        type: 'expense',
        amount_paise: 2500,
        category_id: 'cat-food',
        note: 'Coffee',
        occurred_on: '2026-10-07', // Wednesday
        source: 'typed',
      }),
    ];

    it('returns 7 daily buckets from Monday to Sunday', () => {
      const buckets = getDailyBucketsForWeek('2026-10-07', mockTxs, 'expense');
      expect(buckets).toHaveLength(7);
      expect(buckets[0].label).toBe('Mon');
      expect(buckets[2].label).toBe('Wed');
      expect(buckets[2].amountPaise).toBe(2500);
      expect(buckets[6].label).toBe('Sun');
    });

    it('returns empty array for invalid date', () => {
      expect(getDailyBucketsForWeek('invalid-date', mockTxs)).toEqual([]);
    });
  });

  describe('calculateHomeTotals', () => {
    const txs: TransactionWithCategory[] = [
      createMockTx({
        id: '1',
        type: 'income',
        amount_paise: 100000,
        category_id: 'c1',
        note: '',
        occurred_on: '2026-10-05',
        source: 'typed',
      }),
      createMockTx({
        id: '2',
        type: 'expense',
        amount_paise: 40000,
        category_id: 'c2',
        note: '',
        occurred_on: '2026-10-12',
        source: 'typed',
      }),
      createMockTx({
        id: '3',
        type: 'expense',
        amount_paise: 10000,
        category_id: 'c2',
        note: '',
        occurred_on: '2026-09-30', // outside month
        source: 'typed',
      }),
    ];

    it('calculates totals only for the given month', () => {
      const totals = calculateHomeTotals(txs, '2026-10');
      expect(totals.incomePaise).toBe(100000);
      expect(totals.expensePaise).toBe(40000);
      expect(totals.netPaise).toBe(60000);
    });

    it('handles zero transactions gracefully', () => {
      const totals = calculateHomeTotals([], '2026-10');
      expect(totals.incomePaise).toBe(0);
      expect(totals.expensePaise).toBe(0);
      expect(totals.netPaise).toBe(0);
    });
  });

  describe('getDonutBreakdownData', () => {
    const txs: TransactionWithCategory[] = [
      createMockTx({
        id: '1',
        type: 'expense',
        amount_paise: 6000,
        category_id: 'c1',
        category_name: 'Food',
        category_icon: 'restaurant-outline',
        note: '',
        occurred_on: '2026-10-01',
        source: 'typed',
      }),
      createMockTx({
        id: '2',
        type: 'expense',
        amount_paise: 4000,
        category_id: 'c2',
        category_name: 'Transport',
        category_icon: 'car-outline',
        note: '',
        occurred_on: '2026-10-02',
        source: 'typed',
      }),
    ];

    it('computes sorted segments, legend, and percentages correctly', () => {
      const res = getDonutBreakdownData(txs, '2026-10', 'expense');
      expect(res.totalPaise).toBe(10000);
      expect(res.segments).toHaveLength(2);
      expect(res.segments[0].key).toBe('c1');
      expect(res.segments[0].amountPaise).toBe(6000);
      expect(res.segments[1].key).toBe('c2');
      expect(res.segments[1].amountPaise).toBe(4000);

      expect(res.legend[0].percentage).toBe(60);
      expect(res.legend[1].percentage).toBe(40);
    });

    it('handles zero transactions without NaN', () => {
      const res = getDonutBreakdownData([], '2026-10', 'expense');
      expect(res.totalPaise).toBe(0);
      expect(res.segments).toEqual([]);
      expect(res.legend).toEqual([]);
    });
  });
});
