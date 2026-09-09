import time
import queue
import threading
import tracemalloc
import sqlite3
import os
import json
from typing import List, Tuple, Dict, Any

def generate_import_batch(count: int = 20_000) -> List[Tuple[str, float, int, str, str]]:
    categories = [1, 2, 3, 4, 5, 6, 7, 8]
    types = ["income", "expense"]
    rows = []
    for i in range(count):
        rows.append((
            types[i % 2],
            round(10.0 + (i % 200), 2),
            categories[i % len(categories)],
            f"2025-{(i%12)+1:02d}-{(i%28)+1:02d}",
            f"Import batch item {i}"
        ))
    return rows

def run_single_threaded_import(db_path: str, rows: List[Tuple], batch_size: int = 2000) -> Dict[str, Any]:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    cur = conn.cursor()

    tracemalloc.start()
    t0 = time.perf_counter()

    # Simulate parsing + inserting in single thread
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i+batch_size]
        cur.executemany("INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)", chunk)
        conn.commit()

    t1 = time.perf_counter()
    _, peak_ram = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    conn.close()

    elapsed = t1 - t0
    return {
        "mode": "single_threaded",
        "rows": len(rows),
        "elapsed_sec": round(elapsed, 4),
        "throughput_rows_sec": round(len(rows) / elapsed, 1),
        "peak_ram_mb": round(peak_ram / (1024 * 1024), 2)
    }

def run_producer_consumer_import(db_path: str, rows: List[Tuple], queue_size: int = 8, batch_size: int = 2000) -> Dict[str, Any]:
    batch_queue = queue.Queue(maxsize=queue_size)
    producer_wait_time = 0.0
    consumer_wait_time = 0.0
    producer_wait_lock = threading.Lock()
    consumer_wait_lock = threading.Lock()

    SENTINEL = object()

    def producer():
        nonlocal producer_wait_time
        for i in range(0, len(rows), batch_size):
            chunk = rows[i:i+batch_size]
            # Simulate parsing overhead
            time.sleep(0.002)
            t_put_start = time.perf_counter()
            batch_queue.put(chunk)
            t_put_end = time.perf_counter()
            with producer_wait_lock:
                producer_wait_time += (t_put_end - t_put_start)
        batch_queue.put(SENTINEL)

    def consumer():
        nonlocal consumer_wait_time
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        cur = conn.cursor()

        while True:
            t_get_start = time.perf_counter()
            item = batch_queue.get()
            t_get_end = time.perf_counter()
            with consumer_wait_lock:
                consumer_wait_time += (t_get_end - t_get_start)

            if item is SENTINEL:
                batch_queue.task_done()
                break

            cur.executemany("INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)", item)
            conn.commit()
            batch_queue.task_done()
        conn.close()

    tracemalloc.start()
    t0 = time.perf_counter()

    prod_thread = threading.Thread(target=producer)
    cons_thread = threading.Thread(target=consumer)

    prod_thread.start()
    cons_thread.start()

    prod_thread.join()
    cons_thread.join()

    t1 = time.perf_counter()
    _, peak_ram = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    elapsed = t1 - t0
    return {
        "mode": f"producer_consumer_q{queue_size}",
        "queue_capacity": queue_size,
        "rows": len(rows),
        "elapsed_sec": round(elapsed, 4),
        "throughput_rows_sec": round(len(rows) / elapsed, 1),
        "peak_ram_mb": round(peak_ram / (1024 * 1024), 2),
        "producer_blocked_wait_sec": round(producer_wait_time, 4),
        "consumer_idle_wait_sec": round(consumer_wait_time, 4)
    }

def benchmark_all_pipelines(db_path: str):
    print("\n=======================================================")
    print("=== PRODUCER-CONSUMER IMPORT PIPELINE EXPERIMENT ===")
    print("=======================================================")

    rows = generate_import_batch(count=30_000)
    results = {}

    # Single-threaded
    st_res = run_single_threaded_import(db_path, rows)
    results["single_threaded"] = st_res
    print(f"  Single-Threaded: {st_res['throughput_rows_sec']:,.1f} rows/s | Time: {st_res['elapsed_sec']:.3f}s | RAM: {st_res['peak_ram_mb']} MB")

    # Queue sizes: 1, 4, 8, 16, 32
    for q_size in [1, 4, 8, 16, 32]:
        pc_res = run_producer_consumer_import(db_path, rows, queue_size=q_size)
        results[f"queue_{q_size}"] = pc_res
        print(f"  Queue Size {q_size:2d}: {pc_res['throughput_rows_sec']:,.1f} rows/s | Time: {pc_res['elapsed_sec']:.3f}s | RAM: {pc_res['peak_ram_mb']} MB | Prod Blocked: {pc_res['producer_blocked_wait_sec']:.3f}s | Cons Idle: {pc_res['consumer_idle_wait_sec']:.3f}s")

    return results

if __name__ == "__main__":
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "transactions_100k.db")
    res = benchmark_all_pipelines(db_path)
    with open("benchmarks/results/import_pipeline_experiment.json", "w") as f:
        json.dump(res, f, indent=2)
