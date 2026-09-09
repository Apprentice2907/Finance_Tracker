import sqlite3
from typing import Dict, Any, List
from db.database import get_connection, get_db_path

def validate_aggregate_consistency(db_path: str = None) -> Dict[str, Any]:
    """
    Exhaustive validator comparing raw transactions table against pre-computed daily_aggregates.
    Checks:
    1. Overall Income / Expense Totals
    2. Total Transaction Counts
    3. Category-by-Category Totals
    4. Day-by-Day Aggregate Row Existence & Values
    """
    target = db_path or get_db_path()
    conn = get_connection(target)
    cur = conn.cursor()

    discrepancies: List[str] = []

    # 1. Compare Totals by Type
    cur.execute("SELECT type, COALESCE(SUM(amount), 0.0), COUNT(id) FROM transactions GROUP BY type")
    raw_type_map = {row[0]: (round(row[1], 2), row[2]) for row in cur.fetchall()}

    cur.execute("SELECT type, COALESCE(SUM(total_amount), 0.0), COALESCE(SUM(transaction_count), 0) FROM daily_aggregates GROUP BY type")
    agg_type_map = {row[0]: (round(row[1], 2), row[2]) for row in cur.fetchall()}

    for t in ("income", "expense"):
        r_amt, r_cnt = raw_type_map.get(t, (0.0, 0))
        a_amt, a_cnt = agg_type_map.get(t, (0.0, 0))
        if abs(r_amt - a_amt) > 0.01:
            discrepancies.append(f"Amount mismatch for {t}: Raw=${r_amt:,.2f} vs Agg=${a_amt:,.2f}")
        if r_cnt != a_cnt:
            discrepancies.append(f"Count mismatch for {t}: Raw={r_cnt} txs vs Agg={a_cnt} txs")

    # 2. Compare Category-level Totals
    cur.execute("""
        SELECT COALESCE(category_id, 0), type, COALESCE(SUM(amount), 0.0), COUNT(id)
        FROM transactions
        GROUP BY COALESCE(category_id, 0), type
    """)
    raw_cat_map = {(row[0], row[1]): (round(row[2], 2), row[3]) for row in cur.fetchall()}

    cur.execute("""
        SELECT category_id, type, COALESCE(SUM(total_amount), 0.0), COALESCE(SUM(transaction_count), 0)
        FROM daily_aggregates
        GROUP BY category_id, type
    """)
    agg_cat_map = {(row[0], row[1]): (round(row[2], 2), row[3]) for row in cur.fetchall()}

    all_cat_keys = set(raw_cat_map.keys()) | set(agg_cat_map.keys())
    for cat_id, t_type in all_cat_keys:
        r_amt, r_cnt = raw_cat_map.get((cat_id, t_type), (0.0, 0))
        a_amt, a_cnt = agg_cat_map.get((cat_id, t_type), (0.0, 0))
        if abs(r_amt - a_amt) > 0.01:
            discrepancies.append(f"Category {cat_id} ({t_type}) amount mismatch: Raw=${r_amt:,.2f} vs Agg=${a_amt:,.2f}")
        if r_cnt != a_cnt:
            discrepancies.append(f"Category {cat_id} ({t_type}) count mismatch: Raw={r_cnt} txs vs Agg={a_cnt} txs")

    # 3. Check for Duplicate or Invalid Primary Keys in daily_aggregates
    cur.execute("""
        SELECT date, type, category_id, COUNT(*)
        FROM daily_aggregates
        GROUP BY date, type, category_id
        HAVING COUNT(*) > 1
    """)
    dupe_aggs = cur.fetchall()
    if dupe_aggs:
        discrepancies.append(f"Found {len(dupe_aggs)} duplicate daily_aggregates primary key tuples!")

    conn.close()

    is_consistent = len(discrepancies) == 0
    return {
        "is_consistent": is_consistent,
        "discrepancies_count": len(discrepancies),
        "discrepancies": discrepancies,
        "raw_totals": raw_type_map,
        "aggregate_totals": agg_type_map
    }
