import unittest
import os
import random
import datetime
from db.database import init_db, get_connection
from db.transactions import (
    add_transaction, update_transaction, delete_transaction,
    get_totals, get_monthly_totals, get_daily_totals, get_category_totals,
    bulk_insert_transactions
)
from db.categories import add_category

class TestFinancialInvariants(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_test_path = os.path.abspath("test_invariants.db")
        if os.path.exists(cls.db_test_path):
            os.remove(cls.db_test_path)
        os.environ["FINANCE_DB_PATH"] = cls.db_test_path
        init_db(cls.db_test_path)
        # Ensure category id 1 exists
        conn = get_connection(cls.db_test_path)
        cur = conn.cursor()
        cur.execute("INSERT OR IGNORE INTO categories (id, name, type, color) VALUES (1, 'General', 'expense', '#6FA8DC')")
        cur.execute("INSERT OR IGNORE INTO categories (id, name, type, color) VALUES (2, 'Income Gen', 'income', '#65AF9A')")
        conn.commit()
        conn.close()

    @classmethod
    def tearDownClass(cls):
        os.environ.pop("FINANCE_DB_PATH", None)
        if os.path.exists(cls.db_test_path):
            try: os.remove(cls.db_test_path)
            except OSError: pass
        for ext in ["-wal", "-shm"]:
            if os.path.exists(cls.db_test_path + ext):
                try: os.remove(cls.db_test_path + ext)
                except OSError: pass

    def test_invariant_1_net_conservation(self):
        """Invariant: Net Worth = Sum(Income) - Sum(Expenses)"""
        totals = get_totals()
        income = totals.get("income", 0.0)
        expense = totals.get("expense", 0.0)
        net = income - expense

        # Add random transactions
        add_transaction("income", 1250.75, 1, "2025-03-10", "Freelance invoice")
        add_transaction("expense", 432.50, 1, "2025-03-11", "Hardware gear")

        new_totals = get_totals()
        new_income = new_totals.get("income", 0.0)
        new_expense = new_totals.get("expense", 0.0)
        new_net = new_income - new_expense

        self.assertAlmostEqual(new_income - income, 1250.75, places=2)
        self.assertAlmostEqual(new_expense - expense, 432.50, places=2)
        self.assertAlmostEqual(new_net - net, 1250.75 - 432.50, places=2)

    def test_invariant_2_yearly_equals_sum_of_months(self):
        """Invariant: Yearly Total = Sum of all 12 monthly totals."""
        monthly_rows = get_monthly_totals(year=2025)
        
        monthly_income_sum = sum(amt for m, t, amt in monthly_rows if t == "income")
        monthly_expense_sum = sum(amt for m, t, amt in monthly_rows if t == "expense")

        yearly_totals = get_totals(start_date="2025-01-01", end_date="2025-12-31")
        
        self.assertAlmostEqual(monthly_income_sum, yearly_totals.get("income", 0.0), places=2)
        self.assertAlmostEqual(monthly_expense_sum, yearly_totals.get("expense", 0.0), places=2)

    def test_invariant_3_monthly_equals_sum_of_days(self):
        """Invariant: Monthly Total = Sum of all daily totals in that month."""
        start_d = "2025-03-01"
        end_d = "2025-03-31"
        daily_rows = get_daily_totals(start_d, end_d, t_type="expense")
        daily_sum = sum(amt for d, amt in daily_rows)

        monthly_rows = get_monthly_totals(year=2025)
        march_expense = sum(amt for m, t, amt in monthly_rows if m == "2025-03" and t == "expense")

        self.assertAlmostEqual(daily_sum, march_expense, places=2)

    def test_invariant_4_update_transaction_moves_aggregate_correctly(self):
        """Invariant: Updating a transaction shifts amount and date correctly in aggregates."""
        # Create transaction
        add_transaction("expense", 300.0, 1, "2025-05-01", "Conference ticket")
        
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM transactions WHERE note = 'Conference ticket'")
        tx_id = cur.fetchone()[0]
        conn.close()

        # Check aggregate before
        agg_before = get_totals(start_date="2025-05-01", end_date="2025-05-01")
        self.assertAlmostEqual(agg_before.get("expense", 0.0), 300.0, places=2)

        # Update date to next month and change amount to 350
        update_transaction(tx_id, "expense", 350.0, 1, "2025-06-01", "Conference ticket updated")

        # May 1 should now be 0, June 1 should be 350
        agg_may = get_totals(start_date="2025-05-01", end_date="2025-05-01")
        agg_june = get_totals(start_date="2025-06-01", end_date="2025-06-01")

        self.assertAlmostEqual(agg_may.get("expense", 0.0), 0.0, places=2)
        self.assertAlmostEqual(agg_june.get("expense", 0.0), 350.0, places=2)

    def test_invariant_5_delete_transaction_decrements_aggregate_exactly_once(self):
        """Invariant: Deleting a transaction removes its contribution exactly once."""
        add_transaction("expense", 88.0, 1, "2025-07-04", "Dinner out")
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM transactions WHERE note = 'Dinner out'")
        tx_id = cur.fetchone()[0]
        conn.close()

        agg_before = get_totals(start_date="2025-07-04", end_date="2025-07-04").get("expense", 0.0)
        delete_transaction(tx_id)
        agg_after = get_totals(start_date="2025-07-04", end_date="2025-07-04").get("expense", 0.0)

        self.assertAlmostEqual(agg_before - agg_after, 88.0, places=2)

    def test_invariant_6_idempotent_duplicate_import(self):
        """Invariant: Importing identical batch twice with duplicate protection produces no change."""
        batch = [
            ("expense", 45.0, 1, "2025-08-10", "Book purchase"),
            ("expense", 120.0, 1, "2025-08-11", "Train ticket"),
        ]
        ins1, skip1 = bulk_insert_transactions(batch, skip_duplicates=True)
        self.assertEqual(ins1, 2)
        self.assertEqual(skip1, 0)

        # Second import of same batch
        ins2, skip2 = bulk_insert_transactions(batch, skip_duplicates=True)
        self.assertEqual(ins2, 0)
        self.assertEqual(skip2, 2)

    def test_invariant_7_leap_year_boundary_handling(self):
        """Invariant: February 29 on leap years is handled without errors."""
        # 2024 is a leap year (Feb 29 valid)
        add_transaction("income", 1000.0, 1, "2024-02-29", "Leap day bonus")
        tot = get_totals(start_date="2024-02-29", end_date="2024-02-29")
        self.assertAlmostEqual(tot.get("income", 0.0), 1000.0, places=2)

if __name__ == "__main__":
    unittest.main()
