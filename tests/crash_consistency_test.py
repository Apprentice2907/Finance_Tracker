import unittest
import sqlite3
import os
import shutil

class TestCrashConsistency(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_crash.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        
        self.conn = sqlite3.connect(self.db_path)
        self.conn.execute("PRAGMA journal_mode = WAL;")
        self.conn.execute("CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, amount REAL, category_id INTEGER, date TEXT, note TEXT);")
        self.conn.execute("CREATE TABLE daily_aggregates (date TEXT, type TEXT, category_id INTEGER, total_amount REAL, transaction_count INTEGER, PRIMARY KEY (date, type, category_id));")
        self.conn.execute("""
            CREATE TRIGGER trg_tx_insert AFTER INSERT ON transactions
            BEGIN
                INSERT INTO daily_aggregates (date, type, category_id, total_amount, transaction_count)
                VALUES (NEW.date, NEW.type, COALESCE(NEW.category_id, 0), NEW.amount, 1)
                ON CONFLICT(date, type, category_id) DO UPDATE SET
                    total_amount = total_amount + NEW.amount,
                    transaction_count = transaction_count + 1;
            END;
        """)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        for ext in ["-wal", "-shm"]:
            if os.path.exists(self.db_path + ext):
                os.remove(self.db_path + ext)

    def test_simulated_crash_during_batch_transaction_rollback(self):
        """Validates that a simulated exception during a multi-row batch leaves zero partial records."""
        try:
            with self.conn:
                self.conn.execute("INSERT INTO transactions (type, amount, category_id, date, note) VALUES ('expense', 100, 1, '2025-01-01', 'Valid 1')")
                self.conn.execute("INSERT INTO transactions (type, amount, category_id, date, note) VALUES ('expense', 200, 1, '2025-01-01', 'Valid 2')")
                # Simulate mid-batch unexpected crash/error
                raise RuntimeError("Simulated process crash / power loss / disk error")
        except RuntimeError:
            pass

        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM transactions")
        tx_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM daily_aggregates")
        agg_count = cur.fetchone()[0]

        self.assertEqual(tx_count, 0, "Partial transactions must not persist after failure")
        self.assertEqual(agg_count, 0, "Aggregate triggers must rollback atomically with transactions")

    def test_aggregate_consistency_on_atomic_rollback(self):
        """Validates that valid transactions commit and failed transactions rollback without desync."""
        # Step 1: Successful commit
        with self.conn:
            self.conn.execute("INSERT INTO transactions (type, amount, category_id, date, note) VALUES ('income', 5000, 1, '2025-01-01', 'Salary')")

        # Step 2: Failed second transaction
        try:
            with self.conn:
                self.conn.execute("INSERT INTO transactions (type, amount, category_id, date, note) VALUES ('expense', 1500, 1, '2025-01-01', 'Rent')")
                raise ValueError("Simulated validation failure")
        except ValueError:
            pass

        cur = self.conn.cursor()
        cur.execute("SELECT total_amount FROM daily_aggregates WHERE type = 'income'")
        inc_total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM daily_aggregates WHERE type = 'expense'")
        exp_count = cur.fetchone()[0]

        self.assertEqual(inc_total, 5000.0)
        self.assertEqual(exp_count, 0, "Failed expense must not pollute daily aggregates")

if __name__ == "__main__":
    unittest.main()
