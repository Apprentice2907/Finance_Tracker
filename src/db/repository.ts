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
  UpdateCategoryInput,
  BackupData,
  VoiceLogEntry,
  CreateVoiceLogInput,
  Account,
  AccountValuation,
  AccountWithBalance,
  CreateAccountInput,
  UpdateAccountInput,
  VaultBank,
  CreateVaultBankInput,
  UpdateVaultBankInput,
  VaultCard,
  CreateVaultCardInput,
  UpdateVaultCardInput,
  PeriodReport,
  ReportPeriodType,
  QuarterBasis,
  PassbookEntry,
} from '../domain/types';
import { generateId } from '../domain/id';
import {
  formatDisplayDate,
  getTodayIndia,
  getWeekRange,
  getMonthRange,
  getQuarterRange,
  getYearRange,
  getPreviousMonthRange,
  getDateRangeList,
} from '../domain/dates';
import { formatRupees } from '../domain/money';

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

  async getDefaultAccountId(): Promise<string> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'default_account_id';`
    );
    return row?.value || 'acc_cash';
  }

  // --- Transactions ---

  async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
    if (!Number.isInteger(input.amount_paise) || input.amount_paise <= 0) {
      throw new Error('Transaction amount must be a positive integer in paise');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const deviceId = input.device_id || (await this.getDeviceId());
    const accountId =
      input.account_id !== undefined ? input.account_id : await this.getDefaultAccountId();

    await this.db.runAsync(
      `INSERT INTO transactions (
        id, type, amount_paise, category_id, account_id, note, occurred_on, source, raw_text, device_id, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        id,
        input.type,
        input.amount_paise,
        input.category_id,
        accountId,
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
      account_id: accountId,
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
      account_id: updates.account_id !== undefined ? updates.account_id : existing.account_id,
      note: updates.note !== undefined ? updates.note.trim() : existing.note,
      occurred_on: updates.occurred_on ?? existing.occurred_on,
      source: updates.source ?? existing.source,
      raw_text: updates.raw_text !== undefined ? updates.raw_text : existing.raw_text,
      updated_at: now,
    };

    await this.db.runAsync(
      `UPDATE transactions SET
        type = ?, amount_paise = ?, category_id = ?, account_id = ?, note = ?, occurred_on = ?, source = ?, raw_text = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [
        updated.type,
        updated.amount_paise,
        updated.category_id,
        updated.account_id ?? null,
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
      `SELECT t.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color, a.name as account_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.id = ? AND t.deleted_at IS NULL;`,
      [id]
    );
    return row ?? null;
  }

  async listTransactions(options?: {
    limit?: number;
    offset?: number;
    categoryId?: string;
    accountId?: string;
    month?: string;
    type?: TransactionType;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionWithCategory[]> {
    let sql = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (options?.categoryId) {
      sql += ` AND t.category_id = ?`;
      params.push(options.categoryId);
    }

    if (options?.accountId) {
      sql += ` AND t.account_id = ?`;
      params.push(options.accountId);
    }

    if (options?.month) {
      sql += ` AND t.occurred_on LIKE ?`;
      params.push(`${options.month}%`);
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
      sql += ` AND (LOWER(t.note) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(a.name) LIKE ?)`;
      params.push(q, q, q);
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
    const isSystem = input.is_system ? 1 : 0;

    await this.db.runAsync(
      `INSERT INTO categories (id, name, emoji, color, kind, sort_order, is_system, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [id, input.name.trim(), input.emoji.trim(), input.color.trim(), input.kind, sortOrder, isSystem, now, now]
    );

    return {
      id,
      name: input.name.trim(),
      emoji: input.emoji.trim(),
      color: input.color.trim(),
      kind: input.kind,
      sort_order: sortOrder,
      is_system: isSystem,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  }

  async updateCategory(id: string, updates: UpdateCategoryInput): Promise<Category> {
    const existing = await this.getCategoryById(id);
    if (!existing) throw new Error(`Category ${id} not found`);

    const now = new Date().toISOString();
    const updated: Category = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      emoji: updates.emoji !== undefined ? updates.emoji.trim() : existing.emoji,
      color: updates.color !== undefined ? updates.color.trim() : existing.color,
      sort_order: updates.sort_order !== undefined ? updates.sort_order : existing.sort_order,
      updated_at: now,
    };

    await this.db.runAsync(
      `UPDATE categories SET name = ?, emoji = ?, color = ?, sort_order = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [updated.name, updated.emoji, updated.color, updated.sort_order, updated.updated_at, id]
    );

    return updated;
  }

  async deleteCategory(id: string, moveToCategoryId?: string): Promise<void> {
    const category = await this.getCategoryById(id);
    if (!category) return;

    if (category.is_system) {
      throw new Error(`Cannot delete system category "${category.name}"`);
    }

    const countRow = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM categories WHERE kind = ? AND deleted_at IS NULL;`,
      [category.kind]
    );
    if ((countRow?.count ?? 0) <= 1) {
      throw new Error(`Cannot delete the last ${category.kind} category`);
    }

    const txCountRow = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE category_id = ? AND deleted_at IS NULL;`,
      [id]
    );
    const txCount = txCountRow?.count ?? 0;

    const now = new Date().toISOString();

    if (txCount > 0) {
      let targetId = moveToCategoryId;
      if (!targetId) {
        // Fall back to default system category of same kind
        const fallback = await this.db.getFirstAsync<Category>(
          `SELECT * FROM categories WHERE kind = ? AND is_system = 1 AND deleted_at IS NULL;`,
          [category.kind]
        );
        if (!fallback) {
          throw new Error('Please specify a destination category for existing transactions');
        }
        targetId = fallback.id;
      }

      await this.db.runAsync(
        `UPDATE transactions SET category_id = ?, updated_at = ? WHERE category_id = ? AND deleted_at IS NULL;`,
        [targetId, now, id]
      );
    }

    await this.db.runAsync(
      `UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
      [now, now, id]
    );
  }

  async softDeleteCategory(id: string, moveToCategoryId?: string): Promise<void> {
    return this.deleteCategory(id, moveToCategoryId);
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

  async getSetting(key: string, defaultValue?: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?;`,
      [key]
    );
    if (row?.value !== undefined) return row.value;
    return defaultValue !== undefined ? defaultValue : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value]
    );
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM settings;`
    );
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
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

  // --- Accounts (Wini v2) ---

  async createAccount(input: CreateAccountInput): Promise<Account> {
    const id = input.id || generateId();
    const now = new Date().toISOString();
    const aliases = input.aliases || [input.name.trim().toLowerCase()];
    const aliasesJson = JSON.stringify(aliases);
    const sortOrder = input.sort_order ?? 50;
    const includeInTotal = input.include_in_total === false ? 0 : 1;
    const openingBalance = input.opening_balance_paise ?? 0;
    const currentValue =
      input.current_value_paise !== undefined
        ? input.current_value_paise
        : input.type === 'investment'
        ? openingBalance
        : null;

    await this.db.runAsync(
      `INSERT INTO accounts (
        id, name, type, institution, opening_balance_paise, current_value_paise,
        valuation_updated_at, include_in_total, sort_order, aliases_json, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        id,
        input.name.trim(),
        input.type,
        input.institution ? input.institution.trim() : null,
        openingBalance,
        currentValue,
        input.type === 'investment' ? now : null,
        includeInTotal,
        sortOrder,
        aliasesJson,
        now,
        now,
      ]
    );

    return {
      id,
      name: input.name.trim(),
      type: input.type,
      institution: input.institution ? input.institution.trim() : null,
      opening_balance_paise: openingBalance,
      current_value_paise: currentValue,
      valuation_updated_at: input.type === 'investment' ? now : null,
      include_in_total: includeInTotal,
      sort_order: sortOrder,
      aliases_json: aliasesJson,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  }

  async getAccounts(includeDeleted = false): Promise<Account[]> {
    const sql = `SELECT * FROM accounts ${
      includeDeleted ? '' : 'WHERE deleted_at IS NULL'
    } ORDER BY sort_order ASC, name ASC;`;
    return await this.db.getAllAsync<Account>(sql);
  }

  async getAccountById(id: string): Promise<Account | null> {
    const row = await this.db.getFirstAsync<Account>(
      `SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL;`,
      [id]
    );
    return row ?? null;
  }

  async updateAccount(id: string, updates: UpdateAccountInput): Promise<Account> {
    const existing = await this.getAccountById(id);
    if (!existing) throw new Error(`Account ${id} not found`);

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const type = updates.type ?? existing.type;
    const institution =
      updates.institution !== undefined
        ? updates.institution
          ? updates.institution.trim()
          : null
        : existing.institution;
    const openingBalance =
      updates.opening_balance_paise !== undefined
        ? updates.opening_balance_paise
        : existing.opening_balance_paise;
    const currentValue =
      updates.current_value_paise !== undefined
        ? updates.current_value_paise
        : existing.current_value_paise;
    const includeInTotal =
      updates.include_in_total !== undefined
        ? updates.include_in_total
          ? 1
          : 0
        : existing.include_in_total;
    const sortOrder =
      updates.sort_order !== undefined ? updates.sort_order : existing.sort_order;
    const aliasesJson =
      updates.aliases !== undefined
        ? JSON.stringify(updates.aliases)
        : existing.aliases_json;

    await this.db.runAsync(
      `UPDATE accounts SET
        name = ?, type = ?, institution = ?, opening_balance_paise = ?, current_value_paise = ?,
        include_in_total = ?, sort_order = ?, aliases_json = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [
        name,
        type,
        institution,
        openingBalance,
        currentValue,
        includeInTotal,
        sortOrder,
        aliasesJson,
        now,
        id,
      ]
    );

    return {
      ...existing,
      name,
      type,
      institution,
      opening_balance_paise: openingBalance,
      current_value_paise: currentValue,
      include_in_total: includeInTotal,
      sort_order: sortOrder,
      aliases_json: aliasesJson,
      updated_at: now,
    };
  }

  async deleteAccount(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
      [now, now, id]
    );
  }

  async getAccountBalance(accountId: string): Promise<number> {
    const account = await this.getAccountById(accountId);
    if (!account) return 0;

    // Rule: For investment, balance is the manual current_value_paise (or opening balance if unset)
    if (account.type === 'investment') {
      return account.current_value_paise ?? account.opening_balance_paise;
    }

    // Rule in DECISIONS.md section 7:
    // For balance calculations, a NULL account_id counts toward the default account (Cash).
    const defaultAccountId = await this.getSetting('default_account_id', 'acc_cash');
    const isDefault = accountId === defaultAccountId || account.id === 'acc_cash';

    const whereClause = isDefault
      ? `(account_id = ? OR account_id IS NULL) AND deleted_at IS NULL`
      : `account_id = ? AND deleted_at IS NULL`;

    const row = await this.db.getFirstAsync<{ income: number; expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_paise ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_paise ELSE 0 END), 0) as expense
       FROM transactions
       WHERE ${whereClause};`,
      [accountId]
    );

    const income = row?.income ?? 0;
    const expense = row?.expense ?? 0;
    return account.opening_balance_paise + income - expense;
  }

  /**
   * Bulk assigns all legacy transactions with a NULL account_id to the specified account.
   */
  async assignUnassignedTransactions(accountId: string): Promise<number> {
    const target = await this.getAccountById(accountId);
    if (!target) throw new Error(`Target account ${accountId} not found`);

    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `UPDATE transactions SET account_id = ?, updated_at = ? WHERE account_id IS NULL AND deleted_at IS NULL;`,
      [accountId, now]
    );
    return result.changes ?? 0;
  }

  /**
   * Computes passbook ledger entries ordered by occurred_on ASC, created_at ASC with running balance.
   * NULL account_id transactions count toward the default account (Cash).
   */
  async getAccountPassbook(accountId: string): Promise<PassbookEntry[]> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    const defaultAccountId = await this.getSetting('default_account_id', 'acc_cash');
    const isDefault = accountId === defaultAccountId || account.id === 'acc_cash';

    const whereClause = isDefault
      ? `(t.account_id = ? OR t.account_id IS NULL) AND t.deleted_at IS NULL`
      : `t.account_id = ? AND t.deleted_at IS NULL`;

    const sql = `
      SELECT
        t.*,
        c.name as category_name,
        c.emoji as category_emoji,
        c.color as category_color,
        a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE ${whereClause}
      ORDER BY t.occurred_on ASC, t.created_at ASC;
    `;

    const rows = await this.db.getAllAsync<any>(sql, [accountId]);

    let runningBalance = account.opening_balance_paise;
    const entries: PassbookEntry[] = [];

    for (const r of rows) {
      const isIncome = r.type === 'income';
      const debitPaise = isIncome ? null : r.amount_paise;
      const creditPaise = isIncome ? r.amount_paise : null;

      if (isIncome) {
        runningBalance += r.amount_paise;
      } else {
        runningBalance -= r.amount_paise;
      }

      const tx: TransactionWithCategory = {
        id: r.id,
        type: r.type,
        amount_paise: r.amount_paise,
        category_id: r.category_id,
        account_id: r.account_id ?? null,
        account_name: r.account_name ?? null,
        note: r.note,
        occurred_on: r.occurred_on,
        source: r.source,
        raw_text: r.raw_text,
        device_id: r.device_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        category_name: r.category_name,
        category_emoji: r.category_emoji,
        category_color: r.category_color,
      };

      entries.push({
        id: r.id,
        transaction: tx,
        date: r.occurred_on,
        particulars: r.note || r.category_name || 'Transaction',
        debitPaise,
        creditPaise,
        runningBalancePaise: runningBalance,
      });
    }

    return entries;
  }

  async getAccountWithBalance(accountId: string): Promise<AccountWithBalance | null> {
    const account = await this.getAccountById(accountId);
    if (!account) return null;
    const balance_paise = await this.getAccountBalance(accountId);
    return {
      ...account,
      balance_paise,
    };
  }

  async getAllAccountsWithBalances(): Promise<AccountWithBalance[]> {
    const accounts = await this.getAccounts();
    const result: AccountWithBalance[] = [];
    for (const acc of accounts) {
      const balance_paise = await this.getAccountBalance(acc.id);
      result.push({
        ...acc,
        balance_paise,
      });
    }
    return result;
  }

  async getTotalBalancePaise(): Promise<{
    totalPaise: number;
    bankPaise: number;
    cashPaise: number;
    investmentPaise: number;
    walletPaise: number;
  }> {
    const accounts = await this.getAllAccountsWithBalances();
    let totalPaise = 0;
    let bankPaise = 0;
    let cashPaise = 0;
    let investmentPaise = 0;
    let walletPaise = 0;

    for (const acc of accounts) {
      const isIncluded = Boolean(acc.include_in_total);
      if (isIncluded) {
        totalPaise += acc.balance_paise;
      }
      if (acc.type === 'bank') bankPaise += acc.balance_paise;
      else if (acc.type === 'cash') cashPaise += acc.balance_paise;
      else if (acc.type === 'investment') investmentPaise += acc.balance_paise;
      else if (acc.type === 'wallet') walletPaise += acc.balance_paise;
    }

    return {
      totalPaise,
      bankPaise,
      cashPaise,
      investmentPaise,
      walletPaise,
    };
  }

  async getAccountByAlias(spokenAlias: string): Promise<Account | null> {
    const clean = spokenAlias.trim().toLowerCase();
    if (!clean) return null;

    const accounts = await this.getAccounts();
    // 1. Exact match on name
    for (const acc of accounts) {
      if (acc.name.toLowerCase() === clean) return acc;
    }

    // 2. Exact match on aliases
    for (const acc of accounts) {
      try {
        const aliases: string[] = JSON.parse(acc.aliases_json);
        if (aliases.some((a) => a.toLowerCase() === clean)) {
          return acc;
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    // 3. Whole-word match in phrase (e.g. "from cash" contains word "cash", "paid 1250 from hdfc" contains word "hdfc")
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const acc of accounts) {
      const nameRegex = new RegExp(`\\b${escapeRegExp(acc.name.toLowerCase())}\\b`, 'i');
      if (nameRegex.test(clean)) return acc;
      try {
        const aliases: string[] = JSON.parse(acc.aliases_json);
        for (const alias of aliases) {
          const aliasRegex = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, 'i');
          if (aliasRegex.test(clean)) {
            return acc;
          }
        }
      } catch {
        // Ignore
      }
    }

    return null;
  }

  async getDefaultAccount(): Promise<Account | null> {
    const defaultId = await this.getDefaultAccountId();
    const account = await this.getAccountById(defaultId);
    if (account) return account;
    const accounts = await this.getAccounts();
    return accounts[0] || null;
  }

  async setDefaultAccount(accountId: string): Promise<void> {
    await this.setSetting('default_account_id', accountId);
  }

  // --- Account Valuations (Investments) ---

  async addValuation(
    accountId: string,
    valuePaise: number,
    recordedOn?: string
  ): Promise<AccountValuation> {
    if (!Number.isInteger(valuePaise) || valuePaise < 0) {
      throw new Error('Valuation value must be a non-negative integer in paise');
    }
    const id = generateId();
    const date = recordedOn || getTodayIndia();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO account_valuations (id, account_id, value_paise, recorded_on, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, accountId, valuePaise, date, now]
    );

    await this.db.runAsync(
      `UPDATE accounts SET current_value_paise = ?, valuation_updated_at = ?, updated_at = ? WHERE id = ?;`,
      [valuePaise, now, now, accountId]
    );

    return {
      id,
      account_id: accountId,
      value_paise: valuePaise,
      recorded_on: date,
      created_at: now,
    };
  }

  async getValuationHistory(accountId: string): Promise<AccountValuation[]> {
    return await this.db.getAllAsync<AccountValuation>(
      `SELECT * FROM account_valuations WHERE account_id = ? ORDER BY recorded_on DESC, created_at DESC;`,
      [accountId]
    );
  }

  // --- Vault (Bank & Cards) ---

  private assertEncryptedBlob(value: string | null | undefined, fieldName: string, isRequired = false): void {
    if (value === null || value === undefined) {
      if (isRequired) {
        throw new Error(`Vault field "${fieldName}" is required and must be an encrypted blob starting with "enc:v1:"`);
      }
      return;
    }
    if (typeof value !== 'string' || !value.startsWith('enc:v1:')) {
      throw new Error(`Vault field "${fieldName}" must be an encrypted blob starting with "enc:v1:"`);
    }
  }

  async createVaultBank(input: CreateVaultBankInput): Promise<VaultBank> {
    this.assertEncryptedBlob(input.account_holder_name_encrypted, 'account_holder_name');
    this.assertEncryptedBlob(input.account_number_encrypted, 'account_number');
    this.assertEncryptedBlob(input.ifsc_encrypted, 'ifsc');
    this.assertEncryptedBlob(input.customer_id_encrypted, 'customer_id');
    this.assertEncryptedBlob(input.upi_id_encrypted, 'upi_id');
    this.assertEncryptedBlob(input.notes_encrypted, 'notes');

    const id = input.id || generateId();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO vault_bank (
        id, account_holder_name_encrypted, bank_name, account_number_encrypted,
        ifsc_encrypted, customer_id_encrypted, upi_id_encrypted, branch, notes_encrypted,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        id,
        input.account_holder_name_encrypted ?? null,
        input.bank_name.trim(),
        input.account_number_encrypted ?? null,
        input.ifsc_encrypted ?? null,
        input.customer_id_encrypted ?? null,
        input.upi_id_encrypted ?? null,
        input.branch ? input.branch.trim() : null,
        input.notes_encrypted ?? null,
        now,
        now,
      ]
    );
    return {
      id,
      account_holder_name_encrypted: input.account_holder_name_encrypted ?? null,
      bank_name: input.bank_name.trim(),
      account_number_encrypted: input.account_number_encrypted ?? null,
      ifsc_encrypted: input.ifsc_encrypted ?? null,
      customer_id_encrypted: input.customer_id_encrypted ?? null,
      upi_id_encrypted: input.upi_id_encrypted ?? null,
      branch: input.branch ? input.branch.trim() : null,
      notes_encrypted: input.notes_encrypted ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  }

  async getVaultBanks(includeDeleted = false): Promise<VaultBank[]> {
    const sql = `SELECT * FROM vault_bank ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'} ORDER BY created_at ASC;`;
    return await this.db.getAllAsync<VaultBank>(sql);
  }

  async getVaultBankById(id: string): Promise<VaultBank | null> {
    const row = await this.db.getFirstAsync<VaultBank>(
      `SELECT * FROM vault_bank WHERE id = ? AND deleted_at IS NULL;`,
      [id]
    );
    return row ?? null;
  }

  async updateVaultBank(id: string, input: UpdateVaultBankInput): Promise<VaultBank> {
    const existing = await this.getVaultBankById(id);
    if (!existing) throw new Error(`Vault bank record ${id} not found`);

    if (input.account_holder_name_encrypted !== undefined) {
      this.assertEncryptedBlob(input.account_holder_name_encrypted, 'account_holder_name');
    }
    if (input.account_number_encrypted !== undefined) {
      this.assertEncryptedBlob(input.account_number_encrypted, 'account_number');
    }
    if (input.ifsc_encrypted !== undefined) {
      this.assertEncryptedBlob(input.ifsc_encrypted, 'ifsc');
    }
    if (input.customer_id_encrypted !== undefined) {
      this.assertEncryptedBlob(input.customer_id_encrypted, 'customer_id');
    }
    if (input.upi_id_encrypted !== undefined) {
      this.assertEncryptedBlob(input.upi_id_encrypted, 'upi_id');
    }
    if (input.notes_encrypted !== undefined) {
      this.assertEncryptedBlob(input.notes_encrypted, 'notes');
    }

    const now = new Date().toISOString();
    const updated: VaultBank = {
      ...existing,
      account_holder_name_encrypted:
        input.account_holder_name_encrypted !== undefined
          ? input.account_holder_name_encrypted
          : existing.account_holder_name_encrypted,
      bank_name: input.bank_name !== undefined ? input.bank_name.trim() : existing.bank_name,
      account_number_encrypted:
        input.account_number_encrypted !== undefined
          ? input.account_number_encrypted
          : existing.account_number_encrypted,
      ifsc_encrypted:
        input.ifsc_encrypted !== undefined ? input.ifsc_encrypted : existing.ifsc_encrypted,
      customer_id_encrypted:
        input.customer_id_encrypted !== undefined
          ? input.customer_id_encrypted
          : existing.customer_id_encrypted,
      upi_id_encrypted:
        input.upi_id_encrypted !== undefined ? input.upi_id_encrypted : existing.upi_id_encrypted,
      branch: input.branch !== undefined ? (input.branch ? input.branch.trim() : null) : existing.branch,
      notes_encrypted:
        input.notes_encrypted !== undefined ? input.notes_encrypted : existing.notes_encrypted,
      updated_at: now,
    };

    await this.db.runAsync(
      `UPDATE vault_bank SET
        account_holder_name_encrypted = ?, bank_name = ?, account_number_encrypted = ?,
        ifsc_encrypted = ?, customer_id_encrypted = ?, upi_id_encrypted = ?, branch = ?,
        notes_encrypted = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [
        updated.account_holder_name_encrypted,
        updated.bank_name,
        updated.account_number_encrypted,
        updated.ifsc_encrypted,
        updated.customer_id_encrypted,
        updated.upi_id_encrypted,
        updated.branch,
        updated.notes_encrypted,
        now,
        id,
      ]
    );
    return updated;
  }

  async deleteVaultBank(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE vault_bank SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
      [now, now, id]
    );
  }

  async createVaultCard(input: CreateVaultCardInput): Promise<VaultCard> {
    this.assertEncryptedBlob(input.holder_name_encrypted, 'holder_name');
    this.assertEncryptedBlob(input.card_number_encrypted, 'card_number', true);
    this.assertEncryptedBlob(input.expiry_encrypted, 'expiry');
    this.assertEncryptedBlob(input.cvv_encrypted, 'cvv');
    this.assertEncryptedBlob(input.pin_encrypted, 'pin');

    const id = input.id || generateId();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO vault_cards (
        id, nickname, network, holder_name_encrypted, card_number_encrypted,
        expiry_encrypted, cvv_encrypted, pin_encrypted, linked_account_id, billing_day,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      [
        id,
        input.nickname.trim(),
        input.network,
        input.holder_name_encrypted ?? null,
        input.card_number_encrypted,
        input.expiry_encrypted ?? null,
        input.cvv_encrypted ?? null,
        input.pin_encrypted ?? null,
        input.linked_account_id ?? null,
        input.billing_day ?? null,
        now,
        now,
      ]
    );

    return {
      id,
      nickname: input.nickname.trim(),
      network: input.network,
      holder_name_encrypted: input.holder_name_encrypted ?? null,
      card_number_encrypted: input.card_number_encrypted,
      expiry_encrypted: input.expiry_encrypted ?? null,
      cvv_encrypted: input.cvv_encrypted ?? null,
      pin_encrypted: input.pin_encrypted ?? null,
      linked_account_id: input.linked_account_id ?? null,
      billing_day: input.billing_day ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  }

  async getVaultCards(includeDeleted = false): Promise<VaultCard[]> {
    const sql = `SELECT * FROM vault_cards ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'} ORDER BY created_at ASC;`;
    return await this.db.getAllAsync<VaultCard>(sql);
  }

  async getVaultCardById(id: string): Promise<VaultCard | null> {
    const row = await this.db.getFirstAsync<VaultCard>(
      `SELECT * FROM vault_cards WHERE id = ? AND deleted_at IS NULL;`,
      [id]
    );
    return row ?? null;
  }

  async updateVaultCard(id: string, input: UpdateVaultCardInput): Promise<VaultCard> {
    const existing = await this.getVaultCardById(id);
    if (!existing) throw new Error(`Vault card record ${id} not found`);

    if (input.holder_name_encrypted !== undefined) {
      this.assertEncryptedBlob(input.holder_name_encrypted, 'holder_name');
    }
    if (input.card_number_encrypted !== undefined) {
      this.assertEncryptedBlob(input.card_number_encrypted, 'card_number', true);
    }
    if (input.expiry_encrypted !== undefined) {
      this.assertEncryptedBlob(input.expiry_encrypted, 'expiry');
    }
    if (input.cvv_encrypted !== undefined) {
      this.assertEncryptedBlob(input.cvv_encrypted, 'cvv');
    }
    if (input.pin_encrypted !== undefined) {
      this.assertEncryptedBlob(input.pin_encrypted, 'pin');
    }

    const now = new Date().toISOString();
    const updated: VaultCard = {
      ...existing,
      nickname: input.nickname !== undefined ? input.nickname.trim() : existing.nickname,
      network: input.network !== undefined ? input.network : existing.network,
      holder_name_encrypted:
        input.holder_name_encrypted !== undefined
          ? input.holder_name_encrypted
          : existing.holder_name_encrypted,
      card_number_encrypted:
        input.card_number_encrypted !== undefined
          ? input.card_number_encrypted
          : existing.card_number_encrypted,
      expiry_encrypted:
        input.expiry_encrypted !== undefined ? input.expiry_encrypted : existing.expiry_encrypted,
      cvv_encrypted:
        input.cvv_encrypted !== undefined ? input.cvv_encrypted : existing.cvv_encrypted,
      pin_encrypted:
        input.pin_encrypted !== undefined ? input.pin_encrypted : existing.pin_encrypted,
      linked_account_id:
        input.linked_account_id !== undefined ? input.linked_account_id : existing.linked_account_id,
      billing_day: input.billing_day !== undefined ? input.billing_day : existing.billing_day,
      updated_at: now,
    };

    await this.db.runAsync(
      `UPDATE vault_cards SET
        nickname = ?, network = ?, holder_name_encrypted = ?, card_number_encrypted = ?,
        expiry_encrypted = ?, cvv_encrypted = ?, pin_encrypted = ?, linked_account_id = ?,
        billing_day = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [
        updated.nickname,
        updated.network,
        updated.holder_name_encrypted,
        updated.card_number_encrypted,
        updated.expiry_encrypted,
        updated.cvv_encrypted,
        updated.pin_encrypted,
        updated.linked_account_id,
        updated.billing_day,
        now,
        id,
      ]
    );
    return updated;
  }

  async deleteVaultCard(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE vault_cards SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
      [now, now, id]
    );
  }

  // --- Reports (Wini v2) ---

  async getPeriodReport(
    periodType: ReportPeriodType,
    targetDateStr: string = getTodayIndia(),
    quarterBasis: QuarterBasis = 'calendar'
  ): Promise<PeriodReport> {
    let range: { startDate: string; endDate: string; key: string };
    let prevRange: { startDate: string; endDate: string };

    if (periodType === 'week') {
      range = getWeekRange(targetDateStr);
      // Previous week: 7 days before
      const prevDate = new Date(`${range.startDate}T00:00:00Z`);
      prevDate.setUTCDate(prevDate.getUTCDate() - 7);
      const prevStr = prevDate.toISOString().split('T')[0];
      const pw = getWeekRange(prevStr);
      prevRange = { startDate: pw.startDate, endDate: pw.endDate };
    } else if (periodType === 'quarter') {
      range = getQuarterRange(targetDateStr, quarterBasis);
      // Previous quarter: 3 months before
      const [qy, qm] = range.startDate.split('-').map(Number);
      const prevQuarterDate = new Date(Date.UTC(qy, qm - 2, 1));
      const pqStr = prevQuarterDate.toISOString().split('T')[0];
      const pq = getQuarterRange(pqStr, quarterBasis);
      prevRange = { startDate: pq.startDate, endDate: pq.endDate };
    } else if (periodType === 'year') {
      range = getYearRange(targetDateStr, quarterBasis);
      const [yy] = range.startDate.split('-').map(Number);
      const py = getYearRange(`${yy - 1}-06-01`, quarterBasis);
      prevRange = { startDate: py.startDate, endDate: py.endDate };
    } else {
      // Month (default)
      range = getMonthRange(targetDateStr);
      prevRange = getPreviousMonthRange(targetDateStr);
    }

    const { startDate, endDate, key: periodKey } = range;

    // Fetch current period transactions
    const currentTxs = await this.listTransactions({ startDate, endDate });

    // Fetch previous period totals
    const prevTotals = await this.getTotalsByPeriod(prevRange.startDate, prevRange.endDate);

    let totalIncomePaise = 0;
    let totalExpensePaise = 0;
    const categoryTotalsMap = new Map<
      string,
      {
        category_id: string;
        category_name: string;
        category_emoji: string;
        category_color: string;
        kind: CategoryKind;
        total_paise: number;
        count: number;
      }
    >();

    const dailyNetMap = new Map<string, { incomePaise: number; expensePaise: number }>();

    for (const t of currentTxs) {
      if (t.type === 'income') {
        totalIncomePaise += t.amount_paise;
      } else {
        totalExpensePaise += t.amount_paise;
      }

      // Cashflow accumulation
      const dayKey =
        periodType === 'year' || periodType === 'quarter'
          ? t.occurred_on.substring(0, 7) // group by YYYY-MM
          : t.occurred_on; // group by YYYY-MM-DD

      if (!dailyNetMap.has(dayKey)) {
        dailyNetMap.set(dayKey, { incomePaise: 0, expensePaise: 0 });
      }
      const entry = dailyNetMap.get(dayKey)!;
      if (t.type === 'income') entry.incomePaise += t.amount_paise;
      else entry.expensePaise += t.amount_paise;

      // Category breakdown accumulation
      const catId = t.category_id;
      if (!categoryTotalsMap.has(catId)) {
        categoryTotalsMap.set(catId, {
          category_id: catId,
          category_name: t.category_name || 'Other',
          category_emoji: t.category_emoji || '📦',
          category_color: t.category_color || '#8E8E93',
          kind: t.type,
          total_paise: 0,
          count: 0,
        });
      }
      const catEntry = categoryTotalsMap.get(catId)!;
      catEntry.total_paise += t.amount_paise;
      catEntry.count += 1;
    }

    const netPaise = totalIncomePaise - totalExpensePaise;
    const savingsRate =
      totalIncomePaise > 0
        ? Math.max(0, Math.round(((totalIncomePaise - totalExpensePaise) / totalIncomePaise) * 1000) / 10)
        : 0;

    // Previous comparison
    const prevIncome = prevTotals.totalIncomePaise;
    const prevExpense = prevTotals.totalExpensePaise;
    const prevNet = prevTotals.netPaise;

    const incomeChangePct =
      prevIncome > 0 ? Math.round(((totalIncomePaise - prevIncome) / prevIncome) * 100) : 0;
    const expenseChangePct =
      prevExpense > 0 ? Math.round(((totalExpensePaise - prevExpense) / prevExpense) * 100) : 0;
    const netChangePct =
      prevNet !== 0 ? Math.round(((netPaise - prevNet) / Math.abs(prevNet)) * 100) : 0;

    // Cashflow list
    const cashflow: { date: string; incomePaise: number; expensePaise: number; netPaise: number }[] = [];
    if (periodType === 'week' || periodType === 'month') {
      const dates = getDateRangeList(startDate, endDate);
      for (const d of dates) {
        const val = dailyNetMap.get(d) || { incomePaise: 0, expensePaise: 0 };
        cashflow.push({
          date: d,
          incomePaise: val.incomePaise,
          expensePaise: val.expensePaise,
          netPaise: val.incomePaise - val.expensePaise,
        });
      }
    } else {
      const sortedKeys = Array.from(dailyNetMap.keys()).sort();
      for (const k of sortedKeys) {
        const val = dailyNetMap.get(k)!;
        cashflow.push({
          date: k,
          incomePaise: val.incomePaise,
          expensePaise: val.expensePaise,
          netPaise: val.incomePaise - val.expensePaise,
        });
      }
    }

    // Category breakdown with shares
    const categoryBreakdown = Array.from(categoryTotalsMap.values())
      .map((cat) => {
        const base = cat.kind === 'income' ? totalIncomePaise : totalExpensePaise;
        const share_pct = base > 0 ? Math.round((cat.total_paise / base) * 1000) / 10 : 0;
        const average_paise = cat.count > 0 ? Math.round(cat.total_paise / cat.count) : 0;
        return {
          ...cat,
          share_pct,
          average_paise,
        };
      })
      .sort((a, b) => b.total_paise - a.total_paise);

    // Top 5 transactions
    const topTransactions = currentTxs
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount_paise - a.amount_paise)
      .slice(0, 5);

    // Deterministic Insights
    const insights: string[] = [];
    const topExpenseCat = categoryBreakdown.find((c) => c.kind === 'expense');
    if (topExpenseCat && totalExpensePaise > 0) {
      insights.push(
        `${topExpenseCat.category_name} was your biggest expense: ${formatRupees(topExpenseCat.total_paise)} (${topExpenseCat.share_pct}% of total spending).`
      );
    } else {
      insights.push('No expenses recorded for this period.');
    }

    if (totalIncomePaise > 0) {
      insights.push(`Your savings rate this period was ${savingsRate}%.`);
    }

    if (prevExpense > 0) {
      if (expenseChangePct > 0) {
        insights.push(`Spending increased by ${expenseChangePct}% compared to the previous period.`);
      } else if (expenseChangePct < 0) {
        insights.push(`Spending decreased by ${Math.abs(expenseChangePct)}% compared to the previous period.`);
      } else {
        insights.push('Spending remained exactly the same as the previous period.');
      }
    }

    // Busiest day
    let busiestDay = '';
    let maxDayCount = 0;
    let busiestDayAmount = 0;
    const dayCounts = new Map<string, { count: number; amount: number }>();
    for (const t of currentTxs) {
      if (t.type === 'expense') {
        const d = t.occurred_on;
        const curr = dayCounts.get(d) || { count: 0, amount: 0 };
        curr.count++;
        curr.amount += t.amount_paise;
        dayCounts.set(d, curr);
        if (curr.count > maxDayCount) {
          maxDayCount = curr.count;
          busiestDay = d;
          busiestDayAmount = curr.amount;
        }
      }
    }
    if (busiestDay && maxDayCount > 0) {
      insights.push(
        `Busiest spending day was ${busiestDay} with ${maxDayCount} transaction${maxDayCount > 1 ? 's' : ''} (${formatRupees(busiestDayAmount)}).`
      );
    }

    return {
      periodType,
      periodKey,
      startDate,
      endDate,
      totalIncomePaise,
      totalExpensePaise,
      netPaise,
      savingsRate,
      prevPeriod: {
        totalIncomePaise: prevIncome,
        totalExpensePaise: prevExpense,
        netPaise: prevNet,
        incomeChangePct,
        expenseChangePct,
        netChangePct,
      },
      cashflow,
      categoryBreakdown,
      insights,
      topTransactions,
    };
  }
}

