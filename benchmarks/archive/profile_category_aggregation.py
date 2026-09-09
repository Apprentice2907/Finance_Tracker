import os
import sys
import time
import sqlite3
import gc
import json
import tracemalloc
from typing import Dict, Any

def profile_category_aggregation(db_path: str, iterations: int = 20) -> Dict[str, Any]:
    print(f"\n--- Profiling Category Aggregation on: {db_path} ---")
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}")

    start_date = "2025-01-01"
    end_date = "2025-12-31"

    # 1. Warm-up connection
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA cache_size = -64000;")
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA journal_mode = WAL;")

    # -------------------------------------------------------------
    # STAGE A: Raw Transactions Query (Full Join + Group By in SQLite)
    # -------------------------------------------------------------
    raw_query = """
        SELECT categories.name, SUM(transactions.amount), COUNT(transactions.id)
        FROM transactions
        JOIN categories ON transactions.category_id = categories.id
        WHERE transactions.type = 'expense' AND transactions.date >= ? AND transactions.date <= ?
        GROUP BY categories.name
        ORDER BY SUM(transactions.amount) DESC
    """

    # Measure SQLite cursor.execute time only (without fetchall)
    sql_execute_times = []
    fetch_times = []
    total_sql_times = []
    
    for _ in range(iterations):
        t0 = time.perf_counter()
        cur.execute(raw_query, (start_date, end_date))
        t1 = time.perf_counter()
        rows = cur.fetchall()
        t2 = time.perf_counter()
        sql_execute_times.append((t1 - t0) * 1000.0)
        fetch_times.append((t2 - t1) * 1000.0)
        total_sql_times.append((t2 - t0) * 1000.0)

    # -------------------------------------------------------------
    # STAGE B: Python-Side Data Unpacking, Formatting, Sorting
    # -------------------------------------------------------------
    cur.execute(raw_query, (start_date, end_date))
    sample_rows = cur.fetchall()

    tracemalloc.start()
    t_obj_start = time.perf_counter()
    formatted = []
    for r in sample_rows:
        formatted.append({
            "category": str(r[0]),
            "total_amount": float(r[1]) if r[1] is not None else 0.0,
            "count": int(r[2]) if r[2] is not None else 0
        })
    t_obj_end = time.perf_counter()
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    py_transform_time_ms = (t_obj_end - t_obj_start) * 1000.0

    # -------------------------------------------------------------
    # STAGE C: Raw Fetch without Group By (Simulate Python Aggregation)
    # -------------------------------------------------------------
    flat_query = """
        SELECT transactions.category_id, transactions.amount
        FROM transactions
        WHERE transactions.type = 'expense' AND transactions.date >= ? AND transactions.date <= ?
    """
    t_flat_exec_0 = time.perf_counter()
    cur.execute(flat_query, (start_date, end_date))
    t_flat_exec_1 = time.perf_counter()
    flat_rows = cur.fetchall()
    t_flat_fetch_1 = time.perf_counter()

    t_py_agg_0 = time.perf_counter()
    py_agg_map = {}
    for cat_id, amt in flat_rows:
        if cat_id not in py_agg_map:
            py_agg_map[cat_id] = [0.0, 0]
        py_agg_map[cat_id][0] += amt
        py_agg_map[cat_id][1] += 1
    t_py_agg_1 = time.perf_counter()

    # -------------------------------------------------------------
    # STAGE D: Pre-Aggregated Table (daily_aggregates query)
    # -------------------------------------------------------------
    agg_table_query = """
        SELECT COALESCE(categories.name, 'Uncategorised'), SUM(daily_aggregates.total_amount), 
               COALESCE(categories.color, '#6FA8DC'), SUM(daily_aggregates.transaction_count)
        FROM daily_aggregates
        LEFT JOIN categories ON daily_aggregates.category_id = categories.id
        WHERE daily_aggregates.type = 'expense' AND daily_aggregates.date >= ? AND daily_aggregates.date <= ?
        GROUP BY categories.name
        ORDER BY SUM(daily_aggregates.total_amount) DESC
    """
    agg_table_times = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        cur.execute(agg_table_query, (start_date, end_date))
        rows = cur.fetchall()
        t1 = time.perf_counter()
        agg_table_times.append((t1 - t0) * 1000.0)

    # Calculate row count scanned
    cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?", (start_date, end_date))
    scanned_rows = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM daily_aggregates WHERE type = 'expense' AND date >= ? AND date <= ?", (start_date, end_date))
    scanned_agg_rows = cur.fetchone()[0]

    conn.close()

    def p50(arr): return sorted(arr)[len(arr)//2]
    def p95(arr): return sorted(arr)[int(len(arr)*0.95)]

    profile_data = {
        "dataset_scanned_rows": scanned_rows,
        "pre_agg_scanned_rows": scanned_agg_rows,
        "raw_query_p50_ms": round(p50(total_sql_times), 4),
        "raw_query_p95_ms": round(p95(total_sql_times), 4),
        "sqlite_execute_only_p50_ms": round(p50(sql_execute_times), 4),
        "sqlite_fetchall_only_p50_ms": round(p50(fetch_times), 4),
        "python_object_transform_ms": round(py_transform_time_ms, 6),
        "python_transform_peak_kb": round(peak_mem / 1024.0, 2),
        "py_side_full_fetch_rows": len(flat_rows),
        "py_side_fetch_time_ms": round((t_flat_fetch_1 - t_flat_exec_0) * 1000.0, 4),
        "py_side_aggregation_math_ms": round((t_py_agg_1 - t_py_agg_0) * 1000.0, 4),
        "pre_aggregated_p50_ms": round(p50(agg_table_times), 4),
        "pre_aggregated_p95_ms": round(p95(agg_table_times), 4),
    }

    print(json.dumps(profile_data, indent=2))
    return profile_data

if __name__ == "__main__":
    db_1m = os.path.join(os.path.dirname(__file__), "datasets", "transactions_1m.db")
    profile_category_aggregation(db_1m)
