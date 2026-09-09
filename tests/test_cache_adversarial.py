import unittest
import os
from db.database import init_db, get_connection
from db.transactions import (
    add_transaction, update_transaction, delete_transaction,
    get_totals, get_category_totals, bulk_insert_transactions,
    _QUERY_CACHE
)
from utils.backup import create_database_backup, restore_database_from_backup

class TestCacheAdversarial(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.abspath("test_cache_adv.db")
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

    def test_cycle_1_read_write_read(self):
        """READ -> WRITE -> READ: Cache must not return stale pre-write value."""
        # Initial read (cold cache populated)
        tot_1 = get_totals()
        self.assertEqual(tot_1.get("income", 0.0), 0.0)

        # WRITE
        add_transaction("income", 3200.0, 1, "2025-05-15", "Consulting")

        # Second READ (must reflect new transaction immediately)
        tot_2 = get_totals()
        self.assertAlmostEqual(tot_2.get("income", 0.0), 3200.0)

    def test_cycle_2_read_import_read(self):
        """READ -> IMPORT -> READ: Bulk import must invalidate cache."""
        tot_1 = get_totals()
        self.assertEqual(tot_1.get("expense", 0.0), 0.0)

        # IMPORT
        batch = [
            ("expense", 150.0, 1, "2025-06-01", "Groceries"),
            ("expense", 80.0, 1, "2025-06-02", "Utilities")
        ]
        bulk_insert_transactions(batch)

        # Second READ
        tot_2 = get_totals()
        self.assertAlmostEqual(tot_2.get("expense", 0.0), 230.0)

    def test_cycle_3_read_delete_read(self):
        """READ -> DELETE -> READ: Deletion must invalidate cache immediately."""
        add_transaction("expense", 500.0, 1, "2025-07-01", "Gym annual")
        tot_1 = get_totals()
        self.assertAlmostEqual(tot_1.get("expense", 0.0), 500.0)

        conn = get_connection(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT id FROM transactions WHERE note = 'Gym annual'")
        tx_id = cur.fetchone()[0]
        conn.close()

        # DELETE
        delete_transaction(tx_id)

        # Second READ
        tot_2 = get_totals()
        self.assertAlmostEqual(tot_2.get("expense", 0.0), 0.0)

    def test_cycle_4_read_update_read(self):
        """READ -> UPDATE -> READ: Transaction update must reflect new amounts."""
        add_transaction("expense", 100.0, 1, "2025-08-01", "Coffee supply")
        tot_1 = get_totals()
        self.assertAlmostEqual(tot_1.get("expense", 0.0), 100.0)

        conn = get_connection(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT id FROM transactions WHERE note = 'Coffee supply'")
        tx_id = cur.fetchone()[0]
        conn.close()

        # UPDATE
        update_transaction(tx_id, "expense", 250.0, 1, "2025-08-01", "Coffee supply bulk")

        # Second READ
        tot_2 = get_totals()
        self.assertAlmostEqual(tot_2.get("expense", 0.0), 250.0)

    def test_cycle_5_read_restore_read(self):
        """READ -> RESTORE -> READ: Database restore must invalidate in-memory cache."""
        add_transaction("income", 10000.0, 1, "2025-01-01", "Starting capital")
        backup_path = os.path.abspath("test_restore_cache_adv.db")
        create_database_backup(backup_path)

        # Add more records after backup
        add_transaction("income", 5000.0, 1, "2025-01-02", "Extra income")
        tot_post_backup = get_totals()
        self.assertAlmostEqual(tot_post_backup.get("income", 0.0), 15000.0)

        # RESTORE to backup state (10,000.0)
        success, _ = restore_database_from_backup(backup_path)
        self.assertTrue(success)

        # Read post-restore (must show 10,000.0, NOT stale 15,000.0)
        tot_restored = get_totals()
        self.assertAlmostEqual(tot_restored.get("income", 0.0), 10000.0)

        if os.path.exists(backup_path):
            try: os.remove(backup_path)
            except OSError: pass
        if os.path.exists(backup_path + ".meta.json"):
            try: os.remove(backup_path + ".meta.json")
            except OSError: pass

if __name__ == "__main__":
    unittest.main()
