import sqlite3
import os
from typing import Dict, Any
from db.database import get_connection, get_db_path
from db.aggregate_validator import validate_aggregate_consistency
from db.transactions import invalidate_cache

def rebuild_daily_aggregates(db_path: str = None) -> Dict[str, Any]:
    """
    Safely and atomically recalculates the entire daily_aggregates table
    directly from raw transactions. Enforces pre-commit validation and rolls back
    on any mathematical discrepancy.
    """
    target = db_path or get_db_path()
    conn = get_connection(target)
    cur = conn.cursor()

    try:
        # 1. Begin Exclusive Transaction
        conn.execute("BEGIN IMMEDIATE")

        # 2. Clear existing pre-aggregated data
        cur.execute("DELETE FROM daily_aggregates")

        # 3. Recalculate rollups directly from raw transactions
        cur.execute("""
            INSERT INTO daily_aggregates (date, type, category_id, total_amount, transaction_count)
            SELECT date, type, COALESCE(category_id, 0), SUM(amount), COUNT(id)
            FROM transactions
            GROUP BY date, type, COALESCE(category_id, 0)
        """)

        # 4. Verify Mathematical Consistency before committing
        # We check within this active transaction cursor
        cur.execute("SELECT type, COALESCE(SUM(amount), 0.0), COUNT(id) FROM transactions GROUP BY type")
        raw_totals = {row[0]: (round(row[1], 2), row[2]) for row in cur.fetchall()}

        cur.execute("SELECT type, COALESCE(SUM(total_amount), 0.0), COALESCE(SUM(transaction_count), 0) FROM daily_aggregates GROUP BY type")
        agg_totals = {row[0]: (round(row[1], 2), row[2]) for row in cur.fetchall()}

        for t in ("income", "expense"):
            r_amt, r_cnt = raw_totals.get(t, (0.0, 0))
            a_amt, a_cnt = agg_totals.get(t, (0.0, 0))
            if abs(r_amt - a_amt) > 0.01 or r_cnt != a_cnt:
                conn.rollback()
                conn.close()
                return {
                    "success": False,
                    "error": f"Post-rebuild consistency verification failed on '{t}' (Raw: ${r_amt}, Agg: ${a_amt}). Transaction rolled back."
                }

        # 5. Commit atomic replacement
        conn.commit()
        
        # 6. Invalidate query cache
        invalidate_cache()

        cur.execute("SELECT COUNT(*) FROM daily_aggregates")
        rebuilt_rows = cur.fetchone()[0]
        conn.close()

        return {
            "success": True,
            "rebuilt_rows": rebuilt_rows,
            "message": f"Successfully rebuilt {rebuilt_rows:,} daily aggregate summary records atomically."
        }

    except Exception as exc:
        conn.rollback()
        conn.close()
        return {
            "success": False,
            "error": f"Rebuild failed with exception: {exc}. Changes safely rolled back."
        }
