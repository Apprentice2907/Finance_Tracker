import {
  pluralize,
  formatRelativeDate,
  formatChange,
  shouldShowBackupReminder,
} from '../microcopy';

describe('Microcopy & UI Formatters', () => {
  describe('pluralize', () => {
    it('handles singular count 1 correctly', () => {
      expect(pluralize(1, 'transaction', 'transactions')).toBe('1 transaction');
    });

    it('handles plural counts > 1 correctly', () => {
      expect(pluralize(2, 'transaction', 'transactions')).toBe('2 transactions');
      expect(pluralize(10, 'transaction', 'transactions')).toBe('10 transactions');
    });

    it('handles zero count as plural', () => {
      expect(pluralize(0, 'transaction', 'transactions')).toBe('0 transactions');
    });

    it('handles multi-word phrases correctly', () => {
      expect(pluralize(1, 'active spend day', 'active spend days')).toBe('1 active spend day');
      expect(pluralize(5, 'active spend day', 'active spend days')).toBe('5 active spend days');
      expect(pluralize(0, 'active spend day', 'active spend days')).toBe('0 active spend days');
    });

    it('handles negative count', () => {
      expect(pluralize(-1, 'item', 'items')).toBe('-1 item');
      expect(pluralize(-5, 'item', 'items')).toBe('-5 items');
    });
  });

  describe('formatRelativeDate', () => {
    const fixedNow = new Date(2026, 9, 5); // 5 Oct 2026

    it('returns "Today" for current day', () => {
      expect(formatRelativeDate('2026-10-05', fixedNow)).toBe('Today');
    });

    it('returns "Yesterday" for one day before', () => {
      expect(formatRelativeDate('2026-10-04', fixedNow)).toBe('Yesterday');
    });

    it('returns "D MMM" for earlier dates in the same year', () => {
      expect(formatRelativeDate('2026-10-01', fixedNow)).toBe('1 Oct');
      expect(formatRelativeDate('2026-09-15', fixedNow)).toBe('15 Sep');
      expect(formatRelativeDate('2026-01-01', fixedNow)).toBe('1 Jan');
    });

    it('returns "D MMM YYYY" for dates in different years', () => {
      expect(formatRelativeDate('2025-10-05', fixedNow)).toBe('5 Oct 2025');
      expect(formatRelativeDate('2024-02-29', fixedNow)).toBe('29 Feb 2024'); // Leap year
      expect(formatRelativeDate('2027-01-10', fixedNow)).toBe('10 Jan 2027');
    });

    it('handles Date objects as inputs', () => {
      expect(formatRelativeDate(new Date(2026, 9, 5), fixedNow)).toBe('Today');
      expect(formatRelativeDate(new Date(2026, 9, 4), fixedNow)).toBe('Yesterday');
    });

    it('handles empty string gracefully', () => {
      expect(formatRelativeDate('')).toBe('');
    });
  });

  describe('formatChange', () => {
    it('returns null when previous is 0 and current is 0 (hide chip)', () => {
      expect(formatChange(0, 0)).toBeNull();
    });

    it('returns "New" when previous is 0 and current > 0', () => {
      const res = formatChange(1500, 0);
      expect(res).not.toBeNull();
      expect(res?.text).toBe('New');
      expect(res?.isNew).toBe(true);
      expect(res?.isPositive).toBe(true);
    });

    it('calculates positive percent change correctly', () => {
      const res = formatChange(150, 100);
      expect(res).toEqual({ text: '+50%', isPositive: true });
    });

    it('calculates negative percent change correctly', () => {
      const res = formatChange(75, 100);
      expect(res).toEqual({ text: '-25%', isPositive: false });
    });

    it('calculates 0% change correctly', () => {
      const res = formatChange(100, 100);
      expect(res).toEqual({ text: '0%', isPositive: false, isNeutral: true });
    });

    it('handles rounding to nearest whole integer percent', () => {
      const res = formatChange(133, 100);
      expect(res?.text).toBe('+33%');
    });
  });

  describe('shouldShowBackupReminder', () => {
    const fixedNow = new Date('2026-10-15T12:00:00Z');

    it('returns false on fresh install with 0 transactions', () => {
      expect(
        shouldShowBackupReminder({
          transactionCount: 0,
          now: fixedNow,
        })
      ).toBe(false);
    });

    it('returns false when transaction count < 5 even if old', () => {
      expect(
        shouldShowBackupReminder({
          transactionCount: 4,
          firstTransactionDate: '2026-09-01',
          now: fixedNow,
        })
      ).toBe(false);
    });

    it('returns false when transaction count >= 5 but first transaction < 7 days old and never backed up', () => {
      expect(
        shouldShowBackupReminder({
          transactionCount: 5,
          firstTransactionDate: '2026-10-10', // 5 days old
          lastBackupDate: null,
          now: fixedNow,
        })
      ).toBe(false);
    });

    it('returns true when transaction count >= 5, never backed up, and first transaction >= 7 days old', () => {
      expect(
        shouldShowBackupReminder({
          transactionCount: 5,
          firstTransactionDate: '2026-10-08', // exactly 7 days old
          lastBackupDate: null,
          now: fixedNow,
        })
      ).toBe(true);

      expect(
        shouldShowBackupReminder({
          transactionCount: 12,
          firstTransactionDate: '2026-10-01', // 14 days old
          lastBackupDate: null,
          now: fixedNow,
        })
      ).toBe(true);
    });

    it('returns false when backed up recently (<= 14 days ago)', () => {
      expect(
        shouldShowBackupReminder({
          transactionCount: 20,
          firstTransactionDate: '2026-08-01',
          lastBackupDate: '2026-10-05', // 10 days ago
          now: fixedNow,
        })
      ).toBe(false);

      expect(
        shouldShowBackupReminder({
          transactionCount: 20,
          firstTransactionDate: '2026-08-01',
          lastBackupDate: '2026-10-01', // 14 days ago
          now: fixedNow,
        })
      ).toBe(false);
    });

    it('returns true when backed up > 14 days ago and count >= 5', () => {
      expect(
        shouldShowBackupReminder({
          transactionCount: 8,
          firstTransactionDate: '2026-08-01',
          lastBackupDate: '2026-09-30', // 15 days ago
          now: fixedNow,
        })
      ).toBe(true);
    });
  });
});
