import os
import gc
import sqlite3
import tempfile
from typing import Dict, Any
from benchmarks.metrics import BenchmarkMetrics

def benchmark_memory_usage(db_path: str) -> Dict[str, Any]:
    """Measures memory RSS and peak heap allocations during heavy queries and table loads."""
    gc.collect()
    rss_idle = BenchmarkMetrics.get_process_memory_mb()

    # Measure full table fetch in memory (50K rows)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT id, type, amount, category_id, date, note FROM transactions LIMIT 50000")
    rows = cur.fetchall()
    rss_after_load = BenchmarkMetrics.get_process_memory_mb()
    del rows
    conn.close()
    gc.collect()

    return {
        "rss_idle_mb": round(rss_idle, 2),
        "rss_after_50k_load_mb": round(rss_after_load, 2),
        "memory_delta_load_mb": round(rss_after_load - rss_idle, 2),
    }
