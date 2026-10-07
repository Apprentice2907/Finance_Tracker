/**
 * Database schema migration runner for Wini.
 * Where it fits: Runs automatically on app start before any queries execute, ensuring
 * the SQLite database matches the code's expected schema version.
 *
 * Beginner note: What is a migration? When you release an update in the future (e.g. adding
 * a new column in v2), existing users already have data on their phones! You cannot just
 * delete and recreate the database. A migration checks SQLite's internal version number
 * (`PRAGMA user_version`) and runs only the SQL updates needed to bring the database up to date.
 */

import { DatabaseAdapter } from './adapter';
import {
  CREATE_CATEGORIES_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_TRANSACTIONS_INDEXES,
  CREATE_KEYWORD_MAP_TABLE,
  CREATE_SETTINGS_TABLE,
  CREATE_VOICE_LOG_TABLE,
  CREATE_VOICE_LOG_INDEXES,
  CREATE_ACCOUNTS_TABLE,
  CREATE_ACCOUNTS_INDEXES,
  CREATE_ACCOUNT_VALUATIONS_TABLE,
  CREATE_ACCOUNT_VALUATIONS_INDEXES,
  CREATE_VAULT_BANK_TABLE,
  CREATE_VAULT_CARDS_TABLE,
  DEFAULT_ACCOUNTS,
} from './schema';
import { DEFAULT_CATEGORIES } from '../domain/categories';
import { generateId } from '../domain/id';

