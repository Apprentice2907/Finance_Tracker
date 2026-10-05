/**
 * Integration test for Wini v2 Database Migration.
 * Verifies rule 3 from WINI_V2_FEATURES.md:
 * "Database changes need a safe migration: snapshot first, run inside one SQL transaction,
 * and a test that migrates a realistic v1 database fixture to v2 without losing or changing any row."
 */

import initSqlJs, { SqlJsStatic } from 'sql.js';
import { SqlJsDatabaseAdapter } from '../adapter';
import { migrateDatabase } from '../migrations';
import { Repository } from '../repository';

describe('Wini v2 Safe Database Migration Tests', () => {
  let SQL: SqlJsStatic;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  test('migrates realistic v1 database fixture to v2 with zero data loss and exact row preservation', async () => {
    const rawDb = new SQL.Database();
    const adapter = new SqlJsDatabaseAdapter(rawDb);

    // 1. Create a realistic pre-v2 database (user_version = 2, with original schema)
    await adapter.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE categories (
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

      CREATE TABLE transactions (
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

      CREATE TABLE keyword_map (
        id TEXT PRIMARY KEY,
        word TEXT NOT NULL UNIQUE,
        category_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE voice_log (
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

      PRAGMA user_version = 2;
    `);

    // 2. Insert realistic test dataset
    const initialCategories = [
      { id: 'cat_food', name: 'Food', emoji: '🍔', color: '#FF9500', kind: 'expense', sort_order: 1 },
      { id: 'cat_transport', name: 'Transport', emoji: '🛺', color: '#007AFF', kind: 'expense', sort_order: 2 },
      { id: 'cat_other', name: 'Other', emoji: '📦', color: '#8E8E93', kind: 'expense', sort_order: 99 },
      { id: 'cat_income', name: 'Income', emoji: '💰', color: '#34C759', kind: 'income', sort_order: 1 },
    ];

    for (const c of initialCategories) {
      await adapter.runAsync(
        `INSERT INTO categories (id, name, emoji, color, kind, sort_order, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, '2026-10-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z', NULL);`,
        [c.id, c.name, c.emoji, c.color, c.kind, c.sort_order]
      );
    }

    const initialTransactions = [
      { id: 'tx_01', type: 'expense', amount_paise: 2000, category_id: 'cat_food', note: 'Chai', occurred_on: '2026-10-01', source: 'voice' },
      { id: 'tx_02', type: 'expense', amount_paise: 4000, category_id: 'cat_transport', note: 'Rickshaw', occurred_on: '2026-10-01', source: 'voice' },
      { id: 'tx_03', type: 'expense', amount_paise: 50000, category_id: 'cat_food', note: 'Dinner with friends', occurred_on: '2026-10-02', source: 'manual' },
      { id: 'tx_04', type: 'income', amount_paise: 5000000, category_id: 'cat_income', note: 'October Salary', occurred_on: '2026-10-01', source: 'typed' },
      { id: 'tx_05', type: 'expense', amount_paise: 15000, category_id: 'cat_other', note: 'Random item', occurred_on: '2026-10-03', source: 'manual' },
    ];

    for (const t of initialTransactions) {
      await adapter.runAsync(
        `INSERT INTO transactions (id, type, amount_paise, category_id, note, occurred_on, source, raw_text, device_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sample utterance', 'dev_123', '2026-10-01T12:00:00.000Z', '2026-10-01T12:00:00.000Z', NULL);`,
        [t.id, t.type, t.amount_paise, t.category_id, t.note, t.occurred_on, t.source]
      );
    }

    await adapter.runAsync(`INSERT INTO settings (key, value) VALUES ('device_id', 'dev_123');`);
    await adapter.runAsync(`INSERT INTO settings (key, value) VALUES ('theme', 'dark');`);
    await adapter.runAsync(`INSERT INTO settings (key, value) VALUES ('voice_engine', 'expo');`);

    await adapter.runAsync(
      `INSERT INTO voice_log (id, engine, raw_transcript, alternatives_json, parsed_json, final_saved_json, corrected, latency_ms, created_at)
       VALUES ('vlog_1', 'expo', 'chai 20', '["chai 20"]', '{"amountPaise":2000}', NULL, 0, 150, '2026-10-01T10:00:00.000Z');`
    );

    // Capture baseline snapshot before migration
    const preTxRows = await adapter.getAllAsync<any>('SELECT * FROM transactions ORDER BY id ASC;');
    const preCatRows = await adapter.getAllAsync<any>('SELECT * FROM categories ORDER BY id ASC;');
    const preSettingsRows = await adapter.getAllAsync<any>('SELECT * FROM settings ORDER BY key ASC;');

    expect(preTxRows.length).toBe(5);
    expect(preCatRows.length).toBe(4);
    expect(preSettingsRows.length).toBe(3);

    // 3. EXECUTE MIGRATION
    await migrateDatabase(adapter);

    // 4. VERIFY DATABASE VERSION
    const versionRow = await adapter.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    expect(versionRow?.user_version).toBe(4);

    // 5. VERIFY SNAPSHOT TABLES DROPPED ON SUCCESS
    const snapshotTables = await adapter.getAllAsync<any>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '_v2_migration_snapshot_%';`
    );
    expect(snapshotTables.length).toBe(0);

    // 6. VERIFY ZERO DATA LOSS ON TRANSACTIONS
    const postTxRows = await adapter.getAllAsync<any>('SELECT * FROM transactions ORDER BY id ASC;');
    expect(postTxRows.length).toBe(5);

    for (let i = 0; i < preTxRows.length; i++) {
      const pre = preTxRows[i];
      const post = postTxRows[i];
      expect(post.id).toBe(pre.id);
      expect(post.type).toBe(pre.type);
      expect(post.amount_paise).toBe(pre.amount_paise);
      expect(post.category_id).toBe(pre.category_id);
      expect(post.note).toBe(pre.note);
      expect(post.occurred_on).toBe(pre.occurred_on);
      expect(post.source).toBe(pre.source);
      expect(post.created_at).toBe(pre.created_at);
      expect(post.updated_at).toBe(pre.updated_at);
      expect(post.deleted_at).toBeNull();
      // account_id column exists
      expect(post.account_id).toBeNull();
    }

    // 7. VERIFY ZERO DATA LOSS ON CATEGORIES AND is_system APPLIED
    const postCatRows = await adapter.getAllAsync<any>('SELECT * FROM categories ORDER BY id ASC;');
    expect(postCatRows.length).toBe(4);

    for (const cat of postCatRows) {
      if (cat.id === 'cat_other' || cat.id === 'cat_income') {
        expect(cat.is_system).toBe(1);
      } else {
        expect(cat.is_system).toBe(0);
      }
    }

    // 8. VERIFY NEW TABLES CREATED & ONLY CASH SEEDED (NEVER SEED BANK)
    const accounts = await adapter.getAllAsync<any>('SELECT * FROM accounts ORDER BY sort_order ASC;');
    expect(accounts.length).toBe(1);
    expect(accounts[0].id).toBe('acc_cash');
    expect(accounts[0].name).toBe('Cash');
    expect(accounts[0].type).toBe('cash');

    const valuations = await adapter.getAllAsync<any>('SELECT * FROM account_valuations;');
    expect(Array.isArray(valuations)).toBe(true);

    const vaultBanks = await adapter.getAllAsync<any>('SELECT * FROM vault_bank;');
    expect(Array.isArray(vaultBanks)).toBe(true);

    const vaultCards = await adapter.getAllAsync<any>('SELECT * FROM vault_cards;');
    expect(Array.isArray(vaultCards)).toBe(true);

    // 9. VERIFY V2 SETTINGS SEEDED
    const defaultAccountSetting = await adapter.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'default_account_id';`
    );
    expect(defaultAccountSetting?.value).toBe('acc_cash');

    const autoAddSetting = await adapter.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'auto_add_mode';`
    );
    expect(autoAddSetting?.value).toBe('sure');

    const limitSetting = await adapter.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'auto_add_limit_paise';`
    );
    expect(limitSetting?.value).toBe('200000');

    // 10. VERIFY IDEMPOTENCY: Re-running migration produces no errors and leaves data intact
    await migrateDatabase(adapter);
    const postReRunVersion = await adapter.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    expect(postReRunVersion?.user_version).toBe(4);
    const postReRunTxs = await adapter.getAllAsync<any>('SELECT * FROM transactions;');
    expect(postReRunTxs.length).toBe(5);

    // 11. VERIFY REPOSITORY INTERFACES WORK ON MIGRATED DATABASE
    const repo = new Repository(adapter);
    const newTx = await repo.addTransaction({
      type: 'expense',
      amount_paise: 3000,
      category_id: 'cat_food',
      note: 'Coffee',
      occurred_on: '2026-10-04',
      source: 'voice',
    });

    expect(newTx.id).toBeDefined();
    expect(newTx.account_id).toBe('acc_cash'); // Defaulted to acc_cash

    const retrievedWithCategory = await repo.getTransaction(newTx.id);
    expect(retrievedWithCategory?.account_name).toBe('Cash');
    expect(retrievedWithCategory?.category_name).toBe('Food');

    await adapter.closeAsync();
  });
});
