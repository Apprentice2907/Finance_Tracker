/**
 * Number word definitions and parsers for English and Hindi (Hinglish).
 */

export const ENGLISH_ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

export const ENGLISH_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

export const ENGLISH_MULTIPLIERS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  k: 1000,
  lakh: 100000,
  lakhs: 100000,
  lac: 100000,
  lacs: 100000,
  crore: 10000000,
  crores: 10000000,
};

export const HINDI_NUMBERS: Record<string, number> = {
  shunya: 0,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  chhah: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnis: 19,
  bees: 20,
  tees: 30,
  chalis: 40,
  pachas: 50,
  pachaas: 50,
  saath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  sau: 100,
  hazaar: 1000,
  hazar: 1000,
};

/**
 * Checks if a word is an English or Hindi number word.
 */
export function isNumberWord(word: string): boolean {
  const w = word.toLowerCase();
  return (
    w in ENGLISH_ONES ||
    w in ENGLISH_TENS ||
    w in ENGLISH_MULTIPLIERS ||
    w in HINDI_NUMBERS ||
    w === 'dedh' ||
    w === 'dhai'
  );
}

/**
 * Parses a sequence of English / Hindi number tokens into a single number.
 * e.g. ["twenty", "five"] -> 25
 * e.g. ["one", "hundred", "fifty"] -> 150
 * e.g. ["two", "thousand"] -> 2000
 * e.g. ["das"] -> 10
 * e.g. ["dedh", "sau"] -> 150
 * e.g. ["dhai", "hazaar"] -> 2500
 */
export function parseNumberWords(tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();

    // Check special Hindi fractional multipliers: dedh (1.5x) and dhai (2.5x)
    if (token === 'dedh') {
      const next = tokens[i + 1]?.toLowerCase();
      if (next === 'sau') {
        current += 150;
        i++;
        continue;
      }
      if (next === 'hazaar' || next === 'hazar' || next === 'thousand') {
        current += 1500;
        i++;
        continue;
      }
      current += 1.5;
      continue;
    }

    if (token === 'dhai') {
      const next = tokens[i + 1]?.toLowerCase();
      if (next === 'sau') {
        current += 250;
        i++;
        continue;
      }
      if (next === 'hazaar' || next === 'hazar' || next === 'thousand') {
        current += 2500;
        i++;
        continue;
      }
      current += 2.5;
      continue;
    }

    if (token in ENGLISH_ONES) {
      current += ENGLISH_ONES[token];
    } else if (token in ENGLISH_TENS) {
      current += ENGLISH_TENS[token];
    } else if (token in HINDI_NUMBERS) {
      const val = HINDI_NUMBERS[token];
      if (val === 100) {
        current = current === 0 ? 100 : current * 100;
      } else if (val === 1000) {
        current = current === 0 ? 1000 : current * 1000;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    } else if (token === 'hundred') {
      current = current === 0 ? 100 : current * 100;
    } else if (token === 'thousand' || token === 'k') {
      current = current === 0 ? 1000 : current * 1000;
      total += current;
      current = 0;
    } else if (token === 'lakh' || token === 'lakhs' || token === 'lac' || token === 'lacs') {
      current = current === 0 ? 100000 : current * 100000;
      total += current;
      current = 0;
    } else if (token === 'crore' || token === 'crores') {
      current = current === 0 ? 10000000 : current * 10000000;
      total += current;
      current = 0;
    } else {
      return null;
    }
  }

  total += current;
  return total > 0 ? total : null;
}
