import { create } from 'zustand';
import {
  Category,
  DayGroup,
  PeriodTotals,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../domain/types';
import { getRepository, initDatabase } from '../db';
import { getTodayIndia, getStartOfMonth, getEndOfMonth } from '../domain/dates';

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  categories: Category[];
  groupedTransactions: DayGroup[];
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
  clearError: () => void;
}

const emptyTotals: PeriodTotals = {
  totalExpensePaise: 0,
  totalIncomePaise: 0,
  netPaise: 0,
  count: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  error: null,
  categories: [],
  groupedTransactions: [],
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
        currentMonthTotals,
        todayTotals,
        error: null,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load transactions' });
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
      const repo = getRepository();
      await repo.setKeyword(word, categoryId);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to save learned keyword' });
    }
  },

  clearError: () => set({ error: null }),
}));
