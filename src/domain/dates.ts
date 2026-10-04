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
