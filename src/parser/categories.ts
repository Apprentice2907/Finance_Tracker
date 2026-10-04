export type KeywordMap = Record<string, string> | Map<string, string>;

export const DEFAULT_BUILTIN_KEYWORDS: Record<string, string> = {
  // Transport
  rickshaw: 'Transport',
  auto: 'Transport',
  metro: 'Transport',
  bus: 'Transport',
  train: 'Transport',
  uber: 'Transport',
  ola: 'Transport',
  rapido: 'Transport',
  cab: 'Transport',
  taxi: 'Transport',
  petrol: 'Transport',
  diesel: 'Transport',
  fuel: 'Transport',
  parking: 'Transport',
  toll: 'Transport',

  // Food
  chai: 'Food',
  tea: 'Food',
  coffee: 'Food',
  lunch: 'Food',
  dinner: 'Food',
  breakfast: 'Food',
  snacks: 'Food',
  snack: 'Food',
  swiggy: 'Food',
  zomato: 'Food',
  groceries: 'Food',
  grocery: 'Food',
  vegetables: 'Food',
  milk: 'Food',
  biryani: 'Food',
  pizza: 'Food',
  burger: 'Food',
  samosa: 'Food',

  // Shopping
  shirt: 'Shopping',
  shoes: 'Shopping',
  shoe: 'Shopping',
  amazon: 'Shopping',
  flipkart: 'Shopping',
  myntra: 'Shopping',
  clothes: 'Shopping',
  dress: 'Shopping',
  pants: 'Shopping',

  // Bills
  rent: 'Bills',
  electricity: 'Bills',
  recharge: 'Bills',
  wifi: 'Bills',
  internet: 'Bills',
  bill: 'Bills',
  bills: 'Bills',
  emi: 'Bills',
  water: 'Bills',
  gas: 'Bills',

  // Health
  medicine: 'Health',
  medicines: 'Health',
  doctor: 'Health',
  pharmacy: 'Health',
  hospital: 'Health',
  gym: 'Health',
  clinic: 'Health',

  // Fun
  movie: 'Fun',
  movies: 'Fun',
  cinema: 'Fun',
  game: 'Fun',
  gaming: 'Fun',
  netflix: 'Fun',
  party: 'Fun',
  trip: 'Fun',
  outing: 'Fun',

  // Income
  salary: 'Income',
  stipend: 'Income',
  refund: 'Income',
  cashback: 'Income',
  'got paid': 'Income',
};

/**
 * Resolves a keyword against learned keywords first, then built-in keywords.
 */
export function resolveCategoryKeyword(
  word: string,
  learnedKeywords?: KeywordMap
): { category: string; matchedKeyword: string } | null {
  const cleanWord = word.trim().toLowerCase();

  // 1. Check learned keywords first
  if (learnedKeywords) {
    if (learnedKeywords instanceof Map) {
      if (learnedKeywords.has(cleanWord)) {
        return {
          category: learnedKeywords.get(cleanWord)!,
          matchedKeyword: cleanWord,
        };
      }
    } else if (cleanWord in learnedKeywords) {
      return {
        category: learnedKeywords[cleanWord],
        matchedKeyword: cleanWord,
      };
    }
  }

  // 2. Check built-in keywords
  if (cleanWord in DEFAULT_BUILTIN_KEYWORDS) {
    return {
      category: DEFAULT_BUILTIN_KEYWORDS[cleanWord],
      matchedKeyword: cleanWord,
    };
  }

  return null;
}
