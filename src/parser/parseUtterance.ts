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
  'and',
  '&',
]);

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface AmountExtraction {
  amountRupees: number | null;
  matchedTokens: Set<number>; // indices of tokens consumed
}

/**
 * Extracts amount in Rupees from utterance tokens.
 */
function extractAmount(tokens: string[]): AmountExtraction {
  const matched = new Set<number>();

  // 1. Look for numeric patterns: "1,250", "250.50", "10", "2k", "1.5k", "2 lakh", "1.5 lakh"
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].replace(/[₹,]/g, '');

    // Check "2k" or "1.5k"
    const kMatch = raw.match(/^(\d+(?:\.\d+)?)\s*k$/i);
    if (kMatch) {
      const val = parseFloat(kMatch[1]) * 1000;
      matched.add(i);
      return { amountRupees: val, matchedTokens: matched };
    }

    // Check "2m"
    const mMatch = raw.match(/^(\d+(?:\.\d+)?)\s*m$/i);
    if (mMatch) {
      const val = parseFloat(mMatch[1]) * 1000000;
      matched.add(i);
      return { amountRupees: val, matchedTokens: matched };
    }

    // Check if current token is a numeric digit (integer or decimal)
    const numMatch = raw.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      const baseNum = parseFloat(numMatch[1]);
      matched.add(i);

      // Check if followed by multiplier token: "k", "lakh", "lakhs", "crore", "crores", "thousand", "hundred"
      if (i + 1 < tokens.length) {
        const next = tokens[i + 1].toLowerCase();
        if (next === 'k') {
          matched.add(i + 1);
          return { amountRupees: baseNum * 1000, matchedTokens: matched };
        }
        if (next === 'lakh' || next === 'lakhs' || next === 'lac' || next === 'lacs') {
          matched.add(i + 1);
          return { amountRupees: baseNum * 100000, matchedTokens: matched };
        }
        if (next === 'crore' || next === 'crores') {
          matched.add(i + 1);
          return { amountRupees: baseNum * 10000000, matchedTokens: matched };
        }
        if (next === 'thousand') {
          matched.add(i + 1);
          return { amountRupees: baseNum * 1000, matchedTokens: matched };
        }
        if (next === 'hundred') {
          matched.add(i + 1);
          return { amountRupees: baseNum * 100, matchedTokens: matched };
        }
      }

      return { amountRupees: baseNum, matchedTokens: matched };
    }
  }

  // 2. Look for consecutive number words: "ten", "twenty five", "one hundred fifty", "das", "dedh sau", etc.
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
        indices.forEach((idx) => matched.add(idx));
        return { amountRupees: parsed, matchedTokens: matched };
      }
    }
  }

  return { amountRupees: null, matchedTokens: matched };
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
    // Normalize punctuation
    const normalized = cleanInput
      .replace(/[₹]/g, ' ₹ ')
      .replace(/[,]/g, '') // remove thousands commas inside numbers
      .replace(/[!?;:()]/g, ' ');

    const tokens = normalized.split(/\s+/).filter(Boolean);

    // 4. Extract Amount
    const { amountRupees, matchedTokens: amountTokenIndices } = extractAmount(tokens);
    const amountPaise = amountRupees !== null && amountRupees > 0 ? rupeesToPaise(amountRupees) : null;

    // 5. Category Resolution (learned keywords first, then built-in)
    let detectedCategory: string | null = null;
    let matchedKeyword: string | undefined = undefined;
    const categoryTokenIndices = new Set<number>();

    // Check multi-word keywords first (e.g. "got paid", "ice cream", custom 2-word keywords)
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
        // Skip tokens already consumed by amount
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
    // Remove amount tokens, currency tokens, command tokens, date phrase tokens, and income trigger tokens
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
      if (isIncome && (lower === 'got' || lower === 'received' || lower === 'credited' || lower === 'earned' || lower === 'mila' || lower === 'aaya')) {
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
    // High (0.95) when amount AND category are found.
    // Medium (0.6) when amount is found without category.
    // Low (0.1) otherwise (no amount).
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
  } catch (_err) {
    // Parser must NEVER throw
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