export async function migrateDatabase(db: DatabaseAdapter): Promise<void> {
  // PRAGMA user_version stores a single integer (0, 1, 2...) inside the SQLite file header.
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(CREATE_CATEGORIES_TABLE);
    await db.execAsync(CREATE_TRANSACTIONS_TABLE);

    for (const indexSql of CREATE_TRANSACTIONS_INDEXES) {
      await db.execAsync(indexSql);
    }

    await db.execAsync(CREATE_KEYWORD_MAP_TABLE);
    await db.execAsync(CREATE_SETTINGS_TABLE);

    // Seed default categories
    const now = new Date().toISOString();
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, emoji, icon, color, kind, sort_order, is_system, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [
          cat.id,
          cat.name,
          cat.emoji,
          cat.icon || 'ellipsis-horizontal',
          cat.color,
          cat.kind,
          cat.sort_order,
          cat.id === 'cat-other' || cat.id === 'cat-income' || cat.id === 'cat_other' || cat.id === 'cat_income' ? 1 : 0,
          now,
          now,
        ]
      );
    }


    // Seed default settings
    const deviceId = generateId();
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('device_id', ?);`, [deviceId]);
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');`);
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_done', '0');`);

    await db.execAsync(`PRAGMA user_version = 1;`);
  }

  if (currentVersion < 2) {
    // Migration to v2: Voice logging and speech settings
    await db.execAsync(CREATE_VOICE_LOG_TABLE);
    for (const indexSql of CREATE_VOICE_LOG_INDEXES) {
      await db.execAsync(indexSql);
    }

    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('keep_voice_log', '1');`);
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('prefer_on_device', '1');`);
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('voice_engine', 'expo');`);

    await db.execAsync(`PRAGMA user_version = 2;`);
  }

  if (currentVersion < 3) {
    // Migration to Wini v2:
    // 1. Snapshot existing data into backup tables
    // 2. Wrap all schema alterations in a single SQL transaction
    // 3. Add accounts, valuations, vault tables, is_system, and account_id
    // 4. Seed default accounts (Cash, HDFC Bank) and v2 settings
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      // Step 1: Snapshot existing tables before modification
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS _v2_migration_snapshot_categories AS SELECT * FROM categories;
        CREATE TABLE IF NOT EXISTS _v2_migration_snapshot_transactions AS SELECT * FROM transactions;
        CREATE TABLE IF NOT EXISTS _v2_migration_snapshot_settings AS SELECT * FROM settings;
      `);

      // Step 2: Add is_system to categories if missing
      const categoryColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories);');
      const hasIsSystem = categoryColumns.some((col) => col.name === 'is_system');
      if (!hasIsSystem) {
        await db.execAsync('ALTER TABLE categories ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;');
      }

      // Mark default fallback categories as system categories
      await db.execAsync(`
        UPDATE categories SET is_system = 1 WHERE id IN ('cat-other', 'cat-income', 'cat_other', 'cat_income');
      `);

      // Step 3: Create Accounts table & indexes
      await db.execAsync(CREATE_ACCOUNTS_TABLE);
      for (const indexSql of CREATE_ACCOUNTS_INDEXES) {
        await db.execAsync(indexSql);
      }

      // Step 4: Create Account Valuations table & indexes
      await db.execAsync(CREATE_ACCOUNT_VALUATIONS_TABLE);
      for (const indexSql of CREATE_ACCOUNT_VALUATIONS_INDEXES) {
        await db.execAsync(indexSql);
      }

      // Step 5: Create Vault tables
      await db.execAsync(CREATE_VAULT_BANK_TABLE);
      await db.execAsync(CREATE_VAULT_CARDS_TABLE);

      // Step 6: Add account_id to transactions if missing
      const txColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions);');
      const hasAccountId = txColumns.some((col) => col.name === 'account_id');
      if (!hasAccountId) {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN account_id TEXT REFERENCES accounts(id);');
      }
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);');

      // Step 7: Seed default accounts if none exist
      const now = new Date().toISOString();
      for (const acc of DEFAULT_ACCOUNTS) {
        await db.runAsync(
          `INSERT OR IGNORE INTO accounts (
            id, name, type, institution, opening_balance_paise, current_value_paise,
            valuation_updated_at, include_in_total, sort_order, aliases_json, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
          [
            acc.id,
            acc.name,
            acc.type,
            acc.institution,
            acc.opening_balance_paise,
            acc.current_value_paise,
            acc.valuation_updated_at,
            acc.include_in_total,
            acc.sort_order,
            acc.aliases_json,
            now,
            now,
          ]
        );
      }

      // Step 8: Seed v2 settings keys
      const defaultSettings: [string, string][] = [
        ['auto_add_mode', 'sure'],
        ['auto_add_limit_paise', '200000'], // ₹2,000 limit for auto-add
        ['default_account_id', 'acc_cash'],
        ['quarter_basis', 'calendar'],
        ['backup_auto', '1'],
        ['backup_format', 'csv'],
        ['backup_folder_uri', ''],
        ['last_backup_at', ''],
        ['backup_keep_count', '6'],
        ['allow_sensitive_card_fields', '1'],
        ['speech_silence_ms', '1000'],
      ];

      for (const [key, value] of defaultSettings) {
        await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);`, [key, value]);
      }

      // Step 9: Finalize v3 version and commit
      await db.execAsync(`PRAGMA user_version = 3;`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  if (currentVersion < 4) {
    // Migration v4: Clean up snapshot tables and ensure only Cash is default seeded account
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      // Step 1: Drop temporary migration snapshot tables
      await db.execAsync(`
        DROP TABLE IF EXISTS _v2_migration_snapshot_categories;
        DROP TABLE IF EXISTS _v2_migration_snapshot_transactions;
        DROP TABLE IF EXISTS _v2_migration_snapshot_settings;
      `);

      // Step 2: Remove unreferenced HDFC Bank if it was seeded previously
      await db.runAsync(`
        DELETE FROM accounts
        WHERE id = 'acc_hdfc'
          AND NOT EXISTS (SELECT 1 FROM transactions WHERE account_id = 'acc_hdfc');
      `);

      await db.execAsync(`PRAGMA user_version = 4;`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  if (currentVersion < 5) {
    // Migration v5: Add icon column to categories and backfill from emoji (WINI_DESIGN_DECISIONS.md 1.4)
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      // Step 1: Add icon column to categories if missing
      const categoryColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories);');
      const hasIcon = categoryColumns.some((col) => col.name === 'icon');
      if (!hasIcon) {
        await db.execAsync("ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'ellipsis-horizontal';");
      }

      // Step 2: Backfill icon values for all existing categories using mapEmojiOrNameToIcon
      const allCategories = await db.getAllAsync<{ id: string; name: string; emoji: string }>(
        'SELECT id, name, emoji FROM categories;'
      );

      const { mapEmojiOrNameToIcon } = await import('../domain/categories');
      for (const cat of allCategories) {
        const iconKey = mapEmojiOrNameToIcon(cat.emoji || cat.name);
        await db.runAsync('UPDATE categories SET icon = ? WHERE id = ?;', [iconKey, cat.id]);
      }

      await db.execAsync(`PRAGMA user_version = 5;`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  if (currentVersion < 6) {
    // Migration v6: Add timings_json column to voice_log if missing
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      const voiceLogColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(voice_log);');
      const hasTimings = voiceLogColumns.some((col) => col.name === 'timings_json');
      if (!hasTimings) {
        await db.execAsync('ALTER TABLE voice_log ADD COLUMN timings_json TEXT;');
      }
      await db.execAsync(`PRAGMA user_version = 6;`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}



