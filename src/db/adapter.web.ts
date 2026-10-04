/**
 * Web Database Adapter using WebAssembly SQLite (sql.js).
 * Where it fits: Used exclusively when running Wini on Web (browser).
 * Replaces ExpoDatabaseAdapter so the web bundle has zero dependencies on expo-sqlite.
 */

import { Database } from 'sql.js';

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface DatabaseAdapter {
  runAsync(sql: string, params?: any[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
  closeAsync?(): Promise<void>;
}

const STORAGE_KEY = 'wini_web_sqlite_db';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export class WebSqlJsDatabaseAdapter implements DatabaseAdapter {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const bytes = this.db.export();
      const b64 = uint8ArrayToBase64(bytes);
      window.localStorage.setItem(STORAGE_KEY, b64);
    } catch (err) {
      console.warn('Failed to save SQLite to localStorage:', err);
    }
  }

  async runAsync(sql: string, params: any[] = []): Promise<RunResult> {
    const stmt = this.db.prepare(sql);
    stmt.run(params);
    stmt.free();

    const info = this.db.exec('SELECT changes() as c, last_insert_rowid() as id;');
    const changes = info[0]?.values[0]?.[0] ?? 0;
    const lastInsertRowId = info[0]?.values[0]?.[1] ?? 0;

    this.persist();

    return {
      changes: Number(changes),
      lastInsertRowId: Number(lastInsertRowId),
    };
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
    this.persist();
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = await task();
      this.db.exec('COMMIT;');
      this.persist();
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async closeAsync(): Promise<void> {
    if (this.db?.close) {
      this.db.close();
    }
  }
}

export { WebSqlJsDatabaseAdapter as SqlJsDatabaseAdapter };
