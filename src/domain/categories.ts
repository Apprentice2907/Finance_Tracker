
export interface DefaultCategoryDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  kind: 'expense' | 'income';
  sort_order: number;
}

export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  {
    id: 'cat-food',
    name: 'Food',
    emoji: '🍔',
    color: '#FF9F43',
    kind: 'expense',
    sort_order: 1,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    emoji: '🛺',
    color: '#54A0FF',
    kind: 'expense',
    sort_order: 2,
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    emoji: '🛍️',
    color: '#F368E0',
    kind: 'expense',
    sort_order: 3,
  },
  {
    id: 'cat-bills',
    name: 'Bills',
    emoji: '🧾',
    color: '#FF6B6B',
    kind: 'expense',
    sort_order: 4,
  },
  {
    id: 'cat-health',
    name: 'Health',
    emoji: '💊',
    color: '#1DD1A1',
    kind: 'expense',
    sort_order: 5,
  },
  {
    id: 'cat-fun',
    name: 'Fun',
    emoji: '🎉',
    color: '#9B59B6',
    kind: 'expense',
    sort_order: 6,
  },
  {
    id: 'cat-other',
    name: 'Other',
    emoji: '✨',
    color: '#A0A0A0',
    kind: 'expense',
    sort_order: 7,
  },
  {
    id: 'cat-income',
    name: 'Income',
    emoji: '💰',
    color: '#2ECC71',
    kind: 'income',
    sort_order: 8,
  },
];
