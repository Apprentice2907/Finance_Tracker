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
  CURRENT_SCHEMA_VERSION,
  CREATE_CATEGORIES_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_TRANSACTIONS_INDEXES,
  CREATE_KEYWORD_MAP_TABLE,
  CREATE_SETTINGS_TABLE,
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
        `INSERT OR IGNORE INTO categories (id, name, emoji, color, kind, sort_order, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [cat.id, cat.name, cat.emoji, cat.color, cat.kind, cat.sort_order, now, now]
      );
    }

    // Seed default settings
    const deviceId = generateId();
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('device_id', ?);`, [deviceId]);
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');`);
    await db.runAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_done', '0');`);

    await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
  }
}
