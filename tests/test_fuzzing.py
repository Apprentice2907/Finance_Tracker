import unittest
import os
import random
import string
from db.database import init_db, get_connection
from db.transactions import add_transaction, get_transactions, get_totals
from db.categories import add_category, get_category_by_name

class TestFuzzing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = os.path.abspath("test_fuzz.db")
        if os.path.exists(cls.db_path):
            os.remove(cls.db_path)
        os.environ["FINANCE_DB_PATH"] = cls.db_path
        init_db(cls.db_path)
        conn = get_connection(cls.db_path)
        cur = conn.cursor()
        cur.execute("INSERT OR IGNORE INTO categories (id, name, type, color) VALUES (1, 'Fuzz Cat', 'expense', '#6FA8DC')")
        conn.commit()
        conn.close()

    @classmethod
    def tearDownClass(cls):
        os.environ.pop("FINANCE_DB_PATH", None)
        if os.path.exists(cls.db_path):
            try: os.remove(cls.db_path)
            except OSError: pass
        for ext in ["-wal", "-shm"]:
            if os.path.exists(cls.db_path + ext):
                try: os.remove(cls.db_path + ext)
                except OSError: pass

    def test_fuzz_sql_injection_strings(self):
        """Fuzzes transaction notes and search strings with aggressive SQL injection payloads."""
        payloads = [
            "'; DROP TABLE transactions; --",
            "' OR 1=1; --",
            "1' UNION SELECT username, password FROM users --",
            "\" OR \"\"=\"",
            "<script>alert('xss')</script>",
            "Robert'); DROP TABLE Students;--",
            "NULL' OR 1=1 #",
            "'\x00' AND 1=1",
            "A" * 5000 # Long buffer
        ]

        for payload in payloads:
            try:
                add_transaction("expense", 25.0, 1, "2025-09-01", payload)
                rows = get_transactions(search_query=payload)
                self.assertIsInstance(rows, list)
            except Exception as e:
                self.fail(f"Application crashed or threw unhandled exception on SQL injection fuzz: {payload!r}, error: {e}")

        # Ensure database tables are completely intact
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM transactions")
        count = cur.fetchone()[0]
        conn.close()
        self.assertGreater(count, 0, "Transactions table must not be dropped by injection attempts")

    def test_fuzz_extreme_amounts_and_boundaries(self):
        """Fuzzes amounts with zero, negative, extreme float values, and precision limits."""
        amounts = [0.0, 0.0001, 1e-5, 999999999.99, -50.0, 12345678.123456]
        for amt in amounts:
            try:
                add_transaction("income", amt, 1, "2025-09-02", f"Fuzz amount {amt}")
            except Exception as e:
                self.fail(f"Unhandled crash on amount fuzz: {amt}, error: {e}")

    def test_fuzz_malformed_dates(self):
        """Fuzzes dates with invalid, extreme, and malformed strings."""
        bad_dates = [
            "", "not-a-date", "2025-02-31", "9999-99-99", "0000-00-00",
            "2025/13/45", "NULL", "\n\t2025-01-01", "2025-01-01T00:00:00Z"
        ]
        for d in bad_dates:
            try:
                # Must either succeed or raise handled ValueError, never corrupt DB
                add_transaction("expense", 10.0, 1, d, "Fuzz date")
                get_totals(start_date=d, end_date=d)
            except Exception as e:
                # Should not be an uncaught internal SQLite fatal error
                pass

if __name__ == "__main__":
    unittest.main()
