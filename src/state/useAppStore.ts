/**
 * Zustand global application state store for Wini.
 * Where it fits: Sits between the SQLite `Repository` and all UI screens in `app/`.
 *
 * Beginner note: What is a "Store"? In React, sharing data across many screens by passing
 * props down component trees ("prop drilling") quickly becomes messy. A state store is
 * a single shared object. Any screen can read `currentMonthTotals` or call `addTransaction()`,
 * and React will automatically re-render only the components that care about that data.
 */

import { create } from 'zustand';
import {
  Category,
  DayGroup,
  PeriodTotals,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  KeywordMapEntry,
  VoiceLogEntry,
  CreateVoiceLogInput,
} from '../domain/types';
import { getRepository, initDatabase } from '../db';
import {
  getTodayIndia,
  getStartOfMonth,
  getEndOfMonth,
  getPreviousMonthRange,
  getPast7DaysRange,
  formatDayShort,
  getDateRangeList,
} from '../domain/dates';

export interface KeywordWithCategory extends KeywordMapEntry {
  category_name?: string;
  category_emoji?: string;
  category_icon?: string;
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
  previousMonthTotals: PeriodTotals;
  changeVsLastMonthPercent: number | null;
  todayTotals: PeriodTotals;
  lastDeletedTransaction: Transaction | null;
  keepVoiceLog: boolean;
  preferOnDevice: boolean;
  voiceEngine: string;
  whisperModel: string;
  whisperLanguage: string;
  autoAddMode: import('../domain/autoAdd').AutoAddMode;
  autoAddLimitPaise: number;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setAutoAddMode: (mode: import('../domain/autoAdd').AutoAddMode) => Promise<void>;
  setAutoAddLimitPaise: (limitPaise: number) => Promise<void>;
  toggleKeepVoiceLog: (val: boolean) => Promise<void>;
  togglePreferOnDevice: (val: boolean) => Promise<void>;
  setVoiceEngine: (engine: string) => Promise<void>;
  setWhisperModel: (model: string) => Promise<void>;
  setWhisperLanguage: (lang: string) => Promise<void>;
  addVoiceLog: (input: CreateVoiceLogInput) => Promise<VoiceLogEntry | null>;
  updateVoiceLogSaved: (id: string, finalSavedJson: string, corrected: boolean) => Promise<void>;
  clearVoiceLogs: () => Promise<void>;
  getVoiceLogs: (limit?: number) => Promise<VoiceLogEntry[]>;
  getInsightsData: (period: 'week' | 'month') => Promise<InsightsData>;
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

export interface InsightsData {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalExpensePaise: number;
  totalIncomePaise: number;
  dailyBars: { date: string; label: string; amountPaise: number }[];
  categoryBreakdown: {
    categoryId: string;
    name: string;
    emoji: string;
    icon?: string;
    color: string;
    amountPaise: number;
    percentage: number;
  }[];
  avgPerDayPaise: number;
  biggestExpense: {
    amountPaise: number;
    note: string;
    categoryName: string;
    emoji: string;
    date: string;
  } | null;
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
  previousMonthTotals: emptyTotals,
  changeVsLastMonthPercent: null,
  todayTotals: emptyTotals,
  lastDeletedTransaction: null,
  keepVoiceLog: true,
  preferOnDevice: true,
  voiceEngine: 'expo',
  whisperModel: 'base',
  whisperLanguage: 'en',
  autoAddMode: 'sure',
  autoAddLimitPaise: 200000,

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

  setAutoAddMode: async (mode: import('../domain/autoAdd').AutoAddMode) => {
    const repo = getRepository();
    await repo.setSetting('auto_add_mode', mode);
    set({ autoAddMode: mode });
  },

