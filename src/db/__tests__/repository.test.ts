import initSqlJs, { SqlJsStatic } from 'sql.js';
import { SqlJsDatabaseAdapter } from '../adapter';
import { Repository } from '../repository';
import { getTodayIndia, getRelativeDateIndia } from '../../domain/dates';
import { rupeesToPaise, formatRupees, paiseToRupees } from '../../domain/money';

describe('Repository Integration Tests (plain Node with SQLite via sql.js)', () => {
  let SQL: SqlJsStatic;
  let db: any;
  let adapter: SqlJsDatabaseAdapter;
  let repo: Repository;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  beforeEach(async () => {
    // In-memory WebAssembly SQLite for isolated, fast unit testing
    db = new SQL.Database();
    adapter = new SqlJsDatabaseAdapter(db);
    repo = new Repository(adapter);
    await repo.init();
  });

  afterEach(async () => {
    await adapter.closeAsync();
  });

  test('seeds default categories on initialization', async () => {
    const categories = await repo.getCategories();
    expect(categories.length).toBe(8);

    const food = await repo.getCategoryByName('food');
    expect(food).not.toBeNull();
    expect(food?.emoji).toBe('🍔');
    expect(food?.kind).toBe('expense');

    const income = await repo.getCategoryByName('Income');
    expect(income).not.toBeNull();
    expect(income?.emoji).toBe('💰');
    expect(income?.kind).toBe('income');
  });

  test('adds an expense transaction and retrieves it', async () => {
    const food = await repo.getCategoryByName('Food');
    expect(food).not.toBeNull();

    const today = getTodayIndia();
    const tx = await repo.addTransaction({
      type: 'expense',
      amount_paise: 25000, // ₹250
      category_id: food!.id,
      note: 'Lunch with team',
      occurred_on: today,
      source: 'manual',
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount_paise).toBe(25000);
    expect(tx.note).toBe('Lunch with team');
    expect(tx.deleted_at).toBeNull();

    const retrieved = await repo.getTransaction(tx.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(tx.id);
    expect(retrieved?.category_name).toBe('Food');
    expect(retrieved?.category_emoji).toBe('🍔');
  });

  test('rejects non-positive or float amount_paise', async () => {
    const food = await repo.getCategoryByName('Food');

    await expect(
      repo.addTransaction({
        type: 'expense',
        amount_paise: 0,
        category_id: food!.id,
        note: 'Zero test',
        occurred_on: getTodayIndia(),
        source: 'manual',
      })
    ).rejects.toThrow();

    await expect(
      repo.addTransaction({
        type: 'expense',
        amount_paise: -500,
        category_id: food!.id,
        note: 'Negative test',
        occurred_on: getTodayIndia(),
        source: 'manual',
      })
    ).rejects.toThrow();

    await expect(
      repo.addTransaction({
        type: 'expense',
        amount_paise: 12.5 as any,
        category_id: food!.id,
        note: 'Float test',
        occurred_on: getTodayIndia(),
        source: 'manual',
      })
    ).rejects.toThrow();
  });

  test('updates transaction fields properly', async () => {
    const food = await repo.getCategoryByName('Food');
    const transport = await repo.getCategoryByName('Transport');

    const tx = await repo.addTransaction({
      type: 'expense',
      amount_paise: 1000,
      category_id: food!.id,
      note: 'Chai',
      occurred_on: getTodayIndia(),
      source: 'voice',
    });

    const updated = await repo.updateTransaction(tx.id, {
      amount_paise: 1500,
      category_id: transport!.id,
      note: 'Metro card',
    });

    expect(updated.amount_paise).toBe(1500);
    expect(updated.category_id).toBe(transport!.id);
    expect(updated.note).toBe('Metro card');

    const fresh = await repo.getTransaction(tx.id);
    expect(fresh?.category_name).toBe('Transport');
    expect(fresh?.amount_paise).toBe(1500);
  });

  test('soft delete and undo delete works and filters correctly', async () => {
    const food = await repo.getCategoryByName('Food');
    const tx = await repo.addTransaction({
      type: 'expense',
      amount_paise: 5000,
      category_id: food!.id,
      note: 'Dinner',
      occurred_on: getTodayIndia(),
      source: 'manual',
    });

    // Before delete
    let list = await repo.listTransactions();
    expect(list.length).toBe(1);

    // Soft delete
    await repo.softDeleteTransaction(tx.id);
    list = await repo.listTransactions();
    expect(list.length).toBe(0);

    const deletedRecord = await repo.getTransaction(tx.id);
    expect(deletedRecord).toBeNull();

    // Undo delete
    await repo.undoDeleteTransaction(tx.id);
    list = await repo.listTransactions();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(tx.id);
  });

  test('groups transactions by day and calculates daily totals', async () => {
    const food = await repo.getCategoryByName('Food');
    const income = await repo.getCategoryByName('Income');
    const today = getTodayIndia();
    const yesterday = getRelativeDateIndia(-1);

    await repo.addTransaction({
      type: 'expense',
      amount_paise: 10000, // ₹100
      category_id: food!.id,
      note: 'Food today',
      occurred_on: today,
      source: 'manual',
    });

    await repo.addTransaction({
      type: 'income',
      amount_paise: 50000, // ₹500
      category_id: income!.id,
      note: 'Freelance today',
      occurred_on: today,
      source: 'manual',
    });

    await repo.addTransaction({
      type: 'expense',
      amount_paise: 20000, // ₹200
      category_id: food!.id,
      note: 'Food yesterday',
      occurred_on: yesterday,
      source: 'manual',
    });

    const groups = await repo.listTransactionsGroupedByDay();
    expect(groups.length).toBe(2);

    expect(groups[0].date).toBe(today);
    expect(groups[0].displayDate).toBe('Today');
    expect(groups[0].totalExpensePaise).toBe(10000);
    expect(groups[0].totalIncomePaise).toBe(50000);

    expect(groups[1].date).toBe(yesterday);
    expect(groups[1].displayDate).toBe('Yesterday');
    expect(groups[1].totalExpensePaise).toBe(20000);
  });

  test('calculates period totals and category totals accurately', async () => {
    const food = await repo.getCategoryByName('Food');
    const bills = await repo.getCategoryByName('Bills');
    const income = await repo.getCategoryByName('Income');
    const today = getTodayIndia();

    await repo.addTransaction({
      type: 'expense',
      amount_paise: 30000, // ₹300
      category_id: food!.id,
      note: 'Groceries',
      occurred_on: today,
      source: 'manual',
    });

    await repo.addTransaction({
      type: 'expense',
      amount_paise: 70000, // ₹700
      category_id: bills!.id,
      note: 'Electricity',
      occurred_on: today,
      source: 'manual',
    });

    await repo.addTransaction({
      type: 'income',
      amount_paise: 150000, // ₹1500
      category_id: income!.id,
      note: 'Salary credit',
      occurred_on: today,
      source: 'manual',
    });

    const totals = await repo.getTotalsByPeriod(today, today);
    expect(totals.totalExpensePaise).toBe(100000);
    expect(totals.totalIncomePaise).toBe(150000);
    expect(totals.netPaise).toBe(50000);
    expect(totals.count).toBe(3);

    const catTotals = await repo.getTotalsByCategory(today, today, 'expense');
    expect(catTotals.length).toBe(2);
    expect(catTotals[0].category_name).toBe('Bills');
    expect(catTotals[0].total_paise).toBe(70000);
    expect(catTotals[0].percentage).toBe(70);

    expect(catTotals[1].category_name).toBe('Food');
    expect(catTotals[1].total_paise).toBe(30000);
    expect(catTotals[1].percentage).toBe(30);
  });

  test('manages learned keywords in keyword_map', async () => {
    const transport = await repo.getCategoryByName('Transport');

    await repo.setKeyword('tuk-tuk', transport!.id);
    const entry = await repo.getKeyword('tuk-tuk');
    expect(entry).not.toBeNull();
    expect(entry?.category_id).toBe(transport!.id);

    // Overwriting updates keyword
    const food = await repo.getCategoryByName('Food');
    await repo.setKeyword('tuk-tuk', food!.id);
    const updated = await repo.getKeyword('tuk-tuk');
    expect(updated?.category_id).toBe(food!.id);
  });

  test('backup round-trip export and restore', async () => {
    const food = await repo.getCategoryByName('Food');
    const today = getTodayIndia();

    await repo.addTransaction({
      type: 'expense',
      amount_paise: 12300,
      category_id: food!.id,
      note: 'Roundtrip test',
      occurred_on: today,
      source: 'manual',
    });
    await repo.setKeyword('testkw', food!.id);

    const backup = await repo.getAllDataForBackup();
    expect(backup.app).toBe('wini');
    expect(backup.transactions.length).toBe(1);
    expect(backup.keywordMap.length).toBe(1);

    // In a fresh database, restore
    const freshDb = new SQL.Database();
    const freshAdapter = new SqlJsDatabaseAdapter(freshDb);
    const freshRepo = new Repository(freshAdapter);
    await freshRepo.init();

    await freshRepo.restoreBackup(backup, 'replace');
    const restoredTxs = await freshRepo.listTransactions();
    expect(restoredTxs.length).toBe(1);
    expect(restoredTxs[0].note).toBe('Roundtrip test');
    expect(restoredTxs[0].amount_paise).toBe(12300);

    const restoredKw = await freshRepo.getKeyword('testkw');
    expect(restoredKw).not.toBeNull();
    await freshAdapter.closeAsync();
  });
});

describe('Money utility tests', () => {
  test('converts rupees to paise accurately', () => {
    expect(rupeesToPaise(10)).toBe(1000);
    expect(rupeesToPaise('10')).toBe(1000);
    expect(rupeesToPaise('10.50')).toBe(1050);
    expect(rupeesToPaise('1,250')).toBe(125000);
    expect(rupeesToPaise('₹1,250.75')).toBe(125075);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(-10)).toBe(0);
  });

  test('formats paise to rupees with Indian grouping and symbol', () => {
    expect(formatRupees(1000)).toBe('₹10');
    expect(formatRupees(1050)).toBe('₹10.50');
    expect(formatRupees(125000)).toBe('₹1,250');
    expect(formatRupees(10000000)).toBe('₹1,00,000');
    expect(formatRupees(5000, true)).toBe('+₹50');
    expect(formatRupees(-5000)).toBe('-₹50');
  });

  test('converts paise to rupees float', () => {
    expect(paiseToRupees(1050)).toBe(10.5);
    expect(paiseToRupees(1000)).toBe(10);
  });
});
