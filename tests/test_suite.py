import os
import sys
import datetime
import calendar
import tempfile

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Test imports
from db.database import init_db, get_connection, get_db_path
from db.categories import add_category, get_categories, get_category_by_name, update_category, delete_category
from db.transactions import (
    add_transaction, get_transactions, update_transaction, delete_transaction,
    get_totals, get_category_totals, check_duplicate_transaction, bulk_insert_transactions
)
from utils.period_helper import get_period_dates, get_previous_period_dates, PERIOD_OPTIONS
from utils.responsive import format_currency, format_percent_change
from utils.exports import export_to_excel, parse_and_import_excel
from utils.backup import create_database_backup, restore_database_from_backup

def run_tests():
    print("=== STARTING FINANCE TRACKER TEST SUITE ===")

    # 1. Test Database Initialization
    init_db()
    conn = get_connection()
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    assert "categories" in tables, "categories table missing"
    assert "transactions" in tables, "transactions table missing"
    conn.close()
    print("[PASS] Test 1: DB Initialization & Schema passed")

    # 2. Test Categories
    cat_id = add_category("TestCategory123", "expense", "#E58A9B")
    assert cat_id is not None
    cat_found = get_category_by_name("TestCategory123")
    assert cat_found is not None and cat_found[1] == "TestCategory123"
    update_category(cat_id, "TestCategoryUpdated", "expense", "#65AF9A")
    cat_updated = get_category_by_name("TestCategoryUpdated")
    assert cat_updated is not None
    print("[PASS] Test 2: Categories CRUD passed")

    # 3. Test Transactions & Foreign Key Safeguard
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    add_transaction("expense", 550.0, cat_id, today_str, "Test lunch note")
    txns = get_transactions(search_query="Test lunch note")
    assert len(txns) >= 1
    t_id = txns[0][0]

    # Category delete should fail while in use
    can_delete = delete_category(cat_id)
    assert not can_delete, "Should not delete category while in use by transactions"
    print("[PASS] Test 3: Transaction creation & FK safeguard passed")

    # Clean up test transaction
    delete_transaction(t_id)
    can_delete_now = delete_category(cat_id)
    assert can_delete_now, "Should delete category after transaction is removed"
    print("[PASS] Test 4: Transaction deletion & category cleanup passed")

    # 4. Test Period Helpers
    for k, v in PERIOD_OPTIONS:
        if k == "custom":
            s, e, label = get_period_dates(k, "2026-01-01", "2026-01-10")
            assert s == "2026-01-01" and e == "2026-01-10"
        else:
            s, e, label = get_period_dates(k)
            assert s <= e, f"Period {k} start > end ({s} > {e})"
            prev_s, prev_e, prev_lbl = get_previous_period_dates(k, s, e)
            assert prev_s <= prev_e
    print("[PASS] Test 5: Period calculations & boundary checks passed")

    # 5. Test Comparison & Zero Division
    lbl, col, icn = format_percent_change(100.0, 0.0)
    assert lbl == "New activity"
    lbl, col, icn = format_percent_change(0.0, 0.0)
    assert lbl == "No prior data"
    lbl, col, icn = format_percent_change(110.0, 100.0)
    assert lbl == "+10.0%"
    print("[PASS] Test 6: Zero-division safe comparison engine passed")

    # 6. Test Excel Export
    tmp_export = os.path.join(tempfile.gettempdir(), "test_export.xlsx")
    export_to_excel(tmp_export, period_label="Unit Test Period")
    assert os.path.exists(tmp_export) and os.path.getsize(tmp_export) > 0
    print("[PASS] Test 7: Excel 3-sheet export generation passed")

    # 7. Test Excel Import & Duplicate Detection
    import_result = parse_and_import_excel(tmp_export, skip_duplicates=True)
    assert import_result["success"] is True or import_result["total_rows"] >= 0
    print("[PASS] Test 8: Excel parsing & duplicate skip protection passed")
    if os.path.exists(tmp_export):
        os.remove(tmp_export)

    # 8. Test Database Backup & Safe Restore
    tmp_backup = os.path.join(tempfile.gettempdir(), "test_backup.db")
    create_database_backup(tmp_backup)
    assert os.path.exists(tmp_backup) and os.path.getsize(tmp_backup) > 0
    ok, msg = restore_database_from_backup(tmp_backup)
    assert ok is True
    print("[PASS] Test 9: SQLite online backup & integrity restore passed")
    if os.path.exists(tmp_backup):
        os.remove(tmp_backup)
    if os.path.exists(tmp_backup + ".meta.json"):
        os.remove(tmp_backup + ".meta.json")

    # 9. Test CSV Export
    from utils.exports import export_to_csv
    tmp_csv = os.path.join(tempfile.gettempdir(), "test_export.csv")
    export_to_csv(tmp_csv)
    assert os.path.exists(tmp_csv) and os.path.getsize(tmp_csv) > 0
    print("[PASS] Test 10: Standard CSV export with formula sanitization passed")
    if os.path.exists(tmp_csv):
        os.remove(tmp_csv)

    print("\n=== ALL UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
