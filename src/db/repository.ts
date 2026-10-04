import { DatabaseAdapter } from './adapter';
import { migrateDatabase } from './migrations';
import {
  Category,
  CategoryKind,
  Transaction,
  TransactionWithCategory,
  TransactionType,
  KeywordMapEntry,
  PeriodTotals,
  CategoryTotal,
  DayGroup,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateCategoryInput,
  BackupData,
  VoiceLogEntry,
  CreateVoiceLogInput,
} from '../domain/types';
import { generateId } from '../domain/id';
import { formatDisplayDate } from '../domain/dates';

/**
 * SQLite Repository: The sole data-access layer for Wini.
 * Where it fits: Sits between the low-level SQLite database and the Zustand app store.
 *
 * WHY is this the ONLY file that touches SQLite?
 * Beginner note: Separation of Concerns! If UI components wrote raw SQL like
 * "SELECT * FROM transactions", any table or column rename would require editing dozens
 * of UI files. By wrapping all database queries inside this `Repository` class, the rest
 * of the app only works with clean TypeScript objects, and SQLite can be tested or swapped
 * in one single place.
 */

export class Repository {
  private db: DatabaseAdapter;
  private cachedDeviceId: string | null = null;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  async init(): Promise<void> {
    await migrateDatabase(this.db);
  }

