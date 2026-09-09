import sqlite3
import time
from typing import Dict, Any, List
from benchmarks.metrics import BenchmarkMetrics

def benchmark_single_inserts(db_path: str, count: int = 100) -> Dict[str, Any]:
    """Measures latency of individual unbatched INSERT statements."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    metrics = BenchmarkMetrics(name=f"single_insert_{count}_txns", iterations=count, warmups=5)

    def insert_one():
        cur.execute(
            "INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)",
            ("expense", 150.0, 1, "2026-06-15", "Single insert benchmark item")
        )
        conn.commit()

    res = metrics.time_operation(insert_one)
    conn.close()
    return res

def benchmark_batch_inserts(db_path: str, batch_size: int = 1000, batches: int = 10) -> Dict[str, Any]:
    """Measures throughput and latency of batch executemany insertions."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    batch_data = [
        ("expense", round(20.0 + i * 0.5, 2), 1, "2026-06-15", f"Batch benchmark item {i}")
        for i in range(batch_size)
    ]

    metrics = BenchmarkMetrics(name=f"batch_insert_size_{batch_size}", iterations=batches, warmups=2)

    def insert_batch():
        cur.executemany(
            "INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)",
            batch_data
        )
        conn.commit()

    res = metrics.time_operation(insert_batch)
    conn.close()
    return res

def benchmark_date_range_query(db_path: str, start_date: str = "2025-01-01", end_date: str = "2025-01-31", iterations: int = 50) -> Dict[str, Any]:
    """Measures date range query performance."""
    metrics = BenchmarkMetrics(name="date_range_query", iterations=iterations, warmups=10)

    def query():
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT id, type, amount, category_id, date, note FROM transactions WHERE date >= ? AND date <= ?", (start_date, end_date))
        rows = cur.fetchall()
        conn.close()
        return len(rows)

    return metrics.time_operation(query)

def benchmark_category_aggregation(db_path: str, start_date: str = "2025-01-01", end_date: str = "2025-12-31", iterations: int = 50) -> Dict[str, Any]:
    """Measures category aggregation query performance with JOIN."""
    metrics = BenchmarkMetrics(name="category_aggregation", iterations=iterations, warmups=10)

    def query():
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT categories.name, SUM(transactions.amount), COUNT(transactions.id)
            FROM transactions
            JOIN categories ON transactions.category_id = categories.id
            WHERE transactions.type = 'expense' AND transactions.date >= ? AND transactions.date <= ?
            GROUP BY categories.name
            ORDER BY SUM(transactions.amount) DESC
        """, (start_date, end_date))
        rows = cur.fetchall()
        conn.close()
        return rows

    return metrics.time_operation(query)
