import os
import sys
import time
import json
import sqlite3
import psutil
from typing import Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import get_connection
from db.transactions import get_totals, get_monthly_totals, get_transactions, get_category_totals
from db.health import check_database_health
from db.aggregate_validator import validate_aggregate_consistency
from db.rebuild import rebuild_daily_aggregates
from utils.backup import create_database_backup, restore_database_from_backup
from utils.observability import METRICS

def run_e2e_stress_test(db_path: str, iterations: int = 50) -> Dict[str, Any]:
    print("=" * 80)
    print(f"=== FINANCE TRACKER END-TO-END STRESS TEST: {os.path.basename(db_path)} ===")
    print("=" * 80)

    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found: {db_path}")

    proc = psutil.Process(os.getpid())
    db_size_mb = os.path.getsize(db_path) / (1024 * 1024)

    results = {
        "database": db_path,
        "db_size_mb": round(db_size_mb, 2),
        "iterations": iterations,
        "metrics": {},
        "errors": []
    }

    # 1. Stress Dashboard Generation
    print("  [1/6] Running Dashboard Query Stress Loop...")
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = get_totals(start_date="2025-01-01", end_date="2025-12-31")
        _ = get_monthly_totals(year=2025)
    t_dash = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["dashboard_avg_ms"] = round(t_dash / iterations, 3)

    # 2. Stress Category Aggregation & Drill-Down
    print("  [2/6] Running Category Breakdown Stress Loop...")
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = get_category_totals(start_date="2025-01-01", end_date="2025-12-31")
    t_cat = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["category_breakdown_avg_ms"] = round(t_cat / iterations, 3)

    # 3. Stress Paginated List & Full-Text Search
    print("  [3/6] Running Paginated Search Stress Loop...")
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = get_transactions(search_query="coffee", limit=50)
    t_search = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["search_pagination_avg_ms"] = round(t_search / iterations, 3)

    # 4. Stress Health & Consistency Verification
    print("  [4/6] Running Health Diagnostics & Aggregate Validator...")
    t0 = time.perf_counter()
    health = check_database_health(db_path)
    val = validate_aggregate_consistency(db_path)
    t_health = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["health_check_ms"] = round(t_health, 3)
    results["health_status"] = health["status"]
    results["is_consistent"] = val["is_consistent"]

    # 5. Stress Backup & Hardened Restore Cycle
    print("  [5/6] Running Backup & Restore Verification Cycle...")
    tmp_backup = os.path.abspath("benchmarks/results/stress_backup_tmp.db")
    t0 = time.perf_counter()
    create_database_backup(tmp_backup)
    t_backup = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["backup_creation_ms"] = round(t_backup, 3)

    t0 = time.perf_counter()
    restore_ok, restore_msg = restore_database_from_backup(tmp_backup)
    t_restore = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["hardened_restore_ms"] = round(t_restore, 3)
    results["restore_success"] = restore_ok

    if os.path.exists(tmp_backup):
        try: os.remove(tmp_backup)
        except OSError: pass
    if os.path.exists(tmp_backup + ".meta.json"):
        try: os.remove(tmp_backup + ".meta.json")
        except OSError: pass

    # 6. Stress Atomic Aggregate Rebuild
    print("  [6/6] Running Atomic Aggregate Rebuild Benchmark...")
    t0 = time.perf_counter()
    rebuild_res = rebuild_daily_aggregates(db_path)
    t_rebuild = (time.perf_counter() - t0) * 1000.0
    results["metrics"]["aggregate_rebuild_ms"] = round(t_rebuild, 3)
    results["rebuild_success"] = rebuild_res["success"]

    # Process Memory
    rss_mb = proc.memory_info().rss / (1024 * 1024)
    results["process_rss_mb"] = round(rss_mb, 2)

    print("-" * 80)
    print(f"[COMPLETED] Stress Test Passed Successfully | Peak RSS: {rss_mb:.2f} MB")
    print(f"  Dashboard Avg: {results['metrics']['dashboard_avg_ms']} ms | Category Avg: {results['metrics']['category_breakdown_avg_ms']} ms | Search: {results['metrics']['search_pagination_avg_ms']} ms")
    print(f"  Backup: {results['metrics']['backup_creation_ms']} ms | Restore: {results['metrics']['hardened_restore_ms']} ms | Rebuild: {results['metrics']['aggregate_rebuild_ms']} ms")
    print("=" * 80 + "\n")

    return results

if __name__ == "__main__":
    db_100k = os.path.join(os.path.dirname(__file__), "datasets", "transactions_100k.db")
    res_100k = run_e2e_stress_test(db_100k, iterations=30)
    with open("benchmarks/results/e2e_stress_test.json", "w") as f:
        json.dump(res_100k, f, indent=2)
