import time
import os
import sys
import sqlite3
import json
from typing import Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def benchmark_like_vs_fts5(db_path: str, search_terms=["coffee", "salary", "lunch", "grocery"]) -> Dict[str, Any]:
    print(f"\n=======================================================")
    print(f"=== SEARCH BENCHMARK: LIKE vs FTS5 ({os.path.basename(db_path)}) ===")
    print(f"=======================================================")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA cache_size = -64000;")
    cur.execute("PRAGMA synchronous = NORMAL;")

    # 1. Benchmark Standard LIKE '%term%' Search
    like_times = []
    for term in search_terms:
        for _ in range(20):
            t0 = time.perf_counter()
            cur.execute("""
                SELECT transactions.id, transactions.type, transactions.amount,
                       transactions.category_id, COALESCE(categories.name, 'Uncategorised'), 
                       transactions.date, transactions.note, COALESCE(categories.color, '#6FA8DC')
                FROM transactions
                LEFT JOIN categories ON transactions.category_id = categories.id
                WHERE (transactions.note LIKE ? OR categories.name LIKE ? OR transactions.date LIKE ?)
                LIMIT 50
            """, (f"%{term}%", f"%{term}%", f"%{term}%"))
            _ = cur.fetchall()
            like_times.append((time.perf_counter() - t0) * 1000.0)

    # 2. Setup Temporary FTS5 Virtual Table for comparison
    cur.execute("CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(note, category_name, content='transactions', content_rowid='id');")
    cur.execute("INSERT OR REPLACE INTO transactions_fts(rowid, note, category_name) SELECT t.id, t.note, COALESCE(c.name, '') FROM transactions t LEFT JOIN categories c ON t.category_id = c.id;")
    conn.commit()

    fts_times = []
    for term in search_terms:
        for _ in range(20):
            t0 = time.perf_counter()
            cur.execute("""
                SELECT t.id, t.type, t.amount, t.category_id, COALESCE(c.name, 'Uncategorised'),
                       t.date, t.note, COALESCE(c.color, '#6FA8DC')
                FROM transactions_fts f
                JOIN transactions t ON f.rowid = t.id
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE transactions_fts MATCH ?
                LIMIT 50
            """, (f"{term}*",))
            _ = cur.fetchall()
            fts_times.append((time.perf_counter() - t0) * 1000.0)

    # Clean up temporary FTS table from benchmark DB
    cur.execute("DROP TABLE IF EXISTS transactions_fts;")
    conn.commit()
    conn.close()

    def calc_stats(arr):
        s = sorted(arr)
        return {
            "p50_ms": round(s[len(s)//2], 3),
            "p95_ms": round(s[int(len(s)*0.95)], 3),
            "p99_ms": round(s[int(len(s)*0.99)], 3),
            "throughput_ops_sec": round(len(arr) / (sum(arr) / 1000.0), 1)
        }

    like_stats = calc_stats(like_times)
    fts_stats = calc_stats(fts_times)

    print(f"  LIKE '%term%': p50 = {like_stats['p50_ms']} ms | p95 = {like_stats['p95_ms']} ms | Throughput = {like_stats['throughput_ops_sec']} ops/s")
    print(f"  FTS5 Match:    p50 = {fts_stats['p50_ms']} ms | p95 = {fts_stats['p95_ms']} ms | Throughput = {fts_stats['throughput_ops_sec']} ops/s")
    print(f"  Speedup Factor: {like_stats['p50_ms'] / fts_stats['p50_ms']:.2f}x (FTS5 vs LIKE)")

    return {
        "database": os.path.basename(db_path),
        "like_search": like_stats,
        "fts5_search": fts_stats,
        "speedup_factor": round(like_stats["p50_ms"] / fts_stats["p50_ms"], 2)
    }

if __name__ == "__main__":
    db_100k = os.path.join(os.path.dirname(__file__), "datasets", "transactions_100k.db")
    db_1m = os.path.join(os.path.dirname(__file__), "datasets", "transactions_1m.db")
    
    r_100k = benchmark_like_vs_fts5(db_100k)
    r_1m = benchmark_like_vs_fts5(db_1m)

    with open("benchmarks/results/fts5_benchmark.json", "w") as f:
        json.dump({"100k": r_100k, "1m": r_1m}, f, indent=2)
