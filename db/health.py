import sqlite3
import os
from typing import Dict, Any, List
from db.database import get_connection, get_db_path

def check_database_health(db_path: str = None) -> Dict[str, Any]:
    """
    Comprehensive self-diagnostic health checker for SQLite database integrity,
    foreign key relations, indexes, orphan records, and pre-aggregate consistency.
    Returns structured PASS / WARNING / FAILURE diagnostics with recovery guidance.
    """
    target = db_path or get_db_path()
    if not os.path.exists(target):
        return {
            "status": "FAILURE",
            "errors": [f"Database file not found at: {target}"],
            "warnings": [],
            "recovery_guidance": ["Initialize the database using init_db() or restore from a verified backup."]
        }

    conn = get_connection(target)
    cur = conn.cursor()

    errors: List[str] = []
    warnings: List[str] = []
    guidance: List[str] = []

    # 1. SQLite Low-Level Integrity Check
    try:
        cur.execute("PRAGMA integrity_check")
        integrity_rows = cur.fetchall()
        if not integrity_rows or integrity_rows[0][0] != "ok":
            errors.append(f"SQLite page integrity corruption detected: {integrity_rows}")
            guidance.append("Run offline SQLite CLI `.recover` or restore from the latest valid backup immediately.")
    except Exception as e:
        errors.append(f"Integrity check failed to execute: {e}")

    # 2. Foreign Key Constraint Check
    try:
        cur.execute("PRAGMA foreign_key_check")
        fk_errors = cur.fetchall()
        if fk_errors:
            errors.append(f"Foreign key violations detected ({len(fk_errors)} invalid references): {fk_errors}")
            guidance.append("Check orphaned category_id values in transactions table and re-map to valid categories.")
    except Exception as e:
        errors.append(f"Foreign key check error: {e}")

    # 3. Schema & Required Tables Check
    required_tables = {"categories", "transactions", "daily_aggregates"}
    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = {row[0] for row in cur.fetchall()}
        missing = required_tables - existing_tables
        if missing:
            errors.append(f"Missing required tables: {missing}")
            guidance.append("Run init_db() to create missing database schema tables.")
    except Exception as e:
        errors.append(f"Table inspection error: {e}")

    # 4. Index Existence Check
    required_indexes = {
        "idx_trans_composite", "idx_trans_cat_sort", "idx_trans_date_desc",
        "idx_daily_agg_date", "idx_daily_agg_type_date"
    }
    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
        existing_indexes = {row[0] for row in cur.fetchall()}
        missing_idx = required_indexes - existing_indexes
        if missing_idx:
            warnings.append(f"Performance indexes missing: {missing_idx}")
            guidance.append("Recreate indexes via init_db() to prevent query latency degradation.")
    except Exception as e:
        warnings.append(f"Index inspection error: {e}")

    # 5. Orphan Transaction Records Detection
    try:
        cur.execute("""
            SELECT COUNT(t.id) 
            FROM transactions t 
            LEFT JOIN categories c ON t.category_id = c.id 
            WHERE t.category_id IS NOT NULL AND c.id IS NULL
        """)
        orphan_count = cur.fetchone()[0]
        if orphan_count > 0:
            errors.append(f"Found {orphan_count} orphaned transactions pointing to non-existent categories.")
            guidance.append("Re-assign orphaned transaction category_id fields to valid category IDs.")
    except Exception as e:
        errors.append(f"Orphan transaction check error: {e}")

    # 6. Aggregate Mathematical Consistency Check
    try:
        # Sum raw transactions
        cur.execute("SELECT type, COALESCE(SUM(amount), 0.0), COUNT(id) FROM transactions GROUP BY type")
        raw_map = {row[0]: (round(row[1], 2), row[2]) for row in cur.fetchall()}

        # Sum daily_aggregates
        cur.execute("SELECT type, COALESCE(SUM(total_amount), 0.0), COALESCE(SUM(transaction_count), 0) FROM daily_aggregates GROUP BY type")
        agg_map = {row[0]: (round(row[1], 2), row[2]) for row in cur.fetchall()}

        for t_type in ("income", "expense"):
            raw_amt, raw_cnt = raw_map.get(t_type, (0.0, 0))
            agg_amt, agg_cnt = agg_map.get(t_type, (0.0, 0))

            if abs(raw_amt - agg_amt) > 0.01 or raw_cnt != agg_cnt:
                errors.append(
                    f"Aggregate desynchronization on '{t_type}': "
                    f"Raw total=${raw_amt:,.2f} ({raw_cnt} txs) vs Aggregate total=${agg_amt:,.2f} ({agg_cnt} txs)"
                )
                guidance.append("Execute safe aggregate rebuild via `rebuild_daily_aggregates()`.")
    except Exception as e:
        errors.append(f"Aggregate validation check error: {e}")

    conn.close()

    # Determine overall status
    if errors:
        overall_status = "FAILURE"
    elif warnings:
        overall_status = "WARNING"
    else:
        overall_status = "PASS"

    return {
        "status": overall_status,
        "database_path": target,
        "errors": errors,
        "warnings": warnings,
        "recovery_guidance": list(dict.fromkeys(guidance)) # Deduplicate guidance
    }

if __name__ == "__main__":
    report = check_database_health()
    import json
    print(json.dumps(report, indent=2))
