/**
 * Voice Recognizer Mishearing Corrections & Fuzzy Keyword Matching for Wini.
 * Where it fits: Pre-processing layer inside `parseUtterance` to handle natural speech
 * quirks, phone recognizer errors, compound splits, and Hinglish pronunciation variations.
 *
 * Beginner note: Speech recognizers (Google, Apple, Whisper) frequently make predictable
 * mistakes with Indian English and Hinglish words. For example:
 * - "rickshaw" heard as "rick shaw" or "ricksha"
 * - "chai" heard as "chay" or "chaai"
 * - Homophones: "for chai" instead of "4 chai", "too rupees" instead of "2 rupees"
 * This module cleans the text conservatively before amount and category extraction runs.
 */

import { DEFAULT_BUILTIN_KEYWORDS } from './categories';
import { isNumberWord } from './numberWords';
import { transliterateDevanagari } from './devanagari';

// Currency terms recognized by the parser
export const CURRENCY_WORDS = new Set([
  'rupees',
  'rupee',
  'rs',
  'rs.',
  '₹',
  'rupaye',
  'rupiya',
  'rupiye',
  'bucks',
  'buck',
  'inr',
]);

// Multi-word phrase aliases (longest/most specific first)
export const MULTI_WORD_ALIASES: [RegExp, string][] = [
  // Compound splits
  [/\brick\s+shaw\b/gi, 'rickshaw'],
  [/\brick\s+sha\b/gi, 'rickshaw'],
  [/\bauto\s+rickshaw\b/gi, 'rickshaw'],
  [/\be\s+rickshaw\b/gi, 'rickshaw'],
  [/\berickshaw\b/gi, 'rickshaw'],
  [/\bblink\s+it\b/gi, 'blinkit'],
  [/\bice\s+cream\b/gi, 'icecream'],
  [/\bpav\s+bhaji\b/gi, 'pavbhaji'],
  [/\bpan\s+puri\b/gi, 'panipuri'],
  [/\bpani\s+puri\b/gi, 'panipuri'],
  [/\bchole\s+bhature\b/gi, 'bhature'],

  // Hindi number + currency combinations
  [/\bdus\s+rupaye\b/gi, '10 rupees'],
  [/\bdas\s+rupaye\b/gi, '10 rupees'],
  [/\bdus\s+rupee\b/gi, '10 rupees'],
  [/\bdas\s+rupee\b/gi, '10 rupees'],
  [/\bek\s+rupaye\b/gi, '1 rupees'],
  [/\bek\s+rupee\b/gi, '1 rupees'],
  [/\bdo\s+rupaye\b/gi, '2 rupees'],
  [/\bdo\s+rupee\b/gi, '2 rupees'],
  [/\bteen\s+rupaye\b/gi, '3 rupees'],
  [/\bteen\s+rupee\b/gi, '3 rupees'],
  [/\bchaar\s+rupaye\b/gi, '4 rupees'],
  [/\bchaar\s+rupee\b/gi, '4 rupees'],
  [/\bpaanch\s+rupaye\b/gi, '5 rupees'],
  [/\bpaanch\s+rupee\b/gi, '5 rupees'],
  [/\bbees\s+rupaye\b/gi, '20 rupees'],
  [/\bbees\s+rupee\b/gi, '20 rupees'],
  [/\bpachaas\s+rupaye\b/gi, '50 rupees'],
  [/\bpachas\s+rupaye\b/gi, '50 rupees'],
  [/\bpachas\s+rupee\b/gi, '50 rupees'],
  [/\bsau\s+rupaye\b/gi, '100 rupees'],
  [/\bsau\s+rupee\b/gi, '100 rupees'],
];

// Single word alias map for common recognizer mishearings
export const SINGLE_WORD_ALIASES: Record<string, string> = {
  // Transport
  ricksha: 'rickshaw',
  rikshaw: 'rickshaw',
  riksha: 'rickshaw',
  metor: 'metro',
  pertol: 'petrol',
  petroll: 'petrol',
  petrole: 'petrol',
  deisel: 'diesel',
  disel: 'diesel',
  uver: 'uber',
  oober: 'uber',
  ollah: 'ola',
  sooter: 'scooter',

  // Food
  chay: 'chai',
  chaai: 'chai',
  chaye: 'chai',
  swigi: 'swiggy',
  swigey: 'swiggy',
  zomatto: 'zomato',
  zomatoo: 'zomato',
  zamoto: 'zomato',
  doodh: 'milk',
  dudh: 'milk',
  sabzi: 'vegetables',
  sabji: 'vegetables',
  parantha: 'paratha',
  biryany: 'biryani',
  piza: 'pizza',
  samose: 'samosa',

  // Groceries / Bills / Health
  rashan: 'groceries',
  raashan: 'groceries',
  kirana: 'groceries',
  dawa: 'medicine',
  davai: 'medicine',
  dawai: 'medicine',
  medcine: 'medicine',
  medicne: 'medicine',
  bijli: 'electricity',
  kiraya: 'rent',
};

