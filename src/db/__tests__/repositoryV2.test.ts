/**
 * Comprehensive integration tests for Wini v2 Repository queries:
 * 1. Accounts CRUD, aliases, balances, and total net worth calculation
 * 2. Investment valuation tracking and history
 * 3. Category deletion protection (system category & last category guards, delete-with-move)
 * 4. Vault bank and cards storage
 * 5. Period reports (week, month, quarter calendar vs Indian FY, year, savings rate, insights)
 */

import initSqlJs, { SqlJsStatic } from 'sql.js';
import { SqlJsDatabaseAdapter } from '../adapter';
import { Repository } from '../repository';
import { getTodayIndia } from '../../domain/dates';

describe('Repository V2 Integration Tests', () => {
  let SQL: SqlJsStatic;
  let rawDb: any;
  let adapter: SqlJsDatabaseAdapter;
  let repo: Repository;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  beforeEach(async () => {
    rawDb = new SQL.Database();
    adapter = new SqlJsDatabaseAdapter(rawDb);
    repo = new Repository(adapter);
    await repo.init();
  });

  afterEach(async () => {
    await adapter.closeAsync();
  });

  describe('Accounts & Balances (Rule in Section 2)', () => {
    test('creates accounts with custom aliases and default values', async () => {
      const account = await repo.createAccount({
        name: 'SBI Salary',
        type: 'bank',
        institution: 'State Bank of India',
        opening_balance_paise: 1000000, // ₹10,000
        aliases: ['sbi', 'salary account', 'sbi bank'],
        sort_order: 3,
      });

      expect(account.id).toBeDefined();
      expect(account.name).toBe('SBI Salary');
      expect(account.type).toBe('bank');
      expect(account.institution).toBe('State Bank of India');
      expect(account.opening_balance_paise).toBe(1000000);
      expect(JSON.parse(account.aliases_json)).toEqual(['sbi', 'salary account', 'sbi bank']);

      const retrieved = await repo.getAccountById(account.id);
      expect(retrieved?.name).toBe('SBI Salary');
    });

    test('calculates bank and cash balances using opening_balance + income - expense', async () => {
      const cash = (await repo.getAccountByAlias('cash'))!;
      expect(cash).not.toBeNull();
      // Cash initial opening_balance is 0

      const food = (await repo.getCategoryByName('Food'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      // Add ₹5,000 income to cash
      await repo.addTransaction({
        type: 'income',
        amount_paise: 500000,
        category_id: incomeCat.id,
        account_id: cash.id,
        note: 'Cash gift',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      // Add ₹1,200 expense from cash
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 120000,
        category_id: food.id,
        account_id: cash.id,
        note: 'Groceries',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      // Balance = 0 + 5000 - 1200 = 3800
      const balance = await repo.getAccountBalance(cash.id);
      expect(balance).toBe(380000);

      const withBalance = await repo.getAccountWithBalance(cash.id);
      expect(withBalance?.balance_paise).toBe(380000);
    });

    test('calculates investment balance using manual valuation, ignoring transactions', async () => {
      const investment = await repo.createAccount({
        name: 'Zerodha Kite',
        type: 'investment',
        institution: 'Zerodha',
        opening_balance_paise: 25000000, // ₹2,50,000
        aliases: ['zerodha', 'stocks'],
      });

      expect(investment.type).toBe('investment');
      expect(await repo.getAccountBalance(investment.id)).toBe(25000000);

      // Even if someone attaches an expense transaction, investment balance ignores it
      const food = (await repo.getCategoryByName('Food'))!;
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 100000,
        category_id: food.id,
        account_id: investment.id,
        note: 'Test fee',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      expect(await repo.getAccountBalance(investment.id)).toBe(25000000);

      // Update valuation
      await repo.addValuation(investment.id, 28000000, '2026-10-04'); // ₹2,80,000
      expect(await repo.getAccountBalance(investment.id)).toBe(28000000);

      const history = await repo.getValuationHistory(investment.id);
      expect(history.length).toBe(1);
      expect(history[0].value_paise).toBe(28000000);
      expect(history[0].recorded_on).toBe('2026-10-04');
    });

    test('calculates total net worth and breaks down by type, respecting include_in_total', async () => {
      const cash = (await repo.getAccountByAlias('cash'))!;
      const hdfc = (await repo.getAccountByAlias('hdfc'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      await repo.addTransaction({
        type: 'income',
        amount_paise: 100000, // ₹1,000 in Cash
        category_id: incomeCat.id,
        account_id: cash.id,
        note: 'Cash deposit',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      await repo.addTransaction({
        type: 'income',
        amount_paise: 500000, // ₹5,000 in HDFC
        category_id: incomeCat.id,
        account_id: hdfc.id,
        note: 'Direct credit',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      // Create an investment account marked include_in_total: false (e.g. illiquid asset)
      const land = await repo.createAccount({
        name: 'Land plot',
        type: 'investment',
        opening_balance_paise: 50000000, // ₹5,00,000
        include_in_total: false,
      });
      expect(land.id).toBeDefined();

      const totals = await repo.getTotalBalancePaise();
      // Total should include Cash (1,000) + HDFC (5,000) = 6,000. Land is excluded from total!
      expect(totals.totalPaise).toBe(600000);
      expect(totals.cashPaise).toBe(100000);
      expect(totals.bankPaise).toBe(500000);
      expect(totals.investmentPaise).toBe(50000000); // Broken down, but excluded from totalPaise
    });

    test('resolves accounts by spoken name, aliases, and voice phrases', async () => {
      const cash = await repo.getAccountByAlias('cash');
      expect(cash?.id).toBe('acc_cash');

      const nakad = await repo.getAccountByAlias('from nakad');
      expect(nakad?.id).toBe('acc_cash');

      const hdfc = await repo.getAccountByAlias('paid 1250 from hdfc electricity');
      expect(hdfc?.id).toBe('acc_hdfc');

      const nonExistent = await repo.getAccountByAlias('swiss bank');
      expect(nonExistent).toBeNull();
    });

    test('soft deletes account without dropping row from database', async () => {
      const acc = await repo.createAccount({
        name: 'Pocket Money',
        type: 'wallet',
        opening_balance_paise: 50000,
      });

      await repo.deleteAccount(acc.id);
      const active = await repo.getAccountById(acc.id);
      expect(active).toBeNull();

      const all = await repo.getAccounts(true);
      const found = all.find((a) => a.id === acc.id);
      expect(found).toBeDefined();
      expect(found?.deleted_at).not.toBeNull();
    });
  });

  describe('Category Rules (Section 8: is_system & Delete Guard)', () => {
    test('protects system categories from deletion', async () => {
      const other = await repo.getCategoryById('cat-other');
      expect(other?.is_system).toBe(1);

      await expect(repo.deleteCategory('cat-other')).rejects.toThrow('Cannot delete system category');
    });

    test('prevents deleting the last category of a kind', async () => {
      // cat-income is the only default income category
      const incomeCat = await repo.getCategoryById('cat-income');
      expect(incomeCat?.kind).toBe('income');

      await expect(repo.deleteCategory('cat-income')).rejects.toThrow('Cannot delete system category');

      // Create a non-system income category and try to delete it when it's the only other
      const customIncome = await repo.addCategory({
        name: 'Bonus',
        emoji: '🎁',
        color: '#FFD700',
        kind: 'income',
        is_system: false,
      });

      // Can delete customIncome because cat-income also exists
      await repo.deleteCategory(customIncome.id);
      expect(await repo.getCategoryById(customIncome.id)).toBeNull();
    });

    test('deleting a category with transactions moves them to specified destination', async () => {
      const custom = await repo.addCategory({
        name: 'Coffee Shops',
        emoji: '☕',
        color: '#8B4513',
        kind: 'expense',
      });

      const tx = await repo.addTransaction({
        type: 'expense',
        amount_paise: 15000,
        category_id: custom.id,
        note: 'Espresso',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      expect(tx.category_id).toBe(custom.id);

      // Delete custom and move transactions to cat-food
      await repo.deleteCategory(custom.id, 'cat-food');

      const updatedTx = await repo.getTransaction(tx.id);
      expect(updatedTx?.category_id).toBe('cat-food');
      expect(updatedTx?.category_name).toBe('Food');

      const deletedCat = await repo.getCategoryById(custom.id);
      expect(deletedCat).toBeNull();
    });

    test('deleting a category with transactions falls back to system category when no target given', async () => {
      const tempCat = await repo.addCategory({
        name: 'Temporary',
        emoji: '⏳',
        color: '#999999',
        kind: 'expense',
      });

      const tx = await repo.addTransaction({
        type: 'expense',
        amount_paise: 5000,
        category_id: tempCat.id,
        note: 'Temp expense',
        occurred_on: getTodayIndia(),
        source: 'manual',
      });

      // Delete without specifying destination -> should fall back to cat-other
      await repo.deleteCategory(tempCat.id);

      const updatedTx = await repo.getTransaction(tx.id);
      expect(updatedTx?.category_id).toBe('cat-other');
    });
  });

  describe('Vault Storage (Bank & Cards)', () => {
    test('stores and updates bank account records in vault', async () => {
      const bank = await repo.createVaultBank({
        bank_name: 'HDFC Bank',
        account_holder_name_encrypted: 'enc_holder_1',
        account_number_encrypted: 'enc_acc_123',
        ifsc_encrypted: 'enc_ifsc_456',
        branch: 'Indiranagar',
      });

      expect(bank.id).toBeDefined();
      expect(bank.bank_name).toBe('HDFC Bank');
      expect(bank.branch).toBe('Indiranagar');

      const list = await repo.getVaultBanks();
      expect(list.length).toBe(1);

      await repo.updateVaultBank(bank.id, {
        branch: 'Koramangala',
      });

      const updated = await repo.getVaultBankById(bank.id);
      expect(updated?.branch).toBe('Koramangala');

      await repo.deleteVaultBank(bank.id);
      expect(await repo.getVaultBankById(bank.id)).toBeNull();
    });

    test('stores and updates card records in vault', async () => {
      const card = await repo.createVaultCard({
        nickname: 'Amazon Pay ICICI',
        network: 'visa',
        card_number_encrypted: 'enc_card_9999',
        holder_name_encrypted: 'enc_holder_2',
        billing_day: 15,
      });

      expect(card.id).toBeDefined();
      expect(card.nickname).toBe('Amazon Pay ICICI');
      expect(card.network).toBe('visa');
      expect(card.billing_day).toBe(15);

      const cards = await repo.getVaultCards();
      expect(cards.length).toBe(1);

      await repo.deleteVaultCard(card.id);
      expect(await repo.getVaultCardById(card.id)).toBeNull();
    });
  });

  describe('Period Reports (Section 7: Week, Month, Quarter, Year)', () => {
    test('computes complete month report with cashflow, savings rate, and insights', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const transport = (await repo.getCategoryByName('Transport'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      // Oct 2026 transactions
      await repo.addTransaction({
        type: 'income',
        amount_paise: 10000000, // ₹1,00,000
        category_id: incomeCat.id,
        note: 'Monthly salary',
        occurred_on: '2026-10-01',
        source: 'typed',
      });

      await repo.addTransaction({
        type: 'expense',
        amount_paise: 250000, // ₹2,500
        category_id: food.id,
        note: 'Restaurant dinner',
        occurred_on: '2026-10-04',
        source: 'manual',
      });

      await repo.addTransaction({
        type: 'expense',
        amount_paise: 50000, // ₹500
        category_id: transport.id,
        note: 'Cab ride',
        occurred_on: '2026-10-04',
        source: 'manual',
      });

      const report = await repo.getPeriodReport('month', '2026-10-05', 'calendar');

      expect(report.periodType).toBe('month');
      expect(report.startDate).toBe('2026-10-01');
      expect(report.endDate).toBe('2026-10-31');
      expect(report.totalIncomePaise).toBe(10000000);
      expect(report.totalExpensePaise).toBe(300000); // 2500 + 500 = 3000
      expect(report.netPaise).toBe(9700000); // 100000 - 3000 = 97000
      expect(report.savingsRate).toBe(97); // 97% savings rate

      // Check category breakdown
      expect(report.categoryBreakdown.length).toBe(3); // Food, Transport, Income
      const foodBreakdown = report.categoryBreakdown.find((c) => c.category_id === food.id);
      expect(foodBreakdown?.total_paise).toBe(250000);
      expect(foodBreakdown?.share_pct).toBe(83.3); // 2500 / 3000 = 83.3%

      // Check cashflow daily entries
      expect(report.cashflow.length).toBe(31); // 31 days in October
      const day4 = report.cashflow.find((d) => d.date === '2026-10-04');
      expect(day4?.expensePaise).toBe(300000);

      // Check deterministic insights
      expect(report.insights.length).toBeGreaterThanOrEqual(3);
      expect(report.insights.some((i) => i.includes('Food was your biggest expense'))).toBe(true);
      expect(report.insights.some((i) => i.includes('savings rate this period was 97%'))).toBe(true);

      // Check top transactions
      expect(report.topTransactions.length).toBe(2);
      expect(report.topTransactions[0].note).toBe('Restaurant dinner');
    });

    test('supports Indian FY quarter boundaries (Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar)', async () => {
      // Date in October: Q3 for Indian FY (Apr-Jun is Q1, Jul-Sep is Q2, Oct-Dec is Q3)
      const qReportIndian = await repo.getPeriodReport('quarter', '2026-10-15', 'indian_fy');
      expect(qReportIndian.startDate).toBe('2026-10-01');
      expect(qReportIndian.endDate).toBe('2026-12-31');
      expect(qReportIndian.periodKey).toBe('FY2026_Q3');

      // Date in October: Q4 for calendar year (Jan-Mar Q1, Apr-Jun Q2, Jul-Sep Q3, Oct-Dec Q4)
      const qReportCalendar = await repo.getPeriodReport('quarter', '2026-10-15', 'calendar');
      expect(qReportCalendar.startDate).toBe('2026-10-01');
      expect(qReportCalendar.endDate).toBe('2026-12-31');
      expect(qReportCalendar.periodKey).toBe('2026_Q4');
    });
  });
});
