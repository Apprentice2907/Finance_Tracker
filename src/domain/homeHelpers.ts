/**
 * Pure calculation and data-shaping helper functions for the Home Dashboard.
 * Where it fits: Used by app/index.tsx to bucket cashflow data and category breakdowns.
 *
 * Designed per WINI_DESIGN_DECISIONS.md section 1.6 & 1.8.
 */

import { TransactionWithCategory } from './types';
import { chartPalette } from '../ui/tokens';
import { DonutSegment } from '../ui/kit/charts/DonutChart';

export interface BarBucket {
  id: string;
  label: string;
  subLabel?: string;
  amountPaise: number;
  startDate: string;
  endDate: string;
}

export interface HomeTotals {
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
}

export interface DonutLegendData {
  categoryId: string;
  name: string;
  icon?: string;
  color: string;
  amountPaise: number;
  percentage: number;
}

/**
 * Returns number of days in a given month (1-indexed month: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats a year, month, day into YYYY-MM-DD string.
 */
export function formatYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Splits a calendar month into 5 standard week buckets:
 * W1: Days 1 - 7
 * W2: Days 8 - 14
 * W3: Days 15 - 21
 * W4: Days 22 - 28
 * W5: Days 29 - End of Month (if month has > 28 days)
 */
export function getWeeklyBucketsForMonth(
  year: number,
  month: number,
  transactions: TransactionWithCategory[],
  type: 'expense' | 'income' = 'expense'
): BarBucket[] {
  const totalDays = getDaysInMonth(year, month);
  const ranges: { id: string; label: string; startDay: number; endDay: number }[] = [
    { id: 'w1', label: 'W1', startDay: 1, endDay: 7 },
    { id: 'w2', label: 'W2', startDay: 8, endDay: 14 },
    { id: 'w3', label: 'W3', startDay: 15, endDay: 21 },
    { id: 'w4', label: 'W4', startDay: 22, endDay: 28 },
  ];

  if (totalDays > 28) {
    ranges.push({ id: 'w5', label: 'W5', startDay: 29, endDay: totalDays });
  }

  // Pre-filter transactions matching the type and month
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const relevantTxs = transactions.filter(
    (t) => t.type === type && t.occurred_on.startsWith(targetPrefix)
  );

  return ranges.map((r) => {
    const startDate = formatYMD(year, month, r.startDay);
    const endDate = formatYMD(year, month, r.endDay);

    const amountPaise = relevantTxs.reduce((sum, t) => {
      const day = parseInt(t.occurred_on.substring(8, 10), 10);
      if (day >= r.startDay && day <= r.endDay) {
        return sum + t.amount_paise;
      }
      return sum;
    }, 0);

    return {
      id: r.id,
      label: r.label,
      subLabel: `${r.startDay}-${r.endDay}`,
      amountPaise,
      startDate,
      endDate,
    };
  });
}

/**
 * Computes Mon..Sun daily buckets for the week containing refDate (YYYY-MM-DD).
 */
export function getDailyBucketsForWeek(
  refDate: string,
  transactions: TransactionWithCategory[],
  type: 'expense' | 'income' = 'expense'
): BarBucket[] {
  const dateObj = new Date(refDate);
  if (isNaN(dateObj.getTime())) {
    return [];
  }

  // Find Monday of the current week (0 = Sun, 1 = Mon ... 6 = Sat)
  const currentDay = dateObj.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(dateObj);
  monday.setDate(dateObj.getDate() + diffToMonday);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const buckets: BarBucket[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const amountPaise = transactions
      .filter((t) => t.type === type && t.occurred_on === ymd)
      .reduce((sum, t) => sum + t.amount_paise, 0);

    buckets.push({
      id: `day-${i}`,
      label: dayLabels[i],
      subLabel: `${d.getDate()}`,
      amountPaise,
      startDate: ymd,
      endDate: ymd,
    });
  }

  return buckets;
}

/**
 * Computes Income, Expense, and Net Cashflow for a selected month (YYYY-MM).
 */
export function calculateHomeTotals(
  transactions: TransactionWithCategory[],
  yearMonthPrefix: string
): HomeTotals {
  let incomePaise = 0;
  let expensePaise = 0;

  for (const t of transactions) {
    if (t.occurred_on.startsWith(yearMonthPrefix)) {
      if (t.type === 'income') {
        incomePaise += t.amount_paise;
      } else if (t.type === 'expense') {
        expensePaise += t.amount_paise;
      }
    }
  }

  return {
    incomePaise,
    expensePaise,
    netPaise: incomePaise - expensePaise,
  };
}

/**
 * Calculates category breakdown segments for DonutChart and 3-column legend.
 */
export function getDonutBreakdownData(
  transactions: TransactionWithCategory[],
  yearMonthPrefix: string,
  type: 'expense' | 'income' = 'expense'
): {
  segments: DonutSegment[];
  legend: DonutLegendData[];
  totalPaise: number;
} {
  const catMap = new Map<
    string,
    { name: string; icon?: string; color: string; amountPaise: number }
  >();

  let totalPaise = 0;

  for (const t of transactions) {
    if (t.type === type && t.occurred_on.startsWith(yearMonthPrefix)) {
      totalPaise += t.amount_paise;
      const catId = t.category_id || 'other';
      if (!catMap.has(catId)) {
        catMap.set(catId, {
          name: t.category_name || 'Other',
          icon: t.category_icon || 'ellipsis-horizontal',
          color: t.category_color || chartPalette[catMap.size % chartPalette.length],
          amountPaise: 0,
        });
      }
      catMap.get(catId)!.amountPaise += t.amount_paise;
    }
  }

  // Sort descending by amount
  const sorted = Array.from(catMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      ...data,
      percentage: totalPaise > 0 ? (data.amountPaise / totalPaise) * 100 : 0,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  // Assign distinct chartPalette colors to segments
  const segments: DonutSegment[] = sorted.map((item, idx) => ({
    key: item.categoryId,
    amountPaise: item.amountPaise,
    color: chartPalette[idx % chartPalette.length],
    label: item.name,
  }));

  const legend: DonutLegendData[] = sorted.map((item, idx) => ({
    categoryId: item.categoryId,
    name: item.name,
    icon: item.icon,
    color: chartPalette[idx % chartPalette.length],
    amountPaise: item.amountPaise,
    percentage: Math.round(item.percentage),
  }));

  return { segments, legend, totalPaise };
}