// Common English, Hindi, names, and date words that must NEVER be mangled by fuzzy matching
export const PROTECTED_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'in',
  'is',
  'it',
  'its',
  'no',
  'not',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'with',
  'more',
  'some',
  'good',
  'give',
  'gave',
  'given',
  'take',
  'took',
  'back',
  'flat',
  'room',
  'bus',
  'paid',
  'spent',
  'spend',
  'pay',
  'sent',
  'send',
  'got',
  'free',
  'cost',
  'worth',
  'team',
  'game',
  'match',
  'won',
  'play',
  'book',
  'card',
  'cash',
  'bank',
  'call',
  'time',
  'home',
  'work',
  'split',
  'lend',
  'lent',
  'borrow',
  'borrowed',
  'transfer',
  'transferred',
  'bought',
  'buy',
  // Common nouns and objects (preventing false matches like chain -> chai)
  'chain',
  'chair',
  'chat',
  'check',
  'shirt',
  'shoe',
  'shoes',
  'phone',
  'watch',
  'bag',
  'ring',
  'gold',
  'silver',
  'table',
  'pen',
  'paper',
  'ticket',
  'fresh',
  'market',
  'store',
  'shop',
  'order',
  // Common names
  'priya',
  'rahul',
  'ankit',
  'rohit',
  'aman',
  'neha',
  'bhai',
  'anna',
  'sir',
  // Date triggers (must never be mangled into categories like party or flight)
  'kal',
  'parso',
  'tarso',
  'narso',
  'aaj',
  'today',
  'yesterday',
  'tomorrow',
  'night',
  'last',
  'morning',
  'evening',
  'afternoon',
  // Income triggers
  'credited',
  'earned',
  'salary',
  'stipend',
  'refund',
  'cashback',
  'dividend',
  'interest',
  'bonus',
  'mila',
  'mile',
  'aaya',
  'aaye',
  // Hindi prepositions & connectors
  'ka',
  'ki',
  'ke',
  'ko',
  'se',
  'me',
  'mein',
  'par',
  'pe',
  'liye',
  'keliye',
  'aur',
  'bhi',
]);

/**
 * Calculates standard Levenshtein distance between two strings using dynamic programming.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;

  let prevRow = new Int32Array(n + 1);
  let currRow = new Int32Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= n; j++) {
      const bChar = b.charCodeAt(j - 1);
      const cost = aChar === bChar ? 0 : 1;

      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n];
}

/**
 * Calculates Damerau-Levenshtein distance (optimal string alignment) between two strings.
 * Accounts for insertions, deletions, substitutions, and transpositions of adjacent characters.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) {
    d[i] = new Array(n + 1).fill(0);
    d[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    const aChar = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const bChar = b[j - 1];
      const cost = aChar === bChar ? 0 : 1;

      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition of adjacent characters
      if (i > 1 && j > 1 && aChar === b[j - 2] && a[i - 2] === bChar) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[m][n];
}

/**
 * Fuzzy matches a single token against keyword candidates.
 * Conservative rules:
 * - Only tokens of length >= 4 are considered
 * - Edit distance <= 1 for 4-letter words
 * - Edit distance <= 2 for 5+ letter words
 * - For short candidates (<= 4 chars, like "chai"), do not match longer words (e.g. "chain" or "chair")
 * - Protected words are never matched
 */
