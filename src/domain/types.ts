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
  is_system?: boolean | number;
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
  account_id?: string | null;
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
  account_name?: string;
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
  account_id?: string | null;
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
  account_id?: string | null;
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
  is_system?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  emoji?: string;
  color?: string;
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
  accounts?: Account[];
  accountValuations?: AccountValuation[];
}

// --- Accounts (Wini v2) ---

export type AccountType = 'bank' | 'cash' | 'wallet' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  opening_balance_paise: number;
  current_value_paise: number | null; // investments only, manual
  valuation_updated_at: string | null;
  include_in_total: boolean | number;
  sort_order: number;
  aliases_json: string; // JSON array of spoken aliases e.g. '["cash", "nakad"]'
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AccountValuation {
  id: string;
  account_id: string;
  value_paise: number;
  recorded_on: string;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  balance_paise: number;
}

export interface CreateAccountInput {
  id?: string;
  name: string;
  type: AccountType;
  institution?: string | null;
  opening_balance_paise?: number;
  current_value_paise?: number | null;
  include_in_total?: boolean;
  sort_order?: number;
  aliases?: string[];
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  institution?: string | null;
  opening_balance_paise?: number;
  current_value_paise?: number | null;
  include_in_total?: boolean;
  sort_order?: number;
  aliases?: string[];
}

export interface PassbookEntry {
  id: string;
  transaction: TransactionWithCategory;
  date: string;
  particulars: string;
  debitPaise: number | null;
  creditPaise: number | null;
  runningBalancePaise: number;
}

// --- Vault (Wini v2) ---

export interface VaultBank {
  id: string;
  account_holder_name_encrypted: string | null;
  bank_name: string;
  account_number_encrypted: string | null;
  ifsc_encrypted: string | null;
  customer_id_encrypted: string | null;
  upi_id_encrypted: string | null;
  branch: string | null;
  notes_encrypted: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateVaultBankInput {
  id?: string;
  account_holder_name_encrypted?: string | null;
  bank_name: string;
  account_number_encrypted?: string | null;
  ifsc_encrypted?: string | null;
  customer_id_encrypted?: string | null;
  upi_id_encrypted?: string | null;
  branch?: string | null;
  notes_encrypted?: string | null;
}

export interface UpdateVaultBankInput {
  account_holder_name_encrypted?: string | null;
  bank_name?: string;
  account_number_encrypted?: string | null;
  ifsc_encrypted?: string | null;
  customer_id_encrypted?: string | null;
  upi_id_encrypted?: string | null;
  branch?: string | null;
  notes_encrypted?: string | null;
}

export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'other';

export interface VaultCard {
  id: string;
  nickname: string;
  network: CardNetwork;
  holder_name_encrypted: string | null;
  card_number_encrypted: string;
  expiry_encrypted: string | null;
  cvv_encrypted: string | null;
  pin_encrypted: string | null;
  linked_account_id: string | null;
  billing_day: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateVaultCardInput {
  id?: string;
  nickname: string;
  network: CardNetwork;
  holder_name_encrypted?: string | null;
  card_number_encrypted: string;
  expiry_encrypted?: string | null;
  cvv_encrypted?: string | null;
  pin_encrypted?: string | null;
  linked_account_id?: string | null;
  billing_day?: number | null;
}

export interface UpdateVaultCardInput {
  nickname?: string;
  network?: CardNetwork;
  holder_name_encrypted?: string | null;
  card_number_encrypted?: string;
  expiry_encrypted?: string | null;
  cvv_encrypted?: string | null;
  pin_encrypted?: string | null;
  linked_account_id?: string | null;
  billing_day?: number | null;
}

// --- Reports (Wini v2) ---

export type ReportPeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type QuarterBasis = 'calendar' | 'indian_fy';

export interface PeriodReport {
  periodType: ReportPeriodType;
  periodKey: string;
  startDate: string;
  endDate: string;
  totalIncomePaise: number;
  totalExpensePaise: number;
  netPaise: number;
  savingsRate: number; // percentage, e.g. 24.5
  prevPeriod?: {
    totalIncomePaise: number;
    totalExpensePaise: number;
    netPaise: number;
    incomeChangePct: number;
    expenseChangePct: number;
    netChangePct: number;
  };
  cashflow: {
    date: string;
    incomePaise: number;
    expensePaise: number;
    netPaise: number;
  }[];
  categoryBreakdown: {
    category_id: string;
    category_name: string;
    category_emoji: string;
    category_color: string;
    kind: CategoryKind;
    total_paise: number;
    count: number;
    share_pct: number;
    average_paise: number;
  }[];
  insights: string[];
  topTransactions: TransactionWithCategory[];
}