  async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) return this.cachedDeviceId;
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'device_id';`
    );
    if (row?.value) {
      this.cachedDeviceId = row.value;
      return row.value;
    }
    const newId = generateId();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('device_id', ?);`,
      [newId]
    );
    this.cachedDeviceId = newId;
    return newId;
  }

  // --- Transactions ---

  async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
    if (!Number.isInteger(input.amount_paise) || input.amount_paise <= 0) {
      throw new Error('Transaction amount must be a positive integer in paise');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const deviceId = input.device_id || (await this.getDeviceId());

    await this.db.runAsync(
      `INSERT INTO transactions (
        id, type, amount_paise, category_id, note, occurred_on, source, raw_text, device_id, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        id,
        input.type,
        input.amount_paise,
        input.category_id,
        input.note.trim(),
        input.occurred_on,
        input.source,
        input.raw_text ?? null,
        deviceId,
        now,
        now,
      ]
    );

    return {
      id,
      type: input.type,
      amount_paise: input.amount_paise,
      category_id: input.category_id,
      note: input.note.trim(),
      occurred_on: input.occurred_on,
      source: input.source,
      raw_text: input.raw_text ?? null,
      device_id: deviceId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  }

  async updateTransaction(id: string, updates: UpdateTransactionInput): Promise<Transaction> {
    const existing = await this.getTransaction(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }

    if (updates.amount_paise !== undefined && (!Number.isInteger(updates.amount_paise) || updates.amount_paise <= 0)) {
      throw new Error('Transaction amount must be a positive integer in paise');
    }

    const now = new Date().toISOString();
    const updated: Transaction = {
      ...existing,
      type: updates.type ?? existing.type,
      amount_paise: updates.amount_paise ?? existing.amount_paise,
      category_id: updates.category_id ?? existing.category_id,
      note: updates.note !== undefined ? updates.note.trim() : existing.note,
      occurred_on: updates.occurred_on ?? existing.occurred_on,
      source: updates.source ?? existing.source,
      raw_text: updates.raw_text !== undefined ? updates.raw_text : existing.raw_text,
      updated_at: now,
    };

    await this.db.runAsync(
      `UPDATE transactions SET
        type = ?, amount_paise = ?, category_id = ?, note = ?, occurred_on = ?, source = ?, raw_text = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [
        updated.type,
        updated.amount_paise,
        updated.category_id,
        updated.note,
        updated.occurred_on,
        updated.source,
        updated.raw_text,
        updated.updated_at,
        id,
      ]
    );

    return updated;
  }

  // WHY soft delete? Instead of erasing the row with "DELETE FROM transactions",
  // we set deleted_at to the current timestamp. This keeps our data safe, enables
  // the instant "Undo" snackbar after deleting, and preserves financial audit history.
  async softDeleteTransaction(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
      [now, now, id]
    );
  }

  async undoDeleteTransaction(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ?;`,
      [now, id]
    );
  }

  async getTransaction(id: string): Promise<TransactionWithCategory | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT t.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.deleted_at IS NULL;`,
      [id]
    );
    return row ?? null;
  }

  async listTransactions(options?: {
    limit?: number;
    offset?: number;
    categoryId?: string;
    type?: TransactionType;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionWithCategory[]> {
    let sql = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (options?.categoryId) {
      sql += ` AND t.category_id = ?`;
      params.push(options.categoryId);
    }

    if (options?.type) {
      sql += ` AND t.type = ?`;
      params.push(options.type);
    }

    if (options?.startDate) {
      sql += ` AND t.occurred_on >= ?`;
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ` AND t.occurred_on <= ?`;
      params.push(options.endDate);
    }

    if (options?.search && options.search.trim().length > 0) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(t.note) LIKE ? OR LOWER(c.name) LIKE ?)`;
      params.push(q, q);
    }

    sql += ` ORDER BY t.occurred_on DESC, t.created_at DESC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
      if (options?.offset) {
        sql += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    return await this.db.getAllAsync<TransactionWithCategory>(sql, params);
  }

  async listTransactionsGroupedByDay(options?: {
    limitDays?: number;
    categoryId?: string;
    type?: TransactionType;
    search?: string;
  }): Promise<DayGroup[]> {
    const list = await this.listTransactions(options);
    const groupsMap = new Map<string, TransactionWithCategory[]>();

    for (const tx of list) {
      const day = tx.occurred_on;
      if (!groupsMap.has(day)) {
        groupsMap.set(day, []);
      }
      groupsMap.get(day)!.push(tx);
    }

    const sortedDays = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));
    const limitedDays = options?.limitDays ? sortedDays.slice(0, options.limitDays) : sortedDays;

    return limitedDays.map((day) => {
      const dayTxs = groupsMap.get(day)!;
      let totalExpensePaise = 0;
      let totalIncomePaise = 0;

      for (const t of dayTxs) {
        if (t.type === 'expense') totalExpensePaise += t.amount_paise;
        else if (t.type === 'income') totalIncomePaise += t.amount_paise;
      }

      return {
        date: day,
        displayDate: formatDisplayDate(day),
        transactions: dayTxs,
        totalExpensePaise,
        totalIncomePaise,
      };
    });
  }

  async getTotalsByPeriod(startDate: string, endDate: string): Promise<PeriodTotals> {
    const rows = await this.db.getAllAsync<{ type: TransactionType; total_paise: number; count: number }>(
      `SELECT type, SUM(amount_paise) as total_paise, COUNT(*) as count
       FROM transactions
       WHERE deleted_at IS NULL AND occurred_on >= ? AND occurred_on <= ?
       GROUP BY type;`,
      [startDate, endDate]
    );

    let totalExpensePaise = 0;
    let totalIncomePaise = 0;
    let count = 0;

    for (const r of rows) {
      count += r.count;
      if (r.type === 'expense') {
        totalExpensePaise = r.total_paise;
      } else if (r.type === 'income') {
        totalIncomePaise = r.total_paise;
      }
    }

    return {
      totalExpensePaise,
      totalIncomePaise,
      netPaise: totalIncomePaise - totalExpensePaise,
      count,
    };
  }

  async getTotalsByCategory(
    startDate: string,
    endDate: string,
    type: TransactionType = 'expense'
  ): Promise<CategoryTotal[]> {
    const rows = await this.db.getAllAsync<{
      category_id: string;
      category_name: string;
      category_emoji: string;
      category_color: string;
      total_paise: number;
      count: number;
    }>(
      `SELECT
        t.category_id,
        c.name as category_name,
        c.emoji as category_emoji,
        c.color as category_color,
        SUM(t.amount_paise) as total_paise,
        COUNT(t.id) as count
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.deleted_at IS NULL AND t.type = ? AND t.occurred_on >= ? AND t.occurred_on <= ?
       GROUP BY t.category_id
       ORDER BY total_paise DESC;`,
      [type, startDate, endDate]
    );

    const overallTotal = rows.reduce((sum, r) => sum + r.total_paise, 0);

    return rows.map((r) => ({
      ...r,
      percentage: overallTotal > 0 ? Math.round((r.total_paise / overallTotal) * 100) : 0,
    }));
  }

  // --- Categories ---

  async getCategories(kind?: CategoryKind): Promise<Category[]> {
    let sql = `SELECT * FROM categories WHERE deleted_at IS NULL`;
    const params: any[] = [];
    if (kind) {
      sql += ` AND kind = ?`;
      params.push(kind);
    }
    sql += ` ORDER BY sort_order ASC, name ASC;`;
    return await this.db.getAllAsync<Category>(sql, params);
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const row = await this.db.getFirstAsync<Category>(
      `SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL;`,
      [id]
    );
    return row ?? null;
  }

  async getCategoryByName(name: string): Promise<Category | null> {
    const row = await this.db.getFirstAsync<Category>(
      `SELECT * FROM categories WHERE LOWER(name) = ? AND deleted_at IS NULL;`,
      [name.trim().toLowerCase()]
    );
    return row ?? null;
  }

  async addCategory(input: CreateCategoryInput): Promise<Category> {
    const id = generateId();
    const now = new Date().toISOString();
    const sortOrder = input.sort_order ?? 99;

    await this.db.runAsync(
      `INSERT INTO categories (id, name, emoji, color, kind, sort_order, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [id, input.name.trim(), input.emoji.trim(), input.color.trim(), input.kind, sortOrder, now, now]
    );

    return {
      id,
      name: input.name.trim(),
      emoji: input.emoji.trim(),
      color: input.color.trim(),
      kind: input.kind,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const existing = await this.getCategoryById(id);
    if (!existing) throw new Error(`Category ${id} not found`);

    const now = new Date().toISOString();
    const updated: Category = {
      ...existing,
      name: updates.name ? updates.name.trim() : existing.name,
      emoji: updates.emoji ? updates.emoji.trim() : existing.emoji,
      color: updates.color ? updates.color.trim() : existing.color,
      kind: updates.kind ?? existing.kind,
      sort_order: updates.sort_order ?? existing.sort_order,
      updated_at: now,
    };

    await this.db.runAsync(
      `UPDATE categories SET name = ?, emoji = ?, color = ?, kind = ?, sort_order = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [updated.name, updated.emoji, updated.color, updated.kind, updated.sort_order, updated.updated_at, id]
    );

    return updated;
  }

  async softDeleteCategory(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
      [now, now, id]
    );
  }

  // --- Keywords ---

  async getKeywords(): Promise<KeywordMapEntry[]> {
    return await this.db.getAllAsync<KeywordMapEntry>(`SELECT * FROM keyword_map ORDER BY word ASC;`);
  }

  async getKeyword(word: string): Promise<KeywordMapEntry | null> {
    const cleanWord = word.trim().toLowerCase();
    const row = await this.db.getFirstAsync<KeywordMapEntry>(
      `SELECT * FROM keyword_map WHERE word = ?;`,
      [cleanWord]
    );
    return row ?? null;
  }

  async setKeyword(word: string, categoryId: string): Promise<KeywordMapEntry> {
    const cleanWord = word.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = await this.getKeyword(cleanWord);

    if (existing) {
      await this.db.runAsync(
        `UPDATE keyword_map SET category_id = ?, updated_at = ? WHERE word = ?;`,
        [categoryId, now, cleanWord]
      );
      return {
        ...existing,
        category_id: categoryId,
        updated_at: now,
      };
    }

    const id = generateId();
    await this.db.runAsync(
      `INSERT INTO keyword_map (id, word, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
      [id, cleanWord, categoryId, now, now]
    );

    return {
      id,
      word: cleanWord,
      category_id: categoryId,
      created_at: now,
      updated_at: now,
    };
  }

  async deleteKeyword(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM keyword_map WHERE id = ?;`, [id]);
  }

  // --- Settings ---

  async getSetting(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?;`,
      [key]
    );
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value]
    );
  }

  // --- Voice Log ---

  async addVoiceLog(input: CreateVoiceLogInput): Promise<VoiceLogEntry> {
    const id = input.id || generateId();
    const now = input.created_at || new Date().toISOString();
    const correctedInt = input.corrected ? 1 : 0;
    const latency = input.latency_ms ?? 0;
    const alternatives = input.alternatives_json ?? '[]';
    const finalSaved = input.final_saved_json ?? null;

    await this.db.runAsync(
      `INSERT INTO voice_log (
        id, engine, raw_transcript, alternatives_json, parsed_json, final_saved_json, corrected, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.engine,
        input.raw_transcript,
        alternatives,
        input.parsed_json,
        finalSaved,
        correctedInt,
        latency,
        now,
      ]
    );

    return {
      id,
      engine: input.engine,
      raw_transcript: input.raw_transcript,
      alternatives_json: alternatives,
      parsed_json: input.parsed_json,
      final_saved_json: finalSaved,
      corrected: Boolean(input.corrected),
      latency_ms: latency,
      created_at: now,
    };
  }

  async updateVoiceLogSaved(id: string, finalSavedJson: string, corrected: boolean): Promise<void> {
    await this.db.runAsync(
      `UPDATE voice_log SET final_saved_json = ?, corrected = ? WHERE id = ?;`,
      [finalSavedJson, corrected ? 1 : 0, id]
    );
  }

  async getVoiceLogs(limit = 100): Promise<VoiceLogEntry[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM voice_log ORDER BY created_at DESC LIMIT ?;`,
      [limit]
    );
    return rows.map((r) => ({
      ...r,
      corrected: Boolean(r.corrected),
    }));
  }

  async clearVoiceLogs(): Promise<void> {
    await this.db.runAsync(`DELETE FROM voice_log;`);
  }

  async getVoiceLogCount(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM voice_log;`
    );
    return row?.count ?? 0;
  }

  async getSuggestedKeywordsFromVoiceLogs(): Promise<{ word: string; categoryId: string; count: number }[]> {
    const logs = await this.db.getAllAsync<VoiceLogEntry>(
      `SELECT * FROM voice_log WHERE corrected = 1 AND final_saved_json IS NOT NULL;`
    );
    const existingKeywords = new Set(
      (await this.db.getAllAsync<{ word: string }>(`SELECT word FROM keyword_map;`)).map((k) => k.word.toLowerCase())
    );

    const suggestionMap = new Map<string, { categoryId: string; count: number }>();

    for (const log of logs) {
      try {
        if (!log.final_saved_json) continue;
        const saved = JSON.parse(log.final_saved_json);
        const catId = saved.categoryId || saved.category_id;
        if (!catId) continue;

        const tokens = log.raw_transcript
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((t) => t.length >= 3);

        for (const token of tokens) {
          if (
            !existingKeywords.has(token) &&
            !['paid', 'spent', 'rupees', 'rupaye', 'today', 'yesterday', 'chai'].includes(token)
          ) {
            const key = `${token}:${catId}`;
            const existing = suggestionMap.get(key) || { categoryId: catId, count: 0 };
            existing.count += 1;
            suggestionMap.set(key, existing);
          }
        }
      } catch {
        // ignore malformed
      }
    }

    const suggestions: { word: string; categoryId: string; count: number }[] = [];
    for (const [key, val] of suggestionMap.entries()) {
      const [word] = key.split(':');
      suggestions.push({ word, categoryId: val.categoryId, count: val.count });
    }
    return suggestions.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  // --- Backup & Restore ---

  async getAllDataForBackup(): Promise<BackupData> {
    const deviceId = await this.getDeviceId();
    const categories = await this.db.getAllAsync<Category>(`SELECT * FROM categories;`);
    const transactions = await this.db.getAllAsync<Transaction>(`SELECT * FROM transactions;`);
    const keywordMap = await this.db.getAllAsync<KeywordMapEntry>(`SELECT * FROM keyword_map;`);

    return {
      app: 'wini',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      deviceId,
      categories,
      transactions,
      keywordMap,
    };
  }

  async restoreBackup(
    data: BackupData,
    mode: 'merge' | 'replace'
  ): Promise<{ importedCategories: number; importedTransactions: number; importedKeywords: number }> {
    return await this.db.withTransactionAsync(async () => {
      if (mode === 'replace') {
        await this.db.runAsync(`DELETE FROM transactions;`);
        await this.db.runAsync(`DELETE FROM categories;`);
        await this.db.runAsync(`DELETE FROM keyword_map;`);
      }

      let importedCategories = 0;
      let importedTransactions = 0;
      let importedKeywords = 0;

      // Import categories
      for (const cat of data.categories) {
        if (mode === 'replace') {
          await this.db.runAsync(
            `INSERT INTO categories (id, name, emoji, color, kind, sort_order, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [cat.id, cat.name, cat.emoji, cat.color, cat.kind, cat.sort_order, cat.created_at, cat.updated_at, cat.deleted_at]
          );
          importedCategories++;
        } else {
          // Merge: newest updated_at wins
          const existing = await this.db.getFirstAsync<Category>(
            `SELECT * FROM categories WHERE id = ?;`,
            [cat.id]
          );
          if (!existing) {
            await this.db.runAsync(
              `INSERT INTO categories (id, name, emoji, color, kind, sort_order, created_at, updated_at, deleted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [cat.id, cat.name, cat.emoji, cat.color, cat.kind, cat.sort_order, cat.created_at, cat.updated_at, cat.deleted_at]
            );
            importedCategories++;
          } else if (new Date(cat.updated_at) > new Date(existing.updated_at)) {
            await this.db.runAsync(
              `UPDATE categories SET name = ?, emoji = ?, color = ?, kind = ?, sort_order = ?, updated_at = ?, deleted_at = ?
               WHERE id = ?;`,
              [cat.name, cat.emoji, cat.color, cat.kind, cat.sort_order, cat.updated_at, cat.deleted_at, cat.id]
            );
            importedCategories++;
          }
        }
      }

      // Import transactions
      for (const tx of data.transactions) {
        if (mode === 'replace') {
          await this.db.runAsync(
            `INSERT INTO transactions (
              id, type, amount_paise, category_id, note, occurred_on, source, raw_text, device_id, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              tx.id,
              tx.type,
              tx.amount_paise,
              tx.category_id,
              tx.note,
              tx.occurred_on,
              tx.source,
              tx.raw_text ?? null,
              tx.device_id,
              tx.created_at,
              tx.updated_at,
              tx.deleted_at,
            ]
          );
          importedTransactions++;
        } else {
          const existing = await this.db.getFirstAsync<Transaction>(
            `SELECT * FROM transactions WHERE id = ?;`,
            [tx.id]
          );
          if (!existing) {
            await this.db.runAsync(
              `INSERT INTO transactions (
                id, type, amount_paise, category_id, note, occurred_on, source, raw_text, device_id, created_at, updated_at, deleted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                tx.id,
                tx.type,
                tx.amount_paise,
                tx.category_id,
                tx.note,
                tx.occurred_on,
                tx.source,
                tx.raw_text ?? null,
                tx.device_id,
                tx.created_at,
                tx.updated_at,
                tx.deleted_at,
              ]
            );
            importedTransactions++;
          } else if (new Date(tx.updated_at) > new Date(existing.updated_at)) {
            // HOW merge picks the newest row:
            // If the transaction already exists on this phone, we compare updated_at
            // timestamps. If the backup's version is newer, we update the row; if the
            // local phone's version is newer, we keep the phone's version untouched.
            await this.db.runAsync(
              `UPDATE transactions SET
                type = ?, amount_paise = ?, category_id = ?, note = ?, occurred_on = ?, source = ?, raw_text = ?, device_id = ?, updated_at = ?, deleted_at = ?
               WHERE id = ?;`,
              [
                tx.type,
                tx.amount_paise,
                tx.category_id,
                tx.note,
                tx.occurred_on,
                tx.source,
                tx.raw_text ?? null,
                tx.device_id,
                tx.updated_at,
                tx.deleted_at,
                tx.id,
              ]
            );
            importedTransactions++;
          }
        }
      }

      // Import keywordMap
      for (const kw of data.keywordMap) {
        if (mode === 'replace') {
          await this.db.runAsync(
            `INSERT INTO keyword_map (id, word, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
            [kw.id, kw.word, kw.category_id, kw.created_at, kw.updated_at]
          );
          importedKeywords++;
        } else {
          const existing = await this.db.getFirstAsync<KeywordMapEntry>(
            `SELECT * FROM keyword_map WHERE word = ?;`,
            [kw.word]
          );
          if (!existing) {
            await this.db.runAsync(
              `INSERT INTO keyword_map (id, word, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
              [kw.id, kw.word, kw.category_id, kw.created_at, kw.updated_at]
            );
            importedKeywords++;
          } else if (new Date(kw.updated_at) > new Date(existing.updated_at)) {
            await this.db.runAsync(
              `UPDATE keyword_map SET category_id = ?, updated_at = ? WHERE word = ?;`,
              [kw.category_id, kw.updated_at, kw.word]
            );
            importedKeywords++;
          }
        }
      }

      return {
        importedCategories,
        importedTransactions,
        importedKeywords,
      };
    });
  }
}