export function fuzzyMatchKeyword(
  token: string,
  candidates: Iterable<string>
): string | null {
  const clean = token.toLowerCase();

  if (clean.length < 4) return null;
  if (PROTECTED_WORDS.has(clean)) return null;

  const maxAllowedDistance = clean.length <= 4 ? 1 : 2;

  let bestMatch: string | null = null;
  let minDistance = maxAllowedDistance + 1;

  for (const candidate of candidates) {
    // Length difference heuristic: if length differs by more than max distance, skip
    if (Math.abs(candidate.length - clean.length) > maxAllowedDistance) {
      continue;
    }

    // For short candidates of length <= 4 (e.g. "chai", "auto"), do not match longer words
    if (candidate.length <= 4 && clean.length > candidate.length) {
      continue;
    }

    const dist = Math.min(
      levenshteinDistance(clean, candidate),
      damerauLevenshteinDistance(clean, candidate)
    );
    if (dist <= maxAllowedDistance && dist < minDistance) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Homophone disambiguation rules:
 * - "to" / "too" interpreted as 2 only when next to currency or known item word
 * - "for" interpreted as 4 only when next to currency or known item word AND no existing amount
 * - "won" interpreted as 1 only next to currency or known item word AND no existing amount
 * - "ate" interpreted as 8 only next to currency or known item word AND no existing amount
 */
export function disambiguateHomophones(
  tokens: string[],
  knownItemWords: Set<string>
): string[] {
  // Check if utterance already has an explicit numeric amount
  const hasExistingNumber = tokens.some((t) => {
    const raw = t.replace(/[₹,]/g, '');
    if (/^\d+(\.\d+)?(k|m)?$/i.test(raw)) return true;
    return isNumberWord(t);
  });

  const result = [...tokens];

  for (let i = 0; i < tokens.length; i++) {
    const lower = tokens[i].toLowerCase();
    const next = i + 1 < tokens.length ? tokens[i + 1].toLowerCase() : '';
    const prev = i > 0 ? tokens[i - 1].toLowerCase() : '';

    // "for" vs "4"
    if (lower === 'for') {
      if (!hasExistingNumber) {
        if (CURRENCY_WORDS.has(next) || knownItemWords.has(next)) {
          result[i] = '4';
        }
      }
    }
    // "to" / "too" vs "2"
    else if (lower === 'to' || lower === 'too') {
      if (CURRENCY_WORDS.has(next)) {
        result[i] = '2';
      } else if (knownItemWords.has(next) && !hasExistingNumber) {
        result[i] = '2';
      }
    }
    // "won" vs "1"
    else if (lower === 'won') {
      if (CURRENCY_WORDS.has(next) || (knownItemWords.has(next) && !hasExistingNumber)) {
        result[i] = '1';
      }
    }
    // "ate" vs "8"
    else if (lower === 'ate') {
      if (CURRENCY_WORDS.has(next) || (knownItemWords.has(next) && !hasExistingNumber)) {
        result[i] = '8';
      }
    }
    // "chi" -> "chai" if next to number or currency
    else if (lower === 'chi') {
      const isNextNum = /^\d+$/.test(next) || isNumberWord(next) || CURRENCY_WORDS.has(next);
      const isPrevNum = /^\d+$/.test(prev) || isNumberWord(prev) || CURRENCY_WORDS.has(prev);
      if (isNextNum || isPrevNum) {
        result[i] = 'chai';
      }
    }
  }

  return result;
}

/**
 * Pre-processes spoken utterance text safely:
 * 1. Multi-word phrase aliases (e.g. "rick shaw" -> "rickshaw", "dus rupaye" -> "10 rupees")
 * 2. Tokenized homophone disambiguation ("for chai" -> "4 chai", but "paid 50 for chai" untouched)
 * 3. High-confidence single-word aliases ("chay" -> "chai", "ricksha" -> "rickshaw")
 */
export function normalizeMishearings(
  text: string,
  learnedKeywords?: Record<string, string>
): string {
  if (!text || typeof text !== 'string') return '';

  // Transliterate Devanagari script (e.g. चाय -> chai, बीस -> 20, रुपये -> rupees)
  let normalized = transliterateDevanagari(text);

  // 1. Multi-word alias replacements
  for (const [pattern, replacement] of MULTI_WORD_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Build candidate set of all known item words (built-in + learned)
  const candidateKeywords = new Set<string>(Object.keys(DEFAULT_BUILTIN_KEYWORDS));
  if (learnedKeywords) {
    for (const kw of Object.keys(learnedKeywords)) {
      candidateKeywords.add(kw.toLowerCase());
    }
  }

  // 2. Tokenize and disambiguate homophones
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const disambiguated = disambiguateHomophones(rawTokens, candidateKeywords);

  // 3. Single word alias replacements
  const processedTokens = disambiguated.map((token) => {
    const clean = token.toLowerCase();

    // Check direct alias map
    if (SINGLE_WORD_ALIASES[clean]) {
      return SINGLE_WORD_ALIASES[clean];
    }

    return token;
  });

  return processedTokens.join(' ');
}
