import { create } from 'zustand';
import {
  Category,
  DayGroup,
  PeriodTotals,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  KeywordMapEntry,
} from '../domain/types';
import { getRepository, initDatabase } from '../db';
import { getTodayIndia, getStartOfMonth, getEndOfMonth } from '../domain/dates';

export interface KeywordWithCategory extends KeywordMapEntry {
  category_name?: string;
  category_emoji?: string;
  category_color?: string;
}

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  bannerMessage: string | null;
  categories: Category[];
  groupedTransactions: DayGroup[];
  keywords: KeywordWithCategory[];
  keywordMap: Record<string, string>; // word -> category_name
  currentMonthTotals: PeriodTotals;
  todayTotals: PeriodTotals;
  lastDeletedTransaction: Transaction | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  addTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, updates: UpdateTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  learnKeyword: (word: string, categoryId: string) => Promise<void>;
  deleteKeyword: (id: string) => Promise<void>;
  showBanner: (msg: string, durationMs?: number) => void;
  clearBanner: () => void;
  clearError: () => void;
}

const emptyTotals: PeriodTotals = {
  totalExpensePaise: 0,
  totalIncomePaise: 0,
  netPaise: 0,
  count: 0,
};

let bannerTimeout: any = null;

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  error: null,
  bannerMessage: null,
  categories: [],
  groupedTransactions: [],
  keywords: [],
  keywordMap: {},
  currentMonthTotals: emptyTotals,
  todayTotals: emptyTotals,
  lastDeletedTransaction: null,

  init: async () => {
    try {
      set({ isLoading: true, error: null });
      await initDatabase();
      await get().refresh();
      set({ isInitialized: true, isLoading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to initialize database',
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    try {
      const repo = getRepository();
      const categories = await repo.getCategories();
      const groupedTransactions = await repo.listTransactionsGroupedByDay();
      const rawKeywords = await repo.getKeywords();

      // Map category details onto keywords
      const categoryMap = new Map<string, Category>();
      for (const cat of categories) {
        categoryMap.set(cat.id, cat);
      }

      const keywords: KeywordWithCategory[] = rawKeywords.map((kw) => {
        const cat = categoryMap.get(kw.category_id);
        return {
          ...kw,
          category_name: cat?.name,
          category_emoji: cat?.emoji,
          category_color: cat?.color,
        };
      });

      // Build word -> category name map for parser
      const keywordMap: Record<string, string> = {};
      for (const kw of rawKeywords) {
        const cat = categoryMap.get(kw.category_id);
        if (cat) {
          keywordMap[kw.word.toLowerCase()] = cat.name;
        }
      }

      const today = getTodayIndia();
      const startOfMonth = getStartOfMonth(today);
      const endOfMonth = getEndOfMonth(today);

      const [currentMonthTotals, todayTotals] = await Promise.all([
        repo.getTotalsByPeriod(startOfMonth, endOfMonth),
        repo.getTotalsByPeriod(today, today),
      ]);

      set({
        categories,
        groupedTransactions,
        keywords,
        keywordMap,
        currentMonthTotals,
        todayTotals,
        error: null,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load app data' });
    }
  },

  addTransaction: async (input: CreateTransactionInput) => {
    try {
      const repo = getRepository();
      const tx = await repo.addTransaction(input);
      await get().refresh();
      return tx;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to add transaction' });
      throw err;
    }
  },

  updateTransaction: async (id: string, updates: UpdateTransactionInput) => {
    try {
      const repo = getRepository();
      const tx = await repo.updateTransaction(id, updates);
      await get().refresh();
      return tx;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update transaction' });
      throw err;
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      const repo = getRepository();
      const existing = await repo.getTransaction(id);
      if (existing) {
        await repo.softDeleteTransaction(id);
        set({ lastDeletedTransaction: existing });
        await get().refresh();
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete transaction' });
      throw err;
    }
  },

  undoDelete: async () => {
    try {
      const last = get().lastDeletedTransaction;
      if (!last) return;
      const repo = getRepository();
      await repo.undoDeleteTransaction(last.id);
      set({ lastDeletedTransaction: null });
      await get().refresh();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to undo delete' });
    }
  },

  learnKeyword: async (word: string, categoryId: string) => {
    try {
      const cleanWord = word.trim().toLowerCase();
      if (!cleanWord || !categoryId) return;
      const repo = getRepository();
      await repo.setKeyword(cleanWord, categoryId);
      await get().refresh();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to save learned keyword' });
    }
  },

  deleteKeyword: async (id: string) => {
    try {
      const repo = getRepository();
      await repo.deleteKeyword(id);
      await get().refresh();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete learned keyword' });
    }
  },

  showBanner: (msg: string, durationMs = 3500) => {
    if (bannerTimeout) clearTimeout(bannerTimeout);
    set({ bannerMessage: msg });
    bannerTimeout = setTimeout(() => {
      set({ bannerMessage: null });
    }, durationMs);
  },

  clearBanner: () => {
    if (bannerTimeout) clearTimeout(bannerTimeout);
    set({ bannerMessage: null });
  },

  clearError: () => set({ error: null }),
}));
