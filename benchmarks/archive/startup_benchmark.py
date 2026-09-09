import time
import sys
import os
import sqlite3
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def measure_startup_latency(db_path: str = None) -> dict:
    target_db = db_path or os.path.join(os.path.dirname(__file__), "datasets", "transactions_1m.db")
    
    timings = {}
    
    # 1. Measure DB connection + PRAGMA config
    t0 = time.perf_counter()
    from db.database import get_connection, init_db
    t1 = time.perf_counter()
    timings["module_import_ms"] = round((t1 - t0) * 1000.0, 3)

    t0 = time.perf_counter()
    conn = get_connection(target_db)
    t1 = time.perf_counter()
    timings["db_connection_ms"] = round((t1 - t0) * 1000.0, 3)

    t0 = time.perf_counter()
    cur = conn.cursor()
    cur.execute("PRAGMA quick_check(1)")
    _ = cur.fetchone()
    t1 = time.perf_counter()
    timings["quick_integrity_check_ms"] = round((t1 - t0) * 1000.0, 3)

    t0 = time.perf_counter()
    from db.categories import get_categories
    cats = get_categories()
    t1 = time.perf_counter()
    timings["category_loading_ms"] = round((t1 - t0) * 1000.0, 3)

    t0 = time.perf_counter()
    from db.transactions import get_totals, get_monthly_totals
    totals = get_totals(start_date="2025-01-01", end_date="2025-12-31")
    months = get_monthly_totals(year=2025)
    t1 = time.perf_counter()
    timings["initial_dashboard_queries_ms"] = round((t1 - t0) * 1000.0, 3)

    conn.close()

    total_cold = sum(timings.values())
    timings["total_cold_startup_ms"] = round(total_cold, 3)

    print(json.dumps(timings, indent=2))
    return timings

if __name__ == "__main__":
    measure_startup_latency()
