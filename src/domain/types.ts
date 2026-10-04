/**
 * Central TypeScript types and domain contracts for Wini.
 * Where it fits: This file is the single source of truth for data shapes used across
 * the database, state store, UI screens, and backup system.
 *
 * Beginner note: TypeScript "types" and "interfaces" are like blueprints. They don't
 * run at runtime on the phone, but while writing code they ensure you never misspell
 * a field name or pass an unexpected data structure.
 */

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
  // Soft delete: when deleted, we set a timestamp instead of dropping the row.
  // This allows instant Undo and prevents broken foreign keys.
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  // WHY integer paise? JavaScript numbers are 64-bit floats. 0.1 + 0.2 equals
  // 0.30000000000000004! By storing paise (₹10 = 1000 paise), we work strictly
  // with whole integers, making financial calculations 100% bug-free.
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

export interface VoiceLogEntry {
  id: string;
  engine: string;
  raw_transcript: string;
  alternatives_json: string;
  parsed_json: string;
  final_saved_json: string | null;
  corrected: boolean | number;
  latency_ms: number;
  created_at: string;
}

export interface CreateVoiceLogInput {
  id?: string;
  engine: string;
  raw_transcript: string;
  alternatives_json?: string;
  parsed_json: string;
  final_saved_json?: string | null;
  corrected?: boolean;
  latency_ms?: number;
  created_at?: string;
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
