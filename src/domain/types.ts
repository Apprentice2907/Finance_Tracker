export type CategoryKind = 'expense' | 'income';
export type TransactionType = 'expense' | 'income';
export type TransactionSource = 'voice' | 'typed' | 'manual';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  kind: CategoryKind;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount_paise: number;
  category_id: string;
  note: string;
  occurred_on: string; // YYYY-MM-DD
  source: TransactionSource;
  raw_text: string | null;
  device_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TransactionWithCategory extends Transaction {
  category_name?: string;
  category_emoji?: string;
  category_color?: string;
}

export interface KeywordMapEntry {
  id: string;
  word: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

export interface SettingEntry {
  key: string;
  value: string;
}

export interface PeriodTotals {
  totalExpensePaise: number;
  totalIncomePaise: number;
  netPaise: number;
  count: number;
}

export interface CategoryTotal {
  category_id: string;
  category_name: string;
  category_emoji: string;
  category_color: string;
  total_paise: number;
  count: number;
  percentage?: number;
}

export interface DayGroup {
  date: string;
  displayDate: string;
  transactions: TransactionWithCategory[];
  totalExpensePaise: number;
  totalIncomePaise: number;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount_paise: number;
  category_id: string;
  note: string;
  occurred_on: string;
  source: TransactionSource;
  raw_text?: string | null;
  device_id?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount_paise?: number;
  category_id?: string;
  note?: string;
  occurred_on?: string;
  source?: TransactionSource;
  raw_text?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  emoji: string;
  color: string;
  kind: CategoryKind;
  sort_order?: number;
}

export interface BackupData {
  app: 'wini';
  schemaVersion: number;
  exportedAt: string;
  deviceId: string;
  categories: Category[];
  transactions: Transaction[];
  keywordMap: KeywordMapEntry[];
}
