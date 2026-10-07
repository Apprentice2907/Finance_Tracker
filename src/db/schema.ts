/**
 * SQLite table schemas and index creation statements for Wini.
 * Where it fits: Defines the physical structure of tables inside the local SQLite file.
 *
 * Beginner note: SQLite is an embedded database engine that stores all data inside
 * a single file on the user's phone. No database server is needed!
 * A "schema" is the structure of tables, columns, and rules (like CHECK constraints).
 */

export const CURRENT_SCHEMA_VERSION = 5;

export const CREATE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'ellipsis-horizontal',
  color TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('expense', 'income')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;


export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
  amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
  category_id TEXT NOT NULL,
  account_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('voice', 'typed', 'manual')),
  raw_text TEXT,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);
`;

export const CREATE_TRANSACTIONS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);`,
];

export const CREATE_KEYWORD_MAP_TABLE = `
CREATE TABLE IF NOT EXISTS keyword_map (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const CREATE_VOICE_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS voice_log (
  id TEXT PRIMARY KEY,
  engine TEXT NOT NULL,
  raw_transcript TEXT NOT NULL,
  alternatives_json TEXT NOT NULL DEFAULT '[]',
  parsed_json TEXT NOT NULL,
  final_saved_json TEXT,
  corrected INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

export const CREATE_VOICE_LOG_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_voice_log_created_at ON voice_log(created_at);`,
];

// --- Wini v2: Accounts, Valuations, and Private Vault ---

export const CREATE_ACCOUNTS_TABLE = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank', 'cash', 'wallet', 'investment')),
  institution TEXT,
  opening_balance_paise INTEGER NOT NULL DEFAULT 0,
  current_value_paise INTEGER,
  valuation_updated_at TEXT,
  include_in_total INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;

export const CREATE_ACCOUNTS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at);`,
];

export const CREATE_ACCOUNT_VALUATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS account_valuations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  value_paise INTEGER NOT NULL,
  recorded_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);
`;

export const CREATE_ACCOUNT_VALUATIONS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_account_valuations_account_id ON account_valuations(account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_account_valuations_recorded_on ON account_valuations(recorded_on);`,
];

export const CREATE_VAULT_BANK_TABLE = `
CREATE TABLE IF NOT EXISTS vault_bank (
  id TEXT PRIMARY KEY,
  account_holder_name_encrypted TEXT,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT,
  ifsc_encrypted TEXT,
  customer_id_encrypted TEXT,
  upi_id_encrypted TEXT,
  branch TEXT,
  notes_encrypted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;

export const CREATE_VAULT_CARDS_TABLE = `
CREATE TABLE IF NOT EXISTS vault_cards (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  network TEXT NOT NULL CHECK(network IN ('visa', 'mastercard', 'rupay', 'amex', 'other')),
  holder_name_encrypted TEXT,
  card_number_encrypted TEXT NOT NULL,
  expiry_encrypted TEXT,
  cvv_encrypted TEXT,
  pin_encrypted TEXT,
  linked_account_id TEXT,
  billing_day INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;

export const DEFAULT_ACCOUNTS = [
  {
    id: 'acc_cash',
    name: 'Cash',
    type: 'cash' as const,
    institution: null,
    opening_balance_paise: 0,
    current_value_paise: null,
    valuation_updated_at: null,
    include_in_total: 1,
    sort_order: 1,
    aliases_json: JSON.stringify(['cash', 'nakad', 'pocket cash']),
  },
];

