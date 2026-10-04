/**
 * Database Adapter interface and implementations.
 * Enables running exact SQLite queries on device (via expo-sqlite) and in tests (via sql.js).
 */

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

/**
 * Expo SQLite adapter wrapping SQLiteDatabase from expo-sqlite.
 */
export class ExpoDatabaseAdapter implements DatabaseAdapter {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async runAsync(sql: string, params: any[] = []): Promise<RunResult> {
    const res = await this.db.runAsync(sql, params);
    return {
      changes: res.changes ?? 0,
      lastInsertRowId: res.lastInsertRowId ?? 0,
    };
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    return await this.db.getAllAsync(sql, params);
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    const res = await this.db.getFirstAsync(sql, params);
    return res ?? null;
  }

  async execAsync(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    return await this.db.withTransactionAsync(task);
  }

  async closeAsync(): Promise<void> {
    if (this.db?.closeAsync) {
      await this.db.closeAsync();
    }
  }
}

/**
 * WebAssembly SQLite (sql.js) adapter for Jest tests in Node.
 */
export class SqlJsDatabaseAdapter implements DatabaseAdapter {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async runAsync(sql: string, params: any[] = []): Promise<RunResult> {
    const stmt = this.db.prepare(sql);
    stmt.run(params);
    stmt.free();

    const info = this.db.exec('SELECT changes() as c, last_insert_rowid() as id;');
    const changes = info[0]?.values[0]?.[0] ?? 0;
    const lastInsertRowId = info[0]?.values[0]?.[1] ?? 0;

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
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = await task();
      this.db.exec('COMMIT;');
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
