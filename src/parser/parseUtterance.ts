import { KeywordMap, resolveCategoryKeyword } from './categories';
import { extractDateFromUtterance } from './dates';
import { isNumberWord, parseNumberWords } from './numberWords';
import { rupeesToPaise } from '../domain/money';

export interface ParseResult {
  type: 'expense' | 'income';
  amountPaise: number | null;
  category: string | null;
  note: string;
  date: string;
  confidence: number;
  matchedKeyword?: string;
}

const INCOME_TRIGGERS = [
  'got',
  'received',
  'credited',
  'earned',
  'salary',
  'mila',
  'aaya',
  'refund',
  'cashback',
  'stipend',
  'bonus',
  'dividend',
  'interest',
];

const CURRENCY_WORDS = new Set([
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

const COMMAND_WORDS = new Set([
  'add',
  'spent',
  'spend',
  'paid',
  'pay',
  'for',
  'on',
  'in',
  'to',
  'at',
  'of',
  'the',
  'a',
  'an',
  'ka',
  'ki',
  'ke',
  'liye',
  'ko',
  'se',
  'me',
  'mein',
  'par',
  'worth',
  'cost',
]);

const IDENTIFIER_PREFIXES = new Set([
  'room',
  'bus',
  'flight',
  'train',
  'table',
  'seat',
  'sector',
  'gate',
  'model',
  'class',
  'flat',
  'shop',
]);

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface AmountCandidate {
  amountRupees: number;
  indices: number[];
  score: number;
}

/**
 * Extracts the most probable amount in Rupees from utterance tokens.
 * Handles multiple numbers in a sentence (e.g. quantity vs total: "2 chai 20 rupees", "room 101 rent 15000").
 */
function extractAmount(tokens: string[]): { amountRupees: number | null; matchedTokens: Set<number> } {
  const candidates: AmountCandidate[] = [];

  // Helper to check if adjacent token is currency
  const hasAdjacentCurrency = (startIdx: number, endIdx: number): boolean => {
    if (startIdx > 0 && CURRENCY_WORDS.has(tokens[startIdx - 1].toLowerCase())) {
      return true;
    }
    if (endIdx + 1 < tokens.length && CURRENCY_WORDS.has(tokens[endIdx + 1].toLowerCase())) {
      return true;
    }
    return false;
  };

  // Helper to check if preceded by command / action word
  const hasPrecedingAction = (startIdx: number): boolean => {
    if (startIdx > 0) {
      const prev = tokens[startIdx - 1].toLowerCase();
      return prev === 'paid' || prev === 'spent' || prev === 'for' || prev === 'worth' || prev === 'of';
    }
    return false;
  };

  // Helper to check if preceded by identifier (room 101, bus 21)
  const hasPrecedingIdentifier = (startIdx: number): boolean => {
    if (startIdx > 0) {
      const prev = tokens[startIdx - 1].toLowerCase();
      return IDENTIFIER_PREFIXES.has(prev);
    }
    return false;
  };

  // 1. Scan numeric patterns
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].replace(/[₹,]/g, '');

    // Check "2k" or "1.5k"
    const kMatch = raw.match(/^(\d+(?:\.\d+)?)\s*k$/i);
    if (kMatch) {
      const val = parseFloat(kMatch[1]) * 1000;
      let score = 80;
      if (hasAdjacentCurrency(i, i)) score += 50;
      if (hasPrecedingAction(i)) score += 30;
      candidates.push({ amountRupees: val, indices: [i], score });
      continue;
    }

    // Check "2m"
    const mMatch = raw.match(/^(\d+(?:\.\d+)?)\s*m$/i);
    if (mMatch) {
      const val = parseFloat(mMatch[1]) * 1000000;
      let score = 80;
      if (hasAdjacentCurrency(i, i)) score += 50;
      candidates.push({ amountRupees: val, indices: [i], score });
      continue;
    }

    // Check numeric digits
    const numMatch = raw.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      const baseNum = parseFloat(numMatch[1]);
      let consumedIndices = [i];
      let val = baseNum;
      let hasMultiplier = false;

      // Check multiplier token
      if (i + 1 < tokens.length) {
        const next = tokens[i + 1].toLowerCase();
        if (next === 'k') {
          val = baseNum * 1000;
          consumedIndices = [i, i + 1];
          hasMultiplier = true;
        } else if (next === 'lakh' || next === 'lakhs' || next === 'lac' || next === 'lacs') {
          val = baseNum * 100000;
          consumedIndices = [i, i + 1];
          hasMultiplier = true;
        } else if (next === 'crore' || next === 'crores') {
          val = baseNum * 10000000;
          consumedIndices = [i, i + 1];
          hasMultiplier = true;
        } else if (next === 'thousand') {
          val = baseNum * 1000;
          consumedIndices = [i, i + 1];
          hasMultiplier = true;
        } else if (next === 'hundred') {
          val = baseNum * 100;
          consumedIndices = [i, i + 1];
          hasMultiplier = true;
        }
      }

      const endIdx = consumedIndices[consumedIndices.length - 1];
      let score = 20;

      if (hasMultiplier) score += 60;
      if (hasAdjacentCurrency(i, endIdx)) score += 80;
      if (hasPrecedingAction(i)) score += 40;
      if (hasPrecedingIdentifier(i)) score -= 100;

      // Penalize small quantity numbers (1-10) when not attached to currency and followed by a noun
      if (!hasMultiplier && !hasAdjacentCurrency(i, endIdx) && baseNum <= 10 && Number.isInteger(baseNum)) {
        if (endIdx + 1 < tokens.length && !CURRENCY_WORDS.has(tokens[endIdx + 1].toLowerCase())) {
          score -= 40;
        }
      }

      // Slightly favor numbers appearing later in utterance (common in Hinglish e.g. "2 chai 20")
      score += Math.min(i * 2, 20);

      candidates.push({ amountRupees: val, indices: consumedIndices, score });

      if (hasMultiplier) {
        i++; // skip multiplier
      }
      continue;
    }
  }

  // 2. Scan number word patterns
  for (let i = 0; i < tokens.length; i++) {
    if (isNumberWord(tokens[i])) {
      const wordGroup: string[] = [];
      const indices: number[] = [];

      let j = i;
      while (j < tokens.length && (isNumberWord(tokens[j]) || tokens[j].toLowerCase() === 'and')) {
        if (tokens[j].toLowerCase() !== 'and') {
          wordGroup.push(tokens[j]);
        }
        indices.push(j);
        j++;
      }

      const parsed = parseNumberWords(wordGroup);
      if (parsed !== null && parsed > 0) {
        const endIdx = indices[indices.length - 1];
        let score = 30;

        if (hasAdjacentCurrency(i, endIdx)) score += 80;
        if (hasPrecedingAction(i)) score += 40;
        if (hasPrecedingIdentifier(i)) score -= 100;
        score += Math.min(i * 2, 20);

        candidates.push({ amountRupees: parsed, indices, score });
        i = endIdx;
      }
    }
  }

  if (candidates.length === 0) {
    return { amountRupees: null, matchedTokens: new Set() };
  }

  // Pick candidate with highest score
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  return {
    amountRupees: best.amountRupees,
    matchedTokens: new Set(best.indices),
  };
}

