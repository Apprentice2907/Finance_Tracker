import { getIndiaDate, getTodayIndia, getRelativeDateIndia } from '../domain/dates';

export interface ExtractedDate {
  date: string; // YYYY-MM-DD
  matchedPhrase: string;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Extracts relative date from voice/text input with Asia/Kolkata timezone support.
 */
export function extractDateFromUtterance(text: string, now: Date = new Date()): ExtractedDate {
  const lower = text.toLowerCase();

  // 1. "day before yesterday" or "parso"
  if (lower.includes('day before yesterday')) {
    return {
      date: getRelativeDateIndia(-2, now),
      matchedPhrase: 'day before yesterday',
    };
  }
  if (/\bparso\b/.test(lower)) {
    return {
      date: getRelativeDateIndia(-2, now),
      matchedPhrase: 'parso',
    };
  }

  // 2. "last night"
  if (lower.includes('last night')) {
    return {
      date: getRelativeDateIndia(-1, now),
      matchedPhrase: 'last night',
    };
  }

  // 3. "yesterday" or "kal"
  if (/\byesterday\b/.test(lower)) {
    return {
      date: getRelativeDateIndia(-1, now),
      matchedPhrase: 'yesterday',
    };
  }
  if (/\bkal\b/.test(lower)) {
    return {
      date: getRelativeDateIndia(-1, now),
      matchedPhrase: 'kal',
    };
  }

  // 4. "today" or "aaj"
  if (/\btoday\b/.test(lower)) {
    return {
      date: getTodayIndia(now),
      matchedPhrase: 'today',
    };
  }
  if (/\baaj\b/.test(lower)) {
    return {
      date: getTodayIndia(now),
      matchedPhrase: 'aaj',
    };
  }

  // 5. "N days ago"
  const daysAgoMatch = lower.match(/\b(\d+)\s+days?\s+ago\b/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    if (!isNaN(days) && days >= 0) {
      return {
        date: getRelativeDateIndia(-days, now),
        matchedPhrase: daysAgoMatch[0],
      };
    }
  }

  // 6. Weekday names (most recent past occurrence)
  for (const [dayName, dayIndex] of Object.entries(WEEKDAYS)) {
    const pattern = new RegExp(`\\b(?:last\\s+)?${dayName}\\b`, 'i');
    const match = lower.match(pattern);
    if (match) {
      const ist = getIndiaDate(now);
      const currentDay = ist.getDay();
      let diff = (currentDay - dayIndex + 7) % 7;
      if (diff === 0) {
        // If today is that day, "last <day>" or "<day>" refers to 7 days ago
        diff = 7;
      }
      return {
        date: getRelativeDateIndia(-diff, now),
        matchedPhrase: match[0],
      };
    }
  }

  // Default to today
  return {
    date: getTodayIndia(now),
    matchedPhrase: '',
  };
}
