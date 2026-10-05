import initSqlJs, { SqlJsStatic } from 'sql.js';
import { SqlJsDatabaseAdapter } from '../adapter';
import { Repository } from '../repository';
import {
  getWeekRange,
  getMonthRange,
  getQuarterRange,
  getYearRange,
  getTodayIndia,
} from '../../domain/dates';

describe('Wini v2 Reports, Accounts, Passbook and Vault Comprehensive Tests', () => {
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

  // =========================================================================
  // 1. WEEK START (MONDAY) TESTS
  // =========================================================================
  describe('Week Start (Monday to Sunday)', () => {
    test('given a Monday, week starts on that Monday and ends on Sunday', () => {
      // 2026-10-05 is a Monday
      const range = getWeekRange('2026-10-05');
      expect(range.startDate).toBe('2026-10-05');
      expect(range.endDate).toBe('2026-10-11');
      expect(range.key).toBe('W_2026-10-05');
    });

    test('given a Wednesday, week starts on preceding Monday and ends Sunday', () => {
      // 2026-10-07 is a Wednesday
      const range = getWeekRange('2026-10-07');
      expect(range.startDate).toBe('2026-10-05');
      expect(range.endDate).toBe('2026-10-11');
    });

    test('given a Sunday, week starts on Monday 6 days prior and ends that Sunday', () => {
      // 2026-10-11 is a Sunday
      const range = getWeekRange('2026-10-11');
      expect(range.startDate).toBe('2026-10-05');
      expect(range.endDate).toBe('2026-10-11');
    });

    test('week report aggregates transactions occurring strictly within Monday-Sunday boundary', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      // Monday tx
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 15000,
        category_id: food.id,
        occurred_on: '2026-10-05',
        source: 'manual',
        note: 'Monday lunch',
      });
      // Sunday tx (in week)
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 25000,
        category_id: food.id,
        occurred_on: '2026-10-11',
        source: 'manual',
        note: 'Sunday dinner',
      });
      // Following Monday tx (outside week)
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 50000,
        category_id: food.id,
        occurred_on: '2026-10-12',
        source: 'manual',
        note: 'Next Monday groceries',
      });

      const report = await repo.getPeriodReport('week', '2026-10-08');
      expect(report.totalExpensePaise).toBe(40000); // 150 + 250 = 400
      expect(report.topTransactions.length).toBe(2);
    });
  });

  // =========================================================================
  // 2. MONTH AND YEAR EDGES
  // =========================================================================
  describe('Month and Year Boundary Edges', () => {
    test('month start and end for December rollover', () => {
      const range = getMonthRange('2026-12-15');
      expect(range.startDate).toBe('2026-12-01');
      expect(range.endDate).toBe('2026-12-31');
      expect(range.key).toBe('2026-12');
    });

    test('month start and end for January', () => {
      const range = getMonthRange('2026-01-01');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-01-31');
      expect(range.key).toBe('2026-01');
    });

    test('year edge isolates transactions on 2025-12-31 from 2026-01-01', async () => {
      const incomeCat = (await repo.getCategoryByName('Income'))!;
      await repo.addTransaction({
        type: 'income',
        amount_paise: 100000,
        category_id: incomeCat.id,
        occurred_on: '2025-12-31',
        source: 'manual',
        note: 'Year end bonus',
      });
      await repo.addTransaction({
        type: 'income',
        amount_paise: 200000,
        category_id: incomeCat.id,
        occurred_on: '2026-01-01',
        source: 'manual',
        note: 'New year gift',
      });

      const rep2025 = await repo.getPeriodReport('year', '2025-06-15');
      expect(rep2025.totalIncomePaise).toBe(100000);

      const rep2026 = await repo.getPeriodReport('year', '2026-06-15');
      expect(rep2026.totalIncomePaise).toBe(200000);
    });

    test('first and last day of month transactions are included in month report', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 10000,
        category_id: food.id,
        occurred_on: '2026-05-01',
        source: 'manual',
        note: 'Day 1 coffee',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 20000,
        category_id: food.id,
        occurred_on: '2026-05-31',
        source: 'manual',
        note: 'Day 31 dinner',
      });

      const report = await repo.getPeriodReport('month', '2026-05-15');
      expect(report.totalExpensePaise).toBe(30000);
    });
  });

  // =========================================================================
  // 3. LEAP DAY (FEB 29) TESTS
  // =========================================================================
  describe('Leap Day (Feb 29)', () => {
    test('leap year 2024 has 29 days in February', () => {
      const range = getMonthRange('2024-02-15');
      expect(range.startDate).toBe('2024-02-01');
      expect(range.endDate).toBe('2024-02-29');
    });

    test('non-leap year 2023 has 28 days in February', () => {
      const range = getMonthRange('2023-02-10');
      expect(range.startDate).toBe('2023-02-01');
      expect(range.endDate).toBe('2023-02-28');
    });

    test('transaction on Feb 29 2024 is included in February 2024 report', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 45000,
        category_id: food.id,
        occurred_on: '2024-02-29',
        source: 'manual',
        note: 'Leap day dinner',
      });

      const rep = await repo.getPeriodReport('month', '2024-02-05');
      expect(rep.totalExpensePaise).toBe(45000);
    });
  });

  // =========================================================================
  // 4. CALENDAR VS INDIAN FY QUARTERS & BOUNDARY DATES
  // =========================================================================
  describe('Quarters: Calendar vs Indian FY', () => {
    test('calendar quarters are Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)', () => {
      expect(getQuarterRange('2026-01-15', 'calendar')).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        key: '2026_Q1',
      });
      expect(getQuarterRange('2026-05-15', 'calendar')).toEqual({
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        key: '2026_Q2',
      });
      expect(getQuarterRange('2026-08-15', 'calendar')).toEqual({
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        key: '2026_Q3',
      });
      expect(getQuarterRange('2026-11-15', 'calendar')).toEqual({
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        key: '2026_Q4',
      });
    });

    test('Indian FY quarters are Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)', () => {
      expect(getQuarterRange('2026-04-15', 'indian_fy')).toEqual({
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        key: 'FY2026_Q1',
      });
      expect(getQuarterRange('2026-08-15', 'indian_fy')).toEqual({
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        key: 'FY2026_Q2',
      });
      expect(getQuarterRange('2026-11-15', 'indian_fy')).toEqual({
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        key: 'FY2026_Q3',
      });
      // January 2027 is Q4 of FY2026
      expect(getQuarterRange('2027-02-15', 'indian_fy')).toEqual({
        startDate: '2027-01-01',
        endDate: '2027-03-31',
        key: 'FY2026_Q4',
      });
    });

    test('quarter boundary dates for Indian FY', () => {
      // April 1 (first day of FY Q1)
      expect(getQuarterRange('2026-04-01', 'indian_fy').key).toBe('FY2026_Q1');
      // June 30 (last day of FY Q1)
      expect(getQuarterRange('2026-06-30', 'indian_fy').key).toBe('FY2026_Q1');
      // March 31 (last day of FY Q4)
      expect(getQuarterRange('2026-03-31', 'indian_fy').key).toBe('FY2025_Q4');
    });

    test('Indian FY year range spans April 1 to March 31 next year', () => {
      const fyRange = getYearRange('2026-06-15', 'indian_fy');
      expect(fyRange.startDate).toBe('2026-04-01');
      expect(fyRange.endDate).toBe('2027-03-31');
      expect(fyRange.key).toBe('FY2026-2027');

      // In Feb 2027, FY is still FY2026-2027
      const febRange = getYearRange('2027-02-01', 'indian_fy');
      expect(febRange.startDate).toBe('2026-04-01');
      expect(febRange.endDate).toBe('2027-03-31');
      expect(febRange.key).toBe('FY2026-2027');
    });

    test('quarter report respects quarterBasis parameter', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      // Add transaction on 2026-01-15 (Q1 Calendar, but FY2025_Q4 in Indian FY)
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 9900,
        category_id: food.id,
        occurred_on: '2026-01-15',
        source: 'manual',
        note: 'Quarter test snack',
      });

      const calQ1 = await repo.getPeriodReport('quarter', '2026-01-15', 'calendar');
      expect(calQ1.totalExpensePaise).toBe(9900);
      expect(calQ1.periodKey).toBe('2026_Q1');

      const fyQ4 = await repo.getPeriodReport('quarter', '2026-01-15', 'indian_fy');
      expect(fyQ4.totalExpensePaise).toBe(9900);
      expect(fyQ4.periodKey).toBe('FY2025_Q4');
    });
  });

  // =========================================================================
  // 5. EMPTY PERIODS
  // =========================================================================
  describe('Empty Periods', () => {
    test('report on period with zero transactions returns clean zeroed data', async () => {
      const rep = await repo.getPeriodReport('month', '2026-09-01');
      expect(rep.totalIncomePaise).toBe(0);
      expect(rep.totalExpensePaise).toBe(0);
      expect(rep.netPaise).toBe(0);
      expect(rep.savingsRate).toBe(0);
      expect(rep.categoryBreakdown).toEqual([]);
      expect(rep.topTransactions).toEqual([]);
    });

    test('cashflow for empty week has 7 days with zero values', async () => {
      const rep = await repo.getPeriodReport('week', '2026-10-05');
      expect(rep.cashflow.length).toBe(7);
      for (const day of rep.cashflow) {
        expect(day.incomePaise).toBe(0);
        expect(day.expensePaise).toBe(0);
        expect(day.netPaise).toBe(0);
      }
    });
  });

  // =========================================================================
  // 6. PREVIOUS PERIOD COMPARISONS
  // =========================================================================
  describe('Previous Period Comparisons', () => {
    test('computes percentage changes against previous month', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      // Previous month (September 2026): Income 10,000, Expense 4,000
      await repo.addTransaction({
        type: 'income',
        amount_paise: 1000000,
        category_id: incomeCat.id,
        occurred_on: '2026-09-10',
        source: 'manual',
        note: 'Prev salary',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 400000,
        category_id: food.id,
        occurred_on: '2026-09-12',
        source: 'manual',
        note: 'Prev groceries',
      });

      // Current month (October 2026): Income 15,000 (+50%), Expense 2,000 (-50%)
      await repo.addTransaction({
        type: 'income',
        amount_paise: 1500000,
        category_id: incomeCat.id,
        occurred_on: '2026-10-02',
        source: 'manual',
        note: 'Curr salary',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 200000,
        category_id: food.id,
        occurred_on: '2026-10-03',
        source: 'manual',
        note: 'Curr groceries',
      });

      const rep = await repo.getPeriodReport('month', '2026-10-15');
      expect(rep.prevPeriod?.incomeChangePct).toBe(50);
      expect(rep.prevPeriod?.expenseChangePct).toBe(-50);
      expect(rep.netPaise).toBe(1300000);
      expect(rep.prevPeriod?.netPaise).toBe(600000);
    });

    test('previous period with 0 expense sets change pct to 0 without division by zero', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 5000,
        category_id: food.id,
        occurred_on: '2026-10-05',
        source: 'manual',
        note: 'Single expense',
      });

      const rep = await repo.getPeriodReport('month', '2026-10-10');
      expect(rep.prevPeriod?.expenseChangePct).toBe(0);
    });

    test('previous week comparison correctly pulls 7 days prior', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      // Week 1: 2026-09-28 to 2026-10-04 (prev week)
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 30000,
        category_id: food.id,
        occurred_on: '2026-09-30',
        source: 'manual',
        note: 'Prev week dinner',
      });
      // Week 2: 2026-10-05 to 2026-10-11 (current week)
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 60000,
        category_id: food.id,
        occurred_on: '2026-10-07',
        source: 'manual',
        note: 'Curr week feast',
      });

      const rep = await repo.getPeriodReport('week', '2026-10-07');
      expect(rep.prevPeriod?.totalExpensePaise).toBe(30000);
      expect(rep.totalExpensePaise).toBe(60000);
      expect(rep.prevPeriod?.expenseChangePct).toBe(100);
    });
  });

  // =========================================================================
  // 7. SAVINGS RATE EDGE CASES
  // =========================================================================
  describe('Savings Rate Edge Cases', () => {
    test('returns 0% when income is 0 and expenses exist', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 50000,
        category_id: food.id,
        occurred_on: '2026-10-05',
        source: 'manual',
        note: 'Expense without income',
      });

      const rep = await repo.getPeriodReport('month', '2026-10-10');
      expect(rep.savingsRate).toBe(0);
    });

    test('returns 0% when income is 0 and expense is 0', async () => {
      const rep = await repo.getPeriodReport('month', '2026-10-10');
      expect(rep.savingsRate).toBe(0);
    });

    test('clamps at 0% when expenses exceed income', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      await repo.addTransaction({
        type: 'income',
        amount_paise: 100000, // ₹1,000
        category_id: incomeCat.id,
        occurred_on: '2026-10-01',
        source: 'manual',
        note: 'Small stipend',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 300000, // ₹3,000
        category_id: food.id,
        occurred_on: '2026-10-02',
        source: 'manual',
        note: 'Big dinner',
      });

      const rep = await repo.getPeriodReport('month', '2026-10-05');
      expect(rep.savingsRate).toBe(0);
    });

    test('calculates accurate savings rate when income exceeds expenses', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      await repo.addTransaction({
        type: 'income',
        amount_paise: 1000000, // ₹10,000
        category_id: incomeCat.id,
        occurred_on: '2026-10-01',
        source: 'manual',
        note: 'Full paycheck',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 350000, // ₹3,500
        category_id: food.id,
        occurred_on: '2026-10-02',
        source: 'manual',
        note: 'Living costs',
      });

      const rep = await repo.getPeriodReport('month', '2026-10-05');
      // (10000 - 3500) / 10000 = 65.0%
      expect(rep.savingsRate).toBe(65);
    });
  });

  // =========================================================================
  // 8. CATEGORY PERCENTAGES SUMMING TO 100%
  // =========================================================================
  describe('Category Percentages', () => {
    test('category shares sum to 100% and are sorted descending', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const transport = (await repo.getCategoryByName('Transport'))!;
      const other = (await repo.getCategoryByName('Other'))!;

      await repo.addTransaction({
        type: 'expense',
        amount_paise: 50000, // 50%
        category_id: food.id,
        occurred_on: '2026-10-02',
        source: 'manual',
        note: 'Food groceries',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 30000, // 30%
        category_id: transport.id,
        occurred_on: '2026-10-03',
        source: 'manual',
        note: 'Cab ride',
      });
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 20000, // 20%
        category_id: other.id,
        occurred_on: '2026-10-04',
        source: 'manual',
        note: 'Other misc',
      });

      const rep = await repo.getPeriodReport('month', '2026-10-05');
      expect(rep.categoryBreakdown.length).toBe(3);

      // Verify descending order
      expect(rep.categoryBreakdown[0].category_name).toBe('Food');
      expect(rep.categoryBreakdown[1].category_name).toBe('Transport');
      expect(rep.categoryBreakdown[2].category_name).toBe('Other');

      // Verify shares
      expect(rep.categoryBreakdown[0].share_pct).toBe(50);
      expect(rep.categoryBreakdown[1].share_pct).toBe(30);
      expect(rep.categoryBreakdown[2].share_pct).toBe(20);

      const sum = rep.categoryBreakdown.reduce((acc, c) => acc + c.share_pct, 0);
      expect(sum).toBeCloseTo(100, 1);
    });
  });

  // =========================================================================
  // 9. PASSBOOK, RUNNING BALANCE, AND NULL account_id RULE
  // =========================================================================
  describe('Passbook, Running Balance & NULL account_id', () => {
    test('passbook orders strictly by occurred_on ASC, created_at ASC with accurate running balance', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const incomeCat = (await repo.getCategoryByName('Income'))!;

      const bank = await repo.createAccount({
        name: 'Salary Account',
        type: 'bank',
        opening_balance_paise: 100000, // Opening ₹1,000
      });

      // Entry 1: Income ₹5,000 on Oct 2
      await repo.addTransaction({
        type: 'income',
        amount_paise: 500000,
        category_id: incomeCat.id,
        account_id: bank.id,
        occurred_on: '2026-10-02',
        source: 'manual',
        note: 'Bank credit',
      });

      // Entry 2: Expense ₹1,500 on Oct 3
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 150000,
        category_id: food.id,
        account_id: bank.id,
        occurred_on: '2026-10-03',
        source: 'manual',
        note: 'Fine dining',
      });

      // Entry 3: Expense ₹500 on Oct 3 (created later)
      await repo.addTransaction({
        type: 'expense',
        amount_paise: 50000,
        category_id: food.id,
        account_id: bank.id,
        occurred_on: '2026-10-03',
        source: 'manual',
        note: 'Dessert',
      });

      const passbook = await repo.getAccountPassbook(bank.id);
      expect(passbook.length).toBe(3);

      // Entry 1: 1000 + 5000 = 6000
      expect(passbook[0].runningBalancePaise).toBe(600000);
      expect(passbook[0].creditPaise).toBe(500000);
      expect(passbook[0].debitPaise).toBeNull();

      // Entry 2: 6000 - 1500 = 4500
      expect(passbook[1].runningBalancePaise).toBe(450000);
      expect(passbook[1].debitPaise).toBe(150000);

      // Entry 3: 4500 - 500 = 4000
      expect(passbook[2].runningBalancePaise).toBe(400000);
      expect(passbook[2].debitPaise).toBe(50000);
    });

    test('transactions with NULL account_id count toward Cash account passbook and balance', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const cash = (await repo.getAccountById('acc_cash'))!;

      // Insert transaction directly with NULL account_id (simulating legacy v1 data)
      await adapter.runAsync(`
        INSERT INTO transactions (id, device_id, type, amount_paise, category_id, account_id, note, occurred_on, source, created_at, updated_at)
        VALUES ('legacy_tx_1', 'dev_test', 'expense', 4500, ?, NULL, 'Legacy tea', '2026-10-01', 'manual', '2026-10-01T10:00:00Z', '2026-10-01T10:00:00Z');
      `, [food.id]);

      const balance = await repo.getAccountBalance('acc_cash');
      expect(balance).toBe(cash.opening_balance_paise - 4500);

      const passbook = await repo.getAccountPassbook('acc_cash');
      const found = passbook.find((p) => p.transaction.id === 'legacy_tx_1');
      expect(found).toBeDefined();
      expect(found?.debitPaise).toBe(4500);
    });

    test('assignUnassignedTransactions reassigns NULL account_id transactions and returns count', async () => {
      const food = (await repo.getCategoryByName('Food'))!;
      const newBank = await repo.createAccount({
        name: 'ICICI Bank',
        type: 'bank',
        opening_balance_paise: 0,
      });

      // Insert 2 legacy NULL transactions
      await adapter.runAsync(`
        INSERT INTO transactions (id, device_id, type, amount_paise, category_id, account_id, note, occurred_on, source, created_at, updated_at)
        VALUES 
          ('null_tx_1', 'dev_test', 'expense', 1000, ?, NULL, 'T1', '2026-10-01', 'manual', '2026-10-01T10:00:00Z', '2026-10-01T10:00:00Z'),
          ('null_tx_2', 'dev_test', 'expense', 2000, ?, NULL, 'T2', '2026-10-01', 'manual', '2026-10-01T10:00:00Z', '2026-10-01T10:00:00Z');
      `, [food.id, food.id]);

      const updatedCount = await repo.assignUnassignedTransactions(newBank.id);
      expect(updatedCount).toBe(2);

      const t1 = await repo.getTransaction('null_tx_1');
      const t2 = await repo.getTransaction('null_tx_2');
      expect(t1?.account_id).toBe(newBank.id);
      expect(t2?.account_id).toBe(newBank.id);

      // Subsequent call updates 0
      const rerunCount = await repo.assignUnassignedTransactions(newBank.id);
      expect(rerunCount).toBe(0);
    });
  });

  // =========================================================================
  // 10. INVESTMENT VALUATION HISTORY AND CHANGE
  // =========================================================================
  describe('Investment Valuation History and Changes', () => {
    test('records valuations and returns chronological history with latest value', async () => {
      const fund = await repo.createAccount({
        name: 'Nifty 50 Index Fund',
        type: 'investment',
        opening_balance_paise: 10000000, // ₹1,00,000
      });

      // Record valuation 1
      await repo.addValuation(fund.id, 10500000, '2026-08-01');

      // Record valuation 2
      await repo.addValuation(fund.id, 11200000, '2026-09-01');

      const history = await repo.getValuationHistory(fund.id);
      expect(history.length).toBe(2);
      expect(history[0].recorded_on).toBe('2026-09-01'); // Most recent first
      expect(history[1].recorded_on).toBe('2026-08-01');

      // Account balance should reflect latest valuation
      const balance = await repo.getAccountBalance(fund.id);
      expect(balance).toBe(11200000);
    });
  });

  // =========================================================================
  // 11. EXACT ALIAS MATCHING ("hdfc" vs "hdfcx")
  // =========================================================================
  describe('Exact Alias Matching', () => {
    test('matches exact name and aliases within spoken phrases using word boundaries', async () => {
      const hdfc = await repo.createAccount({
        name: 'HDFC Bank',
        type: 'bank',
        opening_balance_paise: 0,
        aliases: ['hdfc'],
      });

      // Exact match
      const m1 = await repo.getAccountByAlias('hdfc');
      expect(m1?.id).toBe(hdfc.id);

      // Phrase with whole word
      const m2 = await repo.getAccountByAlias('paid 500 from hdfc debit');
      expect(m2?.id).toBe(hdfc.id);

      // "hdfcx" should NOT match "hdfc"
      const m3 = await repo.getAccountByAlias('hdfcx');
      expect(m3).toBeNull();

      // "hdfcbank" should NOT match "hdfc"
      const m4 = await repo.getAccountByAlias('paid with hdfcbank');
      expect(m4).toBeNull();
    });

    test('matches cash and hindi aliases', async () => {
      const cash = await repo.getAccountByAlias('nakad');
      expect(cash?.id).toBe('acc_cash');

      const cash2 = await repo.getAccountByAlias('from cash');
      expect(cash2?.id).toBe('acc_cash');
    });

    test('ignores soft-deleted accounts during alias resolution', async () => {
      const tempAcc = await repo.createAccount({
        name: 'Temp Wallet',
        type: 'wallet',
        opening_balance_paise: 0,
        aliases: ['tempwallet'],
      });

      const foundBefore = await repo.getAccountByAlias('tempwallet');
      expect(foundBefore?.id).toBe(tempAcc.id);

      await repo.deleteAccount(tempAcc.id);

      const foundAfter = await repo.getAccountByAlias('tempwallet');
      expect(foundAfter).toBeNull();
    });
  });

  // =========================================================================
  // 12. GUARDS AGAINST DELETING SYSTEM CATEGORIES
  // =========================================================================
  describe('System Category Deletion Guards', () => {
    test('throws error when trying to delete system category cat_other or cat-other', async () => {
      const other = (await repo.getCategoryByName('Other'))!;
      expect(other.is_system).toBe(1);

      await expect(repo.deleteCategory(other.id)).rejects.toThrow(
        /Cannot delete system category/
      );
    });

    test('throws error when trying to delete system category cat_income or cat-income', async () => {
      const income = (await repo.getCategoryByName('Income'))!;
      expect(income.is_system).toBe(1);

      await expect(repo.deleteCategory(income.id)).rejects.toThrow(
        /Cannot delete system category/
      );
    });

    test('allows deleting user category and reassigns transactions to fallback', async () => {
      const custom = await repo.addCategory({
        name: 'Gym Subscription',
        emoji: '🏋️',
        color: '#FF5722',
        kind: 'expense',
      });

      const tx = await repo.addTransaction({
        type: 'expense',
        amount_paise: 250000,
        category_id: custom.id,
        occurred_on: getTodayIndia(),
        source: 'manual',
        note: 'Monthly gym fee',
      });

      await repo.deleteCategory(custom.id);

      const retrieved = await repo.getTransaction(tx.id);
      expect(retrieved?.category_id).toBe('cat-other');
    });
  });

  // =========================================================================
  // 13. ENCRYPTED BLOBS VALIDATION (VAULT)
  // =========================================================================
  describe('Vault Encrypted Blob Security Guards', () => {
    test('createVaultBank rejects plain string without enc:v1: prefix', async () => {
      await expect(
        repo.createVaultBank({
          bank_name: 'SBI Bank',
          account_holder_name_encrypted: 'Plain text name', // Invalid!
          account_number_encrypted: 'enc:v1:12345',
          ifsc_encrypted: 'enc:v1:SBIN0001',
        })
      ).rejects.toThrow(/must be an encrypted blob starting with "enc:v1:"/);
    });

    test('createVaultBank rejects unencrypted account number or ifsc', async () => {
      await expect(
        repo.createVaultBank({
          bank_name: 'SBI Bank',
          account_holder_name_encrypted: 'enc:v1:name',
          account_number_encrypted: '1234567890', // Invalid!
          ifsc_encrypted: 'enc:v1:SBIN0001',
        })
      ).rejects.toThrow(/must be an encrypted blob starting with "enc:v1:"/);

      await expect(
        repo.createVaultBank({
          bank_name: 'SBI Bank',
          account_holder_name_encrypted: 'enc:v1:name',
          account_number_encrypted: 'enc:v1:1234567890',
          ifsc_encrypted: 'SBIN0001', // Invalid!
        })
      ).rejects.toThrow(/must be an encrypted blob starting with "enc:v1:"/);
    });

    test('updateVaultBank rejects plain string when updating encrypted fields', async () => {
      const bank = await repo.createVaultBank({
        bank_name: 'Axis Bank',
        account_holder_name_encrypted: 'enc:v1:holder',
        account_number_encrypted: 'enc:v1:acc',
        ifsc_encrypted: 'enc:v1:ifsc',
      });

      await expect(
        repo.updateVaultBank(bank.id, {
          account_number_encrypted: 'plain_new_account', // Invalid!
        })
      ).rejects.toThrow(/must be an encrypted blob starting with "enc:v1:"/);
    });

    test('createVaultCard rejects plain string without enc:v1: prefix', async () => {
      await expect(
        repo.createVaultCard({
          nickname: 'SBI Card',
          network: 'visa',
          card_number_encrypted: '4111111111111111', // Plain card number, dangerous!
          holder_name_encrypted: 'enc:v1:holder',
        })
      ).rejects.toThrow(/must be an encrypted blob starting with "enc:v1:"/);

      await expect(
        repo.createVaultCard({
          nickname: 'SBI Card',
          network: 'visa',
          card_number_encrypted: 'enc:v1:4111111111111111',
          holder_name_encrypted: 'Unencrypted Holder', // Invalid!
        })
      ).rejects.toThrow(/must be an encrypted blob starting with "enc:v1:"/);
    });

    test('stores and retrieves valid enc:v1: encrypted records', async () => {
      const card = await repo.createVaultCard({
        nickname: 'HDFC Regalia',
        network: 'mastercard',
        card_number_encrypted: 'enc:v1:aes256_mock_blob',
        holder_name_encrypted: 'enc:v1:aes256_mock_name',
        billing_day: 20,
      });

      expect(card.id).toBeDefined();
      expect(card.card_number_encrypted).toBe('enc:v1:aes256_mock_blob');

      const retrieved = await repo.getVaultCardById(card.id);
      expect(retrieved?.holder_name_encrypted).toBe('enc:v1:aes256_mock_name');
    });
  });

  // =========================================================================
  // 14. MIGRATION SNAPSHOT CLEANUP
  // =========================================================================
  describe('Migration Snapshot Table Cleanup', () => {
    test('confirms that no temporary snapshot tables exist in database', async () => {
      const snapshotTables = await adapter.getAllAsync<any>(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '_v2_migration_snapshot_%';`
      );
      expect(snapshotTables.length).toBe(0);
    });
  });
});
