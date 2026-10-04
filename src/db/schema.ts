/**
 * SQLite table schemas and index creation statements for Wini.
 * Where it fits: Defines the physical structure of tables inside the local SQLite file.
 *
 * Beginner note: SQLite is an embedded database engine that stores all data inside
 * a single file on the user's phone. No database server is needed!
 * A "schema" is the structure of tables, columns, and rules (like CHECK constraints).
 */

export const CURRENT_SCHEMA_VERSION = 2;

export const CREATE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('expense', 'income')),
  sort_order INTEGER NOT NULL DEFAULT 0,
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
  note TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('voice', 'typed', 'manual')),
  raw_text TEXT,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;

export const CREATE_TRANSACTIONS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);`,
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
