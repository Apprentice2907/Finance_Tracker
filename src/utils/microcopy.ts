/**
 * Microcopy and UI formatting helper functions.
 * Where it fits: Pure functions for clean pluralization, relative date formatting,
 * percentage change calculations, and smart backup reminder triggers.
 */

import { getIndiaDate } from '../domain/dates';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Returns a cleanly formatted string with singular or plural form.
 * e.g. pluralize(1, 'transaction', 'transactions') -> "1 transaction"
 * e.g. pluralize(5, 'active spend day', 'active spend days') -> "5 active spend days"
 */
export function pluralize(count: number, singular: string, plural: string): string {
  const label = Math.abs(count) === 1 ? singular : plural;
  return `${count} ${label}`;
}

/**
 * Parses date input (string or Date) into year, month, day components in IST.
 */
function parseDateParts(d: string | Date): { year: number; month: number; day: number; timestamp: number } {
  if (typeof d === 'string') {
    // If YYYY-MM-DD or ISO string
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return {
        year,
        month,
        day,
        timestamp: new Date(year, month, day).getTime(),
      };
    }
    const parsed = new Date(d);
    const ist = getIndiaDate(parsed);
    return {
      year: ist.getFullYear(),
      month: ist.getMonth(),
      day: ist.getDate(),
      timestamp: new Date(ist.getFullYear(), ist.getMonth(), ist.getDate()).getTime(),
    };
  }
  const ist = getIndiaDate(d);
  return {
    year: ist.getFullYear(),
    month: ist.getMonth(),
    day: ist.getDate(),
    timestamp: new Date(ist.getFullYear(), ist.getMonth(), ist.getDate()).getTime(),
  };
}

/**
 * Formats a date into a human-friendly relative string.
 * Output: "Today", "Yesterday", "5 Oct", or "5 Oct 2025" (year only if different from current year).
 */
export function formatRelativeDate(date: string | Date, now: string | Date = new Date()): string {
  if (!date) return '';

  const target = parseDateParts(date);
  const current = parseDateParts(now);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((current.timestamp - target.timestamp) / MS_PER_DAY);

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }

  const monthStr = MONTH_NAMES[target.month];
  if (target.year === current.year) {
    return `${target.day} ${monthStr}`;
  }
  return `${target.day} ${monthStr} ${target.year}`;
}

export interface FormattedChange {
  text: string;
  isPositive: boolean;
  isNeutral?: boolean;
  isNew?: boolean;
}

/**
 * Formats change between current and previous period amounts.
 * If previous is 0: returns null when current is 0, or "New" when current > 0.
 * If previous > 0: returns signed percentage (e.g. "+15%", "-8%", "0%").
 */
export function formatChange(current: number, previous: number): FormattedChange | null {
  if (previous <= 0) {
    if (current <= 0) {
      return null;
    }
    return {
      text: 'New',
      isPositive: true,
      isNew: true,
    };
  }

  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent > 0) {
    return {
      text: `+${percent}%`,
      isPositive: true,
    };
  }
  if (percent < 0) {
    return {
      text: `${percent}%`,
      isPositive: false,
    };
  }
  return {
    text: '0%',
    isPositive: false,
    isNeutral: true,
  };
}

export interface BackupReminderState {
  transactionCount: number;
  firstTransactionDate?: string | null;
  lastBackupDate?: string | null;
  now?: Date | string;
}

/**
 * Determines whether to show the backup reminder.
 * True ONLY if:
 * - There are at least 5 transactions, AND
 * - (Never backed up AND first transaction at least 7 days old) OR
 * - (Last backup older than 14 days).
 */
export function shouldShowBackupReminder(state: BackupReminderState): boolean {
  if (!state || state.transactionCount < 5) {
    return false;
  }

  const nowParts = parseDateParts(state.now || new Date());
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  if (!state.lastBackupDate) {
    if (!state.firstTransactionDate) {
      return false;
    }
    const firstParts = parseDateParts(state.firstTransactionDate);
    const ageDays = (nowParts.timestamp - firstParts.timestamp) / MS_PER_DAY;
    return ageDays >= 7;
  }

  const lastBackupParts = parseDateParts(state.lastBackupDate);
  const daysSinceBackup = (nowParts.timestamp - lastBackupParts.timestamp) / MS_PER_DAY;
  return daysSinceBackup > 14;
}
