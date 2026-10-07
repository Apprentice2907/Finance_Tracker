
/**
 * Default categories seed definitions for Wini.
 * Where it fits: Defines the 8 built-in categories seeded into SQLite when the database
 * is first created. Also provides category styling (emoji, hex color) across the UI.
 *
 * Beginner note: "Seed data" is the initial dummy or foundational data populated into
 * a fresh database so the user has meaningful categories ready right after install.
 */

export const ICON_KEYS = [
  'restaurant-outline',
  'car-outline',
  'bag-handle-outline',
  'receipt-outline',
  'heart-outline',
  'game-controller-outline',
  'school-outline',
  'film-outline',
  'repeat-outline',
  'cart-outline',
  'home-outline',
  'ellipsis-horizontal',
  'trending-up-outline',
  'briefcase-outline',
] as const;

export type IconKey = typeof ICON_KEYS[number];

export const DEFAULT_ICON_KEY: IconKey = 'ellipsis-horizontal';

export const CATEGORY_NAME_TO_ICON: Record<string, IconKey> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  shopping: 'bag-handle-outline',
  bills: 'receipt-outline',
  health: 'heart-outline',
  fun: 'game-controller-outline',
  education: 'school-outline',
  entertainment: 'film-outline',
  subscriptions: 'repeat-outline',
  groceries: 'cart-outline',
  rent: 'home-outline',
  other: 'ellipsis-horizontal',
  income: 'trending-up-outline',
  salary: 'briefcase-outline',
};

export const EMOJI_TO_ICON: Record<string, IconKey> = {
  '🍔': 'restaurant-outline',
  '🍽️': 'restaurant-outline',
  '🍲': 'restaurant-outline',
  '🍕': 'restaurant-outline',
  '🛺': 'car-outline',
  '🚗': 'car-outline',
  '🚕': 'car-outline',
  '🚌': 'car-outline',
  '⛽': 'car-outline',
  '🛍️': 'bag-handle-outline',
  '🛒': 'cart-outline',
  '🧾': 'receipt-outline',
  '⚡': 'receipt-outline',
  '💡': 'receipt-outline',
  '💊': 'heart-outline',
  '🏥': 'heart-outline',
  '❤️': 'heart-outline',
  '🎉': 'game-controller-outline',
  '🎮': 'game-controller-outline',
  '🕹️': 'game-controller-outline',
  '🎬': 'film-outline',
  '🍿': 'film-outline',
  '📚': 'school-outline',
  '🎓': 'school-outline',
  '🔄': 'repeat-outline',
  '🔁': 'repeat-outline',
  '🏠': 'home-outline',
  '🏢': 'home-outline',
  '✨': 'ellipsis-horizontal',
  '💰': 'trending-up-outline',
  '💵': 'trending-up-outline',
  '💼': 'briefcase-outline',
};

export function mapEmojiOrNameToIcon(emojiOrName?: string | null): IconKey {
  if (!emojiOrName) return DEFAULT_ICON_KEY;
  const trimmed = emojiOrName.trim();
  if (EMOJI_TO_ICON[trimmed]) {
    return EMOJI_TO_ICON[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (CATEGORY_NAME_TO_ICON[lower]) {
    return CATEGORY_NAME_TO_ICON[lower];
  }
  if ((ICON_KEYS as readonly string[]).includes(lower)) {
    return lower as IconKey;
  }
  return DEFAULT_ICON_KEY;
}

export interface DefaultCategoryDef {
  id: string;
  name: string;
  emoji: string;
  icon: IconKey;
  color: string;
  kind: 'expense' | 'income';
  sort_order: number;
}

export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  {
    id: 'cat-food',
    name: 'Food',
    emoji: '🍔',
    icon: 'restaurant-outline',
    color: '#FF9F43',
    kind: 'expense',
    sort_order: 1,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    emoji: '🛺',
    icon: 'car-outline',
    color: '#54A0FF',
    kind: 'expense',
    sort_order: 2,
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    emoji: '🛍️',
    icon: 'bag-handle-outline',
    color: '#F368E0',
    kind: 'expense',
    sort_order: 3,
  },
  {
    id: 'cat-bills',
    name: 'Bills',
    emoji: '🧾',
    icon: 'receipt-outline',
    color: '#FF6B6B',
    kind: 'expense',
    sort_order: 4,
  },
  {
    id: 'cat-health',
    name: 'Health',
    emoji: '💊',
    icon: 'heart-outline',
    color: '#1DD1A1',
    kind: 'expense',
    sort_order: 5,
  },
  {
    id: 'cat-fun',
    name: 'Fun',
    emoji: '🎉',
    icon: 'game-controller-outline',
    color: '#9B59B6',
    kind: 'expense',
    sort_order: 6,
  },
  {
    id: 'cat-other',
    name: 'Other',
    emoji: '✨',
    icon: 'ellipsis-horizontal',
    color: '#A0A0A0',
    kind: 'expense',
    sort_order: 7,
  },
  {
    id: 'cat-income',
    name: 'Income',
    emoji: '💰',
    icon: 'trending-up-outline',
    color: '#2ECC71',
    kind: 'income',
    sort_order: 8,
  },
];

