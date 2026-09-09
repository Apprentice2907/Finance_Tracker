import sqlite3
from typing import Dict, Any
from benchmarks.metrics import BenchmarkMetrics

def benchmark_text_search(db_path: str, term: str = "cafe", iterations: int = 30) -> Dict[str, Any]:
    """Measures latency of non-sargable LIKE search across note and category."""
    metrics = BenchmarkMetrics(name=f"text_search_term_{term}", iterations=iterations, warmups=5)

    def search():
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        s = f"%{term}%"
        cur.execute("""
            SELECT transactions.id, transactions.type, transactions.amount,
                   transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                   transactions.date, transactions.note
            FROM transactions
            LEFT JOIN categories ON transactions.category_id = categories.id
            WHERE (transactions.note LIKE ? OR categories.name LIKE ? OR CAST(transactions.amount AS TEXT) LIKE ?)
            ORDER BY transactions.date DESC
            LIMIT 50
        """, (s, s, s))
        rows = cur.fetchall()
        conn.close()
        return len(rows)

    return metrics.time_operation(search)

def benchmark_filtered_sort(db_path: str, sort_by: str = "amount_desc", iterations: int = 30) -> Dict[str, Any]:
    """Measures multi-filtered queries sorted by amount or date."""
    metrics = BenchmarkMetrics(name=f"filter_sort_{sort_by}", iterations=iterations, warmups=5)

    def query():
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        order_clause = "ORDER BY transactions.amount DESC, transactions.date DESC" if sort_by == "amount_desc" else "ORDER BY transactions.date DESC"
        cur.execute(f"""
            SELECT transactions.id, transactions.type, transactions.amount,
                   transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                   transactions.date, transactions.note
            FROM transactions
            LEFT JOIN categories ON transactions.category_id = categories.id
            WHERE transactions.type = 'expense' AND transactions.category_id = 6
            {order_clause}
            LIMIT 50
        """)
        rows = cur.fetchall()
        conn.close()
        return len(rows)

    return metrics.time_operation(query)
