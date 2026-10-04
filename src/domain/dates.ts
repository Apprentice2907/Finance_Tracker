/**
 * Date utilities with strict Asia/Kolkata (IST = UTC+5:30) timezone handling.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns a Date object adjusted to Asia/Kolkata local time.
 */
export function getIndiaDate(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MS);
}

/**
 * Returns the current date in Asia/Kolkata as YYYY-MM-DD.
 */
export function getTodayIndia(now: Date = new Date()): string {
  const ist = getIndiaDate(now);
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a date string YYYY-MM-DD offset by days from now in IST.
 */
export function getRelativeDateIndia(daysOffset: number, now: Date = new Date()): string {
  const ist = getIndiaDate(now);
  ist.setDate(ist.getDate() + daysOffset);
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the first day of the month for a given YYYY-MM-DD string or today.
 */
export function getStartOfMonth(dateStr?: string): string {
  const target = dateStr || getTodayIndia();
  const [year, month] = target.split('-');
  return `${year}-${month}-01`;
}

/**
 * Returns the last day of the month for a given YYYY-MM-DD string or today.
 */
export function getEndOfMonth(dateStr?: string): string {
  const target = dateStr || getTodayIndia();
  const [year, month] = target.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Formats a YYYY-MM-DD date into friendly human representation.
 * (e.g. "Today", "Yesterday", "Sun, 4 Oct")
 */
export function formatDisplayDate(dateStr: string, now: Date = new Date()): string {
  const today = getTodayIndia(now);
  const yesterday = getRelativeDateIndia(-1, now);
  const dayBefore = getRelativeDateIndia(-2, now);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === dayBefore) return 'Day before yesterday';

  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;

  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayOfWeek = days[dateObj.getDay()];
  const monthName = months[dateObj.getMonth()];

  const currentYear = getIndiaDate(now).getFullYear();
  if (year === currentYear) {
    return `${dayOfWeek}, ${day} ${monthName}`;
  }
  return `${day} ${monthName} ${year}`;
}

/**
 * Returns { startDate, endDate } for the previous calendar month in IST.
 */
export function getPreviousMonthRange(dateStr?: string): { startDate: string; endDate: string } {
  const target = dateStr || getTodayIndia();
  const [yearStr, monthStr] = target.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // previous month (1-indexed - 1)
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  const paddedMonth = String(month).padStart(2, '0');
  const startDate = `${year}-${paddedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

/**
 * Returns { startDate, endDate } for the past 7 days including today in IST.
 */
export function getPast7DaysRange(now: Date = new Date()): { startDate: string; endDate: string } {
  const endDate = getTodayIndia(now);
  const startDate = getRelativeDateIndia(-6, now);
  return { startDate, endDate };
}

/**
 * Formats a YYYY-MM-DD string into a 3-letter weekday abbreviation (e.g. "Mon").
 */
export function formatDayShort(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
}

/**
 * Returns an array of YYYY-MM-DD date strings between startDate and endDate inclusive.
 */
export function getDateRangeList(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