  setAutoAddLimitPaise: async (limitPaise: number) => {
    const repo = getRepository();
    await repo.setSetting('auto_add_limit_paise', String(limitPaise));
    set({ autoAddLimitPaise: limitPaise });
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
          category_icon: cat?.icon,
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
      const prevMonthRange = getPreviousMonthRange(today);

      const [
        currentMonthTotals,
        todayTotals,
        previousMonthTotals,
        keepVoiceLogSetting,
        preferOnDeviceSetting,
        voiceEngineSetting,
        whisperModelSetting,
        whisperLanguageSetting,
        autoAddModeSetting,
        autoAddLimitSetting,
      ] = await Promise.all([
        repo.getTotalsByPeriod(startOfMonth, endOfMonth),
        repo.getTotalsByPeriod(today, today),
        repo.getTotalsByPeriod(prevMonthRange.startDate, prevMonthRange.endDate),
        repo.getSetting('keep_voice_log'),
        repo.getSetting('prefer_on_device'),
        repo.getSetting('voice_engine'),
        repo.getSetting('whisper_model'),
        repo.getSetting('whisper_language'),
        repo.getSetting('auto_add_mode'),
        repo.getSetting('auto_add_limit_paise'),
      ]);

      const keepVoiceLog = keepVoiceLogSetting !== '0';
      const preferOnDevice = preferOnDeviceSetting !== '0';
      const voiceEngine = voiceEngineSetting || 'expo';
      const whisperModel = whisperModelSetting || 'base';
      const whisperLanguage = whisperLanguageSetting || 'en';
      const autoAddMode = (autoAddModeSetting as import('../domain/autoAdd').AutoAddMode) || 'sure';
      const autoAddLimitPaise = autoAddLimitSetting ? parseInt(autoAddLimitSetting, 10) : 200000;

      let changeVsLastMonthPercent: number | null = null;
      if (previousMonthTotals.totalExpensePaise > 0) {
        const diff = currentMonthTotals.totalExpensePaise - previousMonthTotals.totalExpensePaise;
        changeVsLastMonthPercent = Math.round((diff / previousMonthTotals.totalExpensePaise) * 100);
      }

      set({
        categories,
        groupedTransactions,
        keywords,
        keywordMap,
        currentMonthTotals,
        previousMonthTotals,
        changeVsLastMonthPercent,
        todayTotals,
        keepVoiceLog,
        preferOnDevice,
        voiceEngine,
        whisperModel,
        whisperLanguage,
        autoAddMode,
        autoAddLimitPaise,
        error: null,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load app data' });
    }
  },

  getInsightsData: async (period: 'week' | 'month'): Promise<InsightsData> => {
    const repo = getRepository();
    const today = getTodayIndia();

    let startDate: string;
    let endDate: string;

    if (period === 'week') {
      const range = getPast7DaysRange();
      startDate = range.startDate;
      endDate = range.endDate;
    } else {
      startDate = getStartOfMonth(today);
      endDate = getEndOfMonth(today);
    }

    const [txs, categoryTotals, periodTotals] = await Promise.all([
      repo.listTransactions({ startDate, endDate }),
      repo.getTotalsByCategory(startDate, endDate, 'expense'),
      repo.getTotalsByPeriod(startDate, endDate),
    ]);

    // Build daily bars
    const dates = getDateRangeList(startDate, endDate);
    const dayTotalsMap: Record<string, number> = {};
    for (const d of dates) {
      dayTotalsMap[d] = 0;
    }

    let biggestExpense: InsightsData['biggestExpense'] = null;
    let maxExpensePaise = 0;

    for (const tx of txs) {
      if (tx.type === 'expense') {
        dayTotalsMap[tx.occurred_on] = (dayTotalsMap[tx.occurred_on] || 0) + tx.amount_paise;
        if (tx.amount_paise > maxExpensePaise) {
          maxExpensePaise = tx.amount_paise;
          biggestExpense = {
            amountPaise: tx.amount_paise,
            note: tx.note,
            categoryName: tx.category_name || 'General',
            emoji: tx.category_emoji || '✨',
            date: tx.occurred_on,
          };
        }
      }
    }

    const dailyBars = dates.map((d) => ({
      date: d,
      label: period === 'week' ? formatDayShort(d) : String(parseInt(d.split('-')[2], 10)),
      amountPaise: dayTotalsMap[d] || 0,
    }));

    // Top categories with percentages
    const totalExpense = periodTotals.totalExpensePaise;
    const categoryBreakdown = categoryTotals.map((c) => ({
      categoryId: c.category_id,
      name: c.category_name,
      emoji: c.category_emoji,
      icon: c.category_icon,
      color: c.category_color,
      amountPaise: c.total_paise,
      percentage: totalExpense > 0 ? Math.round((c.total_paise / totalExpense) * 100) : 0,
    }));

    // Average per day
    const dayCount = period === 'week' ? 7 : Math.max(1, parseInt(today.split('-')[2], 10));
    const avgPerDayPaise = Math.round(totalExpense / dayCount);

    return {
      period,
      startDate,
      endDate,
      totalExpensePaise: totalExpense,
      totalIncomePaise: periodTotals.totalIncomePaise,
      dailyBars,
      categoryBreakdown,
      avgPerDayPaise,
      biggestExpense,
    };
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

  toggleKeepVoiceLog: async (val: boolean) => {
    const repo = getRepository();
    await repo.setSetting('keep_voice_log', val ? '1' : '0');
    set({ keepVoiceLog: val });
  },

  togglePreferOnDevice: async (val: boolean) => {
    const repo = getRepository();
    await repo.setSetting('prefer_on_device', val ? '1' : '0');
    set({ preferOnDevice: val });
  },

  setVoiceEngine: async (engine: string) => {
    const repo = getRepository();
    await repo.setSetting('voice_engine', engine);
    set({ voiceEngine: engine });
  },

  setWhisperModel: async (model: string) => {
    const repo = getRepository();
    await repo.setSetting('whisper_model', model);
    set({ whisperModel: model });
  },

  setWhisperLanguage: async (lang: string) => {
    const repo = getRepository();
    await repo.setSetting('whisper_language', lang);
    set({ whisperLanguage: lang });
  },

  addVoiceLog: async (input: CreateVoiceLogInput) => {
    if (!get().keepVoiceLog) return null;
    const repo = getRepository();
    return repo.addVoiceLog(input);
  },

  updateVoiceLogSaved: async (id: string, finalSavedJson: string, corrected: boolean) => {
    if (!get().keepVoiceLog) return;
    const repo = getRepository();
    await repo.updateVoiceLogSaved(id, finalSavedJson, corrected);
  },

  clearVoiceLogs: async () => {
    const repo = getRepository();
    await repo.clearVoiceLogs();
  },

  getVoiceLogs: async (limit = 100) => {
    const repo = getRepository();
    return repo.getVoiceLogs(limit);
  },

  clearError: () => set({ error: null }),
}));