export function parseUtterance(
  text: string,
  now: Date = new Date(),
  _tz = 'Asia/Kolkata',
  keywords?: KeywordMap
): ParseResult {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        type: 'expense',
        amountPaise: null,
        category: null,
        note: 'Expense',
        date: extractDateFromUtterance('', now).date,
        confidence: 0,
      };
    }

    const cleanInput = text.trim();
    const lowerInput = cleanInput.toLowerCase();

    // 1. Determine Type (income vs expense)
    const isIncome = INCOME_TRIGGERS.some((trigger) => {
      const regex = new RegExp(`\\b${trigger}\\b`, 'i');
      return regex.test(lowerInput);
    });
    const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';

    // 2. Extract Date
    const { date, matchedPhrase: dateMatchedPhrase } = extractDateFromUtterance(cleanInput, now);

    // 3. Tokenize for Amount and Category extraction
    const normalized = cleanInput
      .replace(/[₹]/g, ' ₹ ')
      .replace(/[,]/g, '')
      .replace(/[!?;:()]/g, ' ');

    const tokens = normalized.split(/\s+/).filter(Boolean);

    // 4. Extract Amount
    const { amountRupees, matchedTokens: amountTokenIndices } = extractAmount(tokens);
    const amountPaise = amountRupees !== null && amountRupees > 0 ? rupeesToPaise(amountRupees) : null;

    // 5. Category Resolution (learned keywords first, then built-in)
    let detectedCategory: string | null = null;
    let matchedKeyword: string | undefined = undefined;
    const categoryTokenIndices = new Set<number>();

    // Check multi-word keywords first (e.g. "got paid", "ice cream", "pav bhaji", custom 2-word keywords)
    for (let i = 0; i < tokens.length - 1; i++) {
      const twoWord = `${tokens[i]} ${tokens[i + 1]}`.toLowerCase();
      const resolved = resolveCategoryKeyword(twoWord, keywords);
      if (resolved) {
        detectedCategory = resolved.category;
        matchedKeyword = resolved.matchedKeyword;
        categoryTokenIndices.add(i);
        categoryTokenIndices.add(i + 1);
        break;
      }
    }

    // Check single word keywords if not matched
    if (!detectedCategory) {
      for (let i = 0; i < tokens.length; i++) {
        if (amountTokenIndices.has(i)) continue;

        const word = tokens[i].toLowerCase();
        const resolved = resolveCategoryKeyword(word, keywords);
        if (resolved) {
          detectedCategory = resolved.category;
          matchedKeyword = resolved.matchedKeyword;
          categoryTokenIndices.add(i);
          break;
        }
      }
    }

    // If type is income and no category detected, default category to Income
    if (type === 'income' && !detectedCategory) {
      detectedCategory = 'Income';
    }

    // 6. Extract Note
    const dateTokens = new Set(
      dateMatchedPhrase
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
    );

    const noteTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      if (amountTokenIndices.has(i)) continue;

      const raw = tokens[i];
      const lower = raw.toLowerCase();

      if (CURRENCY_WORDS.has(lower)) continue;
      if (COMMAND_WORDS.has(lower)) continue;
      if (dateTokens.has(lower)) continue;
      if (
        isIncome &&
        (lower === 'got' ||
          lower === 'received' ||
          lower === 'credited' ||
          lower === 'earned' ||
          lower === 'mila' ||
          lower === 'aaya')
      ) {
        continue;
      }

      noteTokens.push(raw);
    }

    let note = toTitleCase(noteTokens.join(' '));

    // Fallbacks if note is empty
    if (!note || note.trim().length === 0) {
      if (matchedKeyword) {
        note = toTitleCase(matchedKeyword);
      } else if (detectedCategory) {
        note = detectedCategory;
      } else {
        note = type === 'income' ? 'Income' : 'Expense';
      }
    }

    // 7. Calculate Confidence
    let confidence = 0.1;
    if (amountPaise !== null) {
      if (detectedCategory !== null) {
        confidence = 0.95;
      } else {
        confidence = 0.6;
      }
    } else {
      confidence = 0.1;
    }

    return {
      type,
      amountPaise,
      category: detectedCategory,
      note,
      date,
      confidence,
      matchedKeyword,
    };
  } catch {
    return {
      type: 'expense',
      amountPaise: null,
      category: null,
      note: 'Expense',
      date: extractDateFromUtterance('', now).date,
      confidence: 0,
    };
  }
}
