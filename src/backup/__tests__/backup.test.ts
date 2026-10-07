// Automated tests for backup schema validation, data integrity, and round-trip restore.
import initSqlJs, { SqlJsStatic } from 'sql.js';
import { validateBackupData } from '../validation';
import { SqlJsDatabaseAdapter } from '../../db/adapter';
import { Repository } from '../../db/repository';
import { BackupData } from '../../domain/types';

describe('Backup Validation & Round-Trip', () => {
  let SQL: SqlJsStatic;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  const validBackup: BackupData = {
    app: 'wini',
    schemaVersion: 1,
    exportedAt: '2026-10-04T12:00:00.000Z',
    deviceId: 'test-device-123',
    categories: [
      {
        id: 'cat-1',
        name: 'Transport',
        emoji: '🛺',
        icon: 'car-outline',
        color: '#3B6EF5',
        kind: 'expense',
        sort_order: 1,
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
        deleted_at: null,
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        type: 'expense',
        amount_paise: 2500,
        category_id: 'cat-1',
        note: 'Auto rickshaw',
        occurred_on: '2026-10-04',
        source: 'voice',
        raw_text: 'add rickshaw 25 rupees',
        device_id: 'test-device-123',
        created_at: '2026-10-04T10:00:00.000Z',
        updated_at: '2026-10-04T10:00:00.000Z',
        deleted_at: null,
      },
    ],
    keywordMap: [
      {
        id: 'kw-1',
        word: 'rickshaw',
        category_id: 'cat-1',
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
      },
    ],
  };

  describe('validateBackupData', () => {
    it('accepts valid backup object', () => {
      const res = validateBackupData(validBackup);
      expect(res.success).toBe(true);
      expect(res.data?.app).toBe('wini');
    });

    it('accepts valid backup as JSON string', () => {
      const jsonStr = JSON.stringify(validBackup);
      const res = validateBackupData(jsonStr);
      expect(res.success).toBe(true);
      expect(res.data?.transactions.length).toBe(1);
    });

    it('rejects invalid JSON string', () => {
      const res = validateBackupData('{ bad json');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/valid JSON/);
    });

    it('rejects non-wini application id', () => {
      const res = validateBackupData({ ...validBackup, app: 'other_tracker' });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/expected "wini"/);
    });

    it('rejects unsupported schema version', () => {
      const res = validateBackupData({ ...validBackup, schemaVersion: 2 });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/expected 1/);
    });

    it('rejects transactions with negative or float amount_paise', () => {
      const badTx = {
        ...validBackup,
        transactions: [{ ...validBackup.transactions[0], amount_paise: -100 }],
      };
      const res = validateBackupData(badTx);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/positive integer amount_paise/);
    });

    it('rejects transactions with invalid date format', () => {
      const badDate = {
        ...validBackup,
        transactions: [{ ...validBackup.transactions[0], occurred_on: '04-10-2026' }],
      };
      const res = validateBackupData(badDate);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/YYYY-MM-DD/);
    });
  });

  describe('Database Backup & Restore Round-Trip', () => {
    let db: any;
    let adapter: SqlJsDatabaseAdapter;
    let repo: Repository;

    beforeEach(async () => {
      db = new SQL.Database();
      adapter = new SqlJsDatabaseAdapter(db);
      repo = new Repository(adapter);
      await repo.init();
    });

    afterEach(async () => {
      await adapter.closeAsync();
    });

    it('performs complete round-trip: export -> wipe -> replace -> identical data', async () => {
      const categories = await repo.getCategories();
      const foodCat = categories.find((c) => c.name === 'Food')!;

      // 1. Add sample transactions
      const tx1 = await repo.addTransaction({
        type: 'expense',
        amount_paise: 5000,
        category_id: foodCat.id,
        note: 'Biryani dinner',
        occurred_on: '2026-10-04',
        source: 'manual',
      });

      const tx2 = await repo.addTransaction({
        type: 'income',
        amount_paise: 7500000,
        category_id: categories.find((c) => c.kind === 'income')!.id,
        note: 'Monthly salary',
        occurred_on: '2026-10-01',
        source: 'voice',
        raw_text: 'got 75000 salary',
      });

      // 2. Add learned keyword
      await repo.setKeyword('biryani', foodCat.id);

      // 3. Export backup
      const exportedBackup = await repo.getAllDataForBackup();
      expect(exportedBackup.app).toBe('wini');
      expect(exportedBackup.schemaVersion).toBe(1);
      expect(exportedBackup.transactions.length).toBe(2);
      expect(exportedBackup.keywordMap.length).toBe(1);

      // Validate exported backup with validator
      const validation = validateBackupData(exportedBackup);
      expect(validation.success).toBe(true);

      // 4. Restore onto a fresh clean repository in 'replace' mode
      const freshDb = new SQL.Database();
      const freshAdapter = new SqlJsDatabaseAdapter(freshDb);
      const freshRepo = new Repository(freshAdapter);
      await freshRepo.init();

      const counts = await freshRepo.restoreBackup(exportedBackup, 'replace');
      expect(counts.importedTransactions).toBe(2);
      expect(counts.importedKeywords).toBe(1);

      // 5. Verify restored data matches
      const restoredTxs = await freshRepo.listTransactions();
      expect(restoredTxs.length).toBe(2);

      const restoredTx1 = restoredTxs.find((t) => t.id === tx1.id);
      expect(restoredTx1).toBeDefined();
      expect(restoredTx1?.amount_paise).toBe(5000);
      expect(restoredTx1?.note).toBe('Biryani dinner');

      const restoredTx2 = restoredTxs.find((t) => t.id === tx2.id);
      expect(restoredTx2).toBeDefined();
      expect(restoredTx2?.type).toBe('income');
      expect(restoredTx2?.amount_paise).toBe(7500000);

      const restoredKw = await freshRepo.getKeyword('biryani');
      expect(restoredKw).toBeDefined();
      expect(restoredKw?.category_id).toBe(foodCat.id);

      await freshAdapter.closeAsync();
    });

    it('merges backup: newest updated_at wins in merge mode', async () => {
      const categories = await repo.getCategories();
      const transportCat = categories.find((c) => c.name === 'Transport')!;

      // Add a transaction in repo
      const originalTx = await repo.addTransaction({
        type: 'expense',
        amount_paise: 2000,
        category_id: transportCat.id,
        note: 'Metro train',
        occurred_on: '2026-10-04',
        source: 'manual',
      });

      // Prepare an incoming backup with a newer update to the same transaction
      const newerTime = new Date(Date.now() + 60000).toISOString();
      const incomingBackup: BackupData = {
        app: 'wini',
        schemaVersion: 1,
        exportedAt: newerTime,
        deviceId: 'device-2',
        categories,
        transactions: [
          {
            ...originalTx,
            amount_paise: 3500, // Updated amount
            note: 'Metro card recharge',
            updated_at: newerTime,
          },
          {
            id: 'tx-new-remote',
            type: 'expense',
            amount_paise: 1500,
            category_id: transportCat.id,
            note: 'Bus fare',
            occurred_on: '2026-10-04',
            source: 'voice',
            raw_text: 'bus 15',
            device_id: 'device-2',
            created_at: newerTime,
            updated_at: newerTime,
            deleted_at: null,
          },
        ],
        keywordMap: [],
      };

      await repo.restoreBackup(incomingBackup, 'merge');

      const currentTxs = await repo.listTransactions();
      expect(currentTxs.length).toBe(2);

      const mergedTx = currentTxs.find((t) => t.id === originalTx.id);
      expect(mergedTx?.amount_paise).toBe(3500);
      expect(mergedTx?.note).toBe('Metro card recharge');

      const newTx = currentTxs.find((t) => t.id === 'tx-new-remote');
      expect(newTx?.amount_paise).toBe(1500);
    });
  });
});
