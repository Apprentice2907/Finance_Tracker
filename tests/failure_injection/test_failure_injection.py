import unittest
import os
import sqlite3
import tempfile
from db.database import init_db, get_connection
from db.transactions import add_transaction, get_totals, get_transactions
from db.health import check_database_health
from db.aggregate_validator import validate_aggregate_consistency
from db.rebuild import rebuild_daily_aggregates
from utils.backup import create_database_backup, restore_database_from_backup
from utils.exports import parse_and_import_excel

class TestFailureInjection(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.abspath("test_fail_inject.db")
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

    def test_failure_mode_1_corrupted_backup_restore_rejection(self):
        """Simulates byte-level corruption of a backup file and verifies the restore engine rejects it."""
        # 1. Add valid transaction
        add_transaction("income", 5000.0, 1, "2025-01-01", "Base income")
        backup_file = os.path.abspath("test_corrupt_backup.db")
        create_database_backup(backup_file)

        # 2. Corrupt backup file bytes
        with open(backup_file, "r+b") as f:
            f.seek(100)
            f.write(b"CORRUPTED_DATABASE_BYTES_TRASH_1234567890")

        # 3. Attempt restore
        success, msg = restore_database_from_backup(backup_file)
        self.assertFalse(success, "Restore engine must reject byte-corrupted backup files")
        self.assertIn("corrupted", msg.lower())

        # 4. Verify original active database was NOT overwritten or destroyed
        totals = get_totals()
        self.assertAlmostEqual(totals.get("income", 0.0), 5000.0)

        if os.path.exists(backup_file):
            try: os.remove(backup_file)
            except OSError: pass
        if os.path.exists(backup_file + ".meta.json"):
            try: os.remove(backup_file + ".meta.json")
            except OSError: pass

    def test_failure_mode_2_malformed_excel_import_resilience(self):
        """Simulates non-Excel and truncated files given to import parser."""
        dummy_file = os.path.abspath("test_bad_file.xlsx")
        with open(dummy_file, "w") as f:
            f.write("THIS IS NOT A VALID ZIP / EXCEL FILE")

        res = parse_and_import_excel(dummy_file)
        self.assertFalse(res["success"])
        self.assertIn("failed", res["message"].lower())

        if os.path.exists(dummy_file):
            try: os.remove(dummy_file)
            except OSError: pass

    def test_failure_mode_3_intentional_aggregate_tampering_and_rebuild(self):
        """Intentionally tampers with daily_aggregates and validates detection and atomic rebuild."""
        add_transaction("expense", 450.0, 1, "2025-04-10", "Flight ticket")
        
        # Manually corrupt aggregate row
        conn = get_connection(self.test_db)
        conn.execute("UPDATE daily_aggregates SET total_amount = 99999.0 WHERE date = '2025-04-10'")
        conn.commit()
        conn.close()

        # Health check must detect failure
        health = check_database_health(self.test_db)
        self.assertEqual(health["status"], "FAILURE")
        self.assertTrue(any("Aggregate desynchronization" in err for err in health["errors"]))

        # Aggregate validator must report inconsistency
        val = validate_aggregate_consistency(self.test_db)
        self.assertFalse(val["is_consistent"])

        # Execute safe atomic rebuild
        rebuild_res = rebuild_daily_aggregates(self.test_db)
        self.assertTrue(rebuild_res["success"])

        # Verify healthy state restored
        health_after = check_database_health(self.test_db)
        self.assertEqual(health_after["status"], "PASS")

        totals = get_totals(start_date="2025-04-10", end_date="2025-04-10")
        self.assertAlmostEqual(totals.get("expense", 0.0), 450.0)

if __name__ == "__main__":
    unittest.main()
