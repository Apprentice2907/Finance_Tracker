import os
import sys
import sqlite3
import datetime

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.database import init_db, get_connection
from db.transactions import (
    add_transaction, update_transaction, delete_transaction,
    get_totals, get_category_totals, get_monthly_totals,
    bulk_insert_transactions, _QUERY_CACHE
)

def test_pre_aggregate_consistency():
    init_db()
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    # Get a valid category id
    conn = get_connection()
    cur = conn.cursor()
    cat_row = cur.execute("SELECT id FROM categories WHERE type='income' LIMIT 1").fetchone()
    if not cat_row:
        cur.execute("INSERT INTO categories (name, type, color) VALUES ('IncomeTest', 'income', '#65AF9A')")
        cat_id = cur.lastrowid
        conn.commit()
    else:
        cat_id = cat_row[0]
    conn.close()

    # Clear cache
    _QUERY_CACHE.clear()

    # Initial totals
    t0 = get_totals()
    inc0 = t0.get("income", 0.0) or 0.0

    # Add transaction
    add_transaction("income", 10000.0, cat_id, today_str, "Perf test income")
    t1 = get_totals()
    inc1 = t1.get("income", 0.0) or 0.0
    assert abs(inc1 - (inc0 + 10000.0)) < 0.01, f"Expected {inc0 + 10000.0}, got {inc1}"

    # Verify raw sum matches daily_aggregates exactly
    conn = get_connection()
    cur = conn.cursor()
    raw_sum = cur.execute("SELECT SUM(amount) FROM transactions WHERE type='income'").fetchone()[0] or 0.0
    agg_sum = cur.execute("SELECT SUM(total_amount) FROM daily_aggregates WHERE type='income'").fetchone()[0] or 0.0
    conn.close()
    assert abs(raw_sum - agg_sum) < 0.01, f"Raw {raw_sum} != Agg {agg_sum}"
    print("[PASS] Pre-aggregate mathematical consistency verified.")

def test_lru_cache_behavior():
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    _QUERY_CACHE.clear()

    conn = get_connection()
    cur = conn.cursor()
    cat_row = cur.execute("SELECT id FROM categories WHERE type='expense' LIMIT 1").fetchone()
    if not cat_row:
        cur.execute("INSERT INTO categories (name, type, color) VALUES ('ExpenseTest', 'expense', '#E58A9B')")
        cat_id = cur.lastrowid
        conn.commit()
    else:
        cat_id = cat_row[0]
    conn.close()

    # Cold query -> populates cache
    _ = get_totals()
    cache_key = ("get_totals", None, None)
    assert _QUERY_CACHE.get(cache_key) is not None, "Totals should be cached"

    # Mutation -> invalidates cache
    add_transaction("expense", 450.0, cat_id, today_str, "Cache invalidate test")
    assert _QUERY_CACHE.get(cache_key) is None, "Cache should be invalidated after mutation"
    print("[PASS] Bounded LRU cache invalidation semantics verified.")

if __name__ == "__main__":
    test_pre_aggregate_consistency()
    test_lru_cache_behavior()
