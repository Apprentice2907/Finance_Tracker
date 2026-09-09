import unittest
import os
import random
from db.database import init_db, get_connection
from db.transactions import (
    add_transaction, update_transaction, delete_transaction,
    get_totals, get_monthly_totals, get_category_totals,
    bulk_insert_transactions, _QUERY_CACHE
)
from db.rebuild import rebuild_daily_aggregates
from utils.backup import create_database_backup, restore_database_from_backup

class TestSystemProperties(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.abspath("test_props.db")
        if os.path.exists(self.test_db):
            try: os.remove(self.test_db)
            except OSError: pass
        os.environ["FINANCE_DB_PATH"] = self.test_db
        init_db(self.test_db)
        _QUERY_CACHE.clear()

    def tearDown(self):
        os.environ.pop("FINANCE_DB_PATH", None)
        _QUERY_CACHE.clear()
        if os.path.exists(self.test_db):
            try: os.remove(self.test_db)
            except OSError: pass
        for ext in ["-wal", "-shm", ".meta.json"]:
            if os.path.exists(self.test_db + ext):
                try: os.remove(self.test_db + ext)
                except OSError: pass

    def test_property_1_balance_invariant(self):
        """Property 1: Net Balance = Total Income - Total Expenses"""
        add_transaction("income", 5000.0, 1, "2025-01-01", "Salary")
        add_transaction("expense", 1200.0, 1, "2025-01-02", "Rent")
        add_transaction("expense", 300.0, 1, "2025-01-03", "Food")

        totals = get_totals()
        inc = totals.get("income", 0.0)
        exp = totals.get("expense", 0.0)
        self.assertAlmostEqual(inc - exp, 3500.0)

    def test_property_2_aggregate_equals_raw(self):
        """Property 2: Pre-aggregated sums exactly match raw transaction sums."""
        for i in range(50):
            t_type = "income" if i % 3 == 0 else "expense"
            amt = round(random.uniform(10.0, 500.0), 2)
            add_transaction(t_type, amt, 1, f"2025-0{(i%9)+1:01d}-15", f"Item {i}")

        conn = get_connection(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT type, SUM(amount) FROM transactions GROUP BY type")
        raw_map = dict(cur.fetchall())
        cur.execute("SELECT type, SUM(total_amount) FROM daily_aggregates GROUP BY type")
        agg_map = dict(cur.fetchall())
        conn.close()

        for t in ("income", "expense"):
            self.assertAlmostEqual(raw_map.get(t, 0.0), agg_map.get(t, 0.0), places=2)

    def test_property_3_duplicate_import_idempotence(self):
        """Property 3: Importing duplicate batch twice produces idempotent database state."""
        batch = [("expense", round(20.0 + i, 2), 1, "2025-09-10", f"Tx {i}") for i in range(20)]
        ins1, skip1 = bulk_insert_transactions(batch, skip_duplicates=True)
        self.assertEqual(ins1, 20)
        self.assertEqual(skip1, 0)

        tot1 = get_totals()

        ins2, skip2 = bulk_insert_transactions(batch, skip_duplicates=True)
        self.assertEqual(ins2, 0)
        self.assertEqual(skip2, 20)

        tot2 = get_totals()
        self.assertAlmostEqual(tot1["expense"], tot2["expense"])

    def test_property_4_rebuild_preserves_financial_totals(self):
        """Property 4: Rebuilding aggregates does not alter financial totals."""
        for i in range(30):
            add_transaction("income" if i % 2 == 0 else "expense", 100.0, 1, "2025-05-01", f"Item {i}")

        totals_before = get_totals()
        rebuild_res = rebuild_daily_aggregates(self.test_db)
        self.assertTrue(rebuild_res["success"])
        totals_after = get_totals()

        self.assertAlmostEqual(totals_before.get("income", 0.0), totals_after.get("income", 0.0))
        self.assertAlmostEqual(totals_before.get("expense", 0.0), totals_after.get("expense", 0.0))

    def test_property_5_cache_disabled_equivalence(self):
        """Property 5: Cached and freshly queried uncached results are identical."""
        add_transaction("expense", 750.0, 1, "2025-11-20", "Winter coat")

        # 1. Populates cache
        cached_res = get_totals(start_date="2025-11-01", end_date="2025-11-30")
        
        # 2. Direct raw query
        conn = get_connection(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT type, SUM(amount) FROM transactions WHERE date >= '2025-11-01' AND date <= '2025-11-30' GROUP BY type")
        uncached_res = dict(cur.fetchall())
        conn.close()

        self.assertAlmostEqual(cached_res.get("expense", 0.0), uncached_res.get("expense", 0.0))

if __name__ == "__main__":
    unittest.main()
