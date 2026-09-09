import unittest
import os
import sqlite3
from db.database import init_db, get_connection
from db.transactions import add_transaction
from db.health import check_database_health
from db.aggregate_validator import validate_aggregate_consistency
from db.rebuild import rebuild_daily_aggregates

class TestDataCorruption(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.abspath("test_corrupt.db")
        if os.path.exists(self.test_db):
            try: os.remove(self.test_db)
            except OSError: pass
        os.environ["FINANCE_DB_PATH"] = self.test_db
        init_db(self.test_db)

    def tearDown(self):
        os.environ.pop("FINANCE_DB_PATH", None)
        if os.path.exists(self.test_db):
            try: os.remove(self.test_db)
            except OSError: pass
        for ext in ["-wal", "-shm", ".meta.json"]:
            if os.path.exists(self.test_db + ext):
                try: os.remove(self.test_db + ext)
                except OSError: pass

    def test_corruption_1_missing_aggregate_rows(self):
        """Validates detection of dropped aggregate records."""
        add_transaction("expense", 200.0, 1, "2025-02-14", "Valentine gift")
        
        # Delete the aggregate row directly to simulate trigger desync/corruption
        conn = get_connection(self.test_db)
        conn.execute("DELETE FROM daily_aggregates WHERE date = '2025-02-14'")
        conn.commit()
        conn.close()

        val = validate_aggregate_consistency(self.test_db)
        self.assertFalse(val["is_consistent"], "Validator must detect missing aggregate rows")
        
        health = check_database_health(self.test_db)
        self.assertEqual(health["status"], "FAILURE")

    def test_corruption_2_foreign_key_orphan_detection(self):
        """Validates detection when foreign keys are disabled and invalid category_id is inserted."""
        conn = get_connection(self.test_db)
        # Temporarily disable foreign keys to insert an orphan record
        conn.execute("PRAGMA foreign_keys = OFF")
        conn.execute("INSERT INTO transactions (type, amount, category_id, date, note) VALUES ('expense', 50.0, 99999, '2025-01-01', 'Orphan')")
        conn.commit()
        conn.close()

        health = check_database_health(self.test_db)
        self.assertEqual(health["status"], "FAILURE")
        self.assertTrue(any("orphaned" in err.lower() for err in health["errors"]))

    def test_corruption_3_index_loss_detection(self):
        """Validates that dropped performance indexes trigger WARNING status with recovery guidance."""
        conn = get_connection(self.test_db)
        conn.execute("DROP INDEX idx_trans_composite")
        conn.commit()
        conn.close()

        health = check_database_health(self.test_db)
        self.assertIn(health["status"], ("WARNING", "FAILURE"))
        self.assertTrue(any("idx_trans_composite" in w for w in health["warnings"]))

if __name__ == "__main__":
    unittest.main()
