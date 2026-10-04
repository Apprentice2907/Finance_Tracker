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
  cng: 'Transport',
  fuel: 'Transport',
  parking: 'Transport',
  toll: 'Transport',
  fastag: 'Transport',
  flight: 'Transport',
  scooter: 'Transport',
  bike: 'Transport',
  puncture: 'Transport',
  mechanic: 'Transport',

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
  zepto: 'Food',
  blinkit: 'Food',
  instamart: 'Food',
  groceries: 'Food',
  grocery: 'Food',
  vegetables: 'Food',
  milk: 'Food',
  biryani: 'Food',
  pizza: 'Food',
  burger: 'Food',
  samosa: 'Food',
  dosa: 'Food',
  idli: 'Food',
  vada: 'Food',
  momos: 'Food',
  momo: 'Food',
  paratha: 'Food',
  thali: 'Food',
  roti: 'Food',
  sabzi: 'Food',
  paneer: 'Food',
  curd: 'Food',
  dahi: 'Food',
  chicken: 'Food',
  poha: 'Food',
  maggi: 'Food',
  juice: 'Food',
  sweets: 'Food',
  mithai: 'Food',
  fruits: 'Food',
  icecream: 'Food',
  'ice cream': 'Food',

  // Shopping
  shirt: 'Shopping',
  shoes: 'Shopping',
  shoe: 'Shopping',
  amazon: 'Shopping',
  flipkart: 'Shopping',
  myntra: 'Shopping',
  meesho: 'Shopping',
  clothes: 'Shopping',
  kapde: 'Shopping',
  dress: 'Shopping',
  pants: 'Shopping',
  chappal: 'Shopping',
  bag: 'Shopping',
  stationery: 'Shopping',
  books: 'Shopping',

  // Bills
  rent: 'Bills',
  electricity: 'Bills',
  bijli: 'Bills',
  recharge: 'Bills',
  wifi: 'Bills',
  internet: 'Bills',
  bill: 'Bills',
  bills: 'Bills',
  emi: 'Bills',
  water: 'Bills',
  paani: 'Bills',
  gas: 'Bills',
  cylinder: 'Bills',
  jio: 'Bills',
  airtel: 'Bills',
  maintenance: 'Bills',
  society: 'Bills',
  maid: 'Bills',
  cook: 'Bills',

  // Health
  medicine: 'Health',
  medicines: 'Health',
  dawa: 'Health',
  dawai: 'Health',
  doctor: 'Health',
  pharmacy: 'Health',
  chemist: 'Health',
  hospital: 'Health',
  gym: 'Health',
  clinic: 'Health',
  dentist: 'Health',

  // Fun
  movie: 'Fun',
  movies: 'Fun',
  cinema: 'Fun',
  pvr: 'Fun',
  popcorn: 'Fun',
  game: 'Fun',
  gaming: 'Fun',
  netflix: 'Fun',
  prime: 'Fun',
  hotstar: 'Fun',
  spotify: 'Fun',
  party: 'Fun',
  beer: 'Fun',
  drinks: 'Fun',
  trip: 'Fun',
  outing: 'Fun',
  hotel: 'Fun',

  // Income
  salary: 'Income',
  stipend: 'Income',
  bonus: 'Income',
  refund: 'Income',
  cashback: 'Income',
  dividend: 'Income',
  freelance: 'Income',
  interest: 'Income',
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

  // 3. Check plural forms (e.g. "pizzas" -> "pizza", "coffees" -> "coffee")
  if (cleanWord.endsWith('s') && cleanWord.length > 3) {
    const singular = cleanWord.slice(0, -1);
    if (singular in DEFAULT_BUILTIN_KEYWORDS) {
      return {
        category: DEFAULT_BUILTIN_KEYWORDS[singular],
        matchedKeyword: singular,
      };
    }
  }
  if (cleanWord.endsWith('es') && cleanWord.length > 4) {
    const singular = cleanWord.slice(0, -2);
    if (singular in DEFAULT_BUILTIN_KEYWORDS) {
      return {
        category: DEFAULT_BUILTIN_KEYWORDS[singular],
        matchedKeyword: singular,
      };
    }
  }

  return null;
}
