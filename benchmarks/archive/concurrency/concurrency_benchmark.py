import os
import sys
import time
import sqlite3
import threading
import random
import queue
from typing import Dict, Any, List

def run_concurrency_matrix(db_path: str) -> Dict[str, Any]:
    print("===============================================================")
    print("=== SQLITE WAL CONCURRENCY LAB (MULTI-READER / MULTI-WRITER) ===")
    print("===============================================================")

    # Ensure WAL mode and busy_timeout
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.close()

    results = {}
    reader_counts = [1, 2, 4, 8]
    writer_counts = [1, 2, 4]
    duration_secs = 3.0 # Duration per test case

    for num_readers in reader_counts:
        for num_writers in writer_counts:
            test_id = f"R{num_readers}_W{num_writers}"
            print(f"\n--- Testing Concurrency Matrix: {num_readers} Readers, {num_writers} Writers (Duration: {duration_secs}s) ---")

            stop_event = threading.Event()
            read_latencies: List[float] = []
            write_latencies: List[float] = []
            lock_errors = 0
            retries = 0
            lock_error_lock = threading.Lock()
            latency_lock = threading.Lock()

            def reader_worker():
                nonlocal lock_errors
                conn = sqlite3.connect(db_path, timeout=5.0)
                conn.execute("PRAGMA synchronous = NORMAL;")
                cur = conn.cursor()
                while not stop_event.is_set():
                    t0 = time.perf_counter()
                    try:
                        # Dashboard summary query
                        cur.execute("SELECT type, SUM(total_amount) FROM daily_aggregates WHERE date >= '2025-01-01' AND date <= '2025-12-31' GROUP BY type")
                        _ = cur.fetchall()
                        lat = (time.perf_counter() - t0) * 1000.0
                        with latency_lock:
                            read_latencies.append(lat)
                    except sqlite3.OperationalError as e:
                        with lock_error_lock:
                            lock_errors += 1
                    time.sleep(0.001) # 1ms throttle
                conn.close()

            def writer_worker():
                nonlocal lock_errors, retries
                conn = sqlite3.connect(db_path, timeout=5.0)
                conn.execute("PRAGMA synchronous = NORMAL;")
                cur = conn.cursor()
                while not stop_event.is_set():
                    t0 = time.perf_counter()
                    retry_count = 0
                    success = False
                    while not success and retry_count < 5 and not stop_event.is_set():
                        try:
                            cur.execute(
                                "INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)",
                                ("expense", round(random.uniform(5, 100), 2), random.randint(1, 10), "2025-07-01", "Concurrent write test")
                            )
                            conn.commit()
                            success = True
                            lat = (time.perf_counter() - t0) * 1000.0
                            with latency_lock:
                                write_latencies.append(lat)
                        except sqlite3.OperationalError as e:
                            if "locked" in str(e) or "busy" in str(e):
                                retry_count += 1
                                with lock_error_lock:
                                    retries += 1
                                time.sleep(0.005 * (2 ** retry_count)) # exponential backoff
                            else:
                                with lock_error_lock:
                                    lock_errors += 1
                                break
                    time.sleep(0.002)
                conn.close()

            threads: List[threading.Thread] = []
            for _ in range(num_readers):
                threads.append(threading.Thread(target=reader_worker))
            for _ in range(num_writers):
                threads.append(threading.Thread(target=writer_worker))

            t_start = time.perf_counter()
            for t in threads:
                t.start()

            time.sleep(duration_secs)
            stop_event.set()

            for t in threads:
                t.join()

            t_elapsed = time.perf_counter() - t_start

            total_reads = len(read_latencies)
            total_writes = len(write_latencies)
            total_ops = total_reads + total_writes
            throughput = total_ops / t_elapsed

            def calc_percentiles(arr):
                if not arr: return {"p50": 0, "p95": 0, "p99": 0}
                s = sorted(arr)
                return {
                    "p50": round(s[int(len(s)*0.5)], 2),
                    "p95": round(s[int(len(s)*0.95)], 2),
                    "p99": round(s[int(len(s)*0.99)], 2),
                }

            r_stats = calc_percentiles(read_latencies)
            w_stats = calc_percentiles(write_latencies)

            results[test_id] = {
                "readers": num_readers,
                "writers": num_writers,
                "total_reads": total_reads,
                "total_writes": total_writes,
                "throughput_ops_sec": round(throughput, 1),
                "read_latency_p50_ms": r_stats["p50"],
                "read_latency_p95_ms": r_stats["p95"],
                "read_latency_p99_ms": r_stats["p99"],
                "write_latency_p50_ms": w_stats["p50"],
                "write_latency_p95_ms": w_stats["p95"],
                "write_latency_p99_ms": w_stats["p99"],
                "lock_errors": lock_errors,
                "retries": retries
            }

            print(f"  Result: Throughput = {throughput:.1f} ops/s | Reads: {total_reads} (p50: {r_stats['p50']}ms, p95: {r_stats['p95']}ms) | Writes: {total_writes} (p50: {w_stats['p50']}ms, p95: {w_stats['p95']}ms) | Lock Errors: {lock_errors} | Retries: {retries}")

    return results

if __name__ == "__main__":
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "transactions_100k.db")
    res = run_concurrency_matrix(db_path)
    os.makedirs("benchmarks/results", exist_ok=True)
    import json
    with open("benchmarks/results/concurrency_matrix.json", "w") as f:
        json.dump(res, f, indent=2)
