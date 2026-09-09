import time
import hashlib
import tracemalloc
import random
import json
import sqlite3
import os
from typing import List, Tuple, Dict, Any

def generate_sample_rows(count: int) -> List[Tuple[str, float, int, str, str]]:
    categories = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    types = ["income", "expense"]
    dates = [f"2025-{random.randint(1,12):02d}-{random.randint(1,28):02d}" for _ in range(100)]
    
    rows = []
    for i in range(count):
        t = random.choice(types)
        amt = round(random.uniform(5.0, 500.0), 2)
        cat = random.choice(categories)
        d = random.choice(dates)
        note = f"Transaction note number {i % 1000}"
        rows.append((t, amt, cat, d, note))
    return rows

def compute_fingerprint(t_type: str, amount: float, category_id: int, date_val: str, note_val: str) -> str:
    norm = f"{t_type}|{amount:.2f}|{category_id}|{date_val}|{note_val.strip().lower()}"
    return hashlib.sha256(norm.encode('utf-8')).hexdigest()[:16]

def benchmark_duplicate_strategies():
    print("=============================================================")
    print("=== DUPLICATE DETECTION ALGORITHM & SCALING BENCHMARK ===")
    print("=============================================================")

    results = {}
    test_sizes = [10_000, 100_000, 1_000_000]

    for size in test_sizes:
        print(f"\n--- Testing Dataset Size: {size:,} Transactions ---")
        existing_pool = generate_sample_rows(size)
        incoming_batch = generate_sample_rows(5_000) # 5000 new rows to import
        # inject 20% duplicates into incoming batch
        for idx in range(1000):
            incoming_batch[idx] = existing_pool[idx]

        size_key = f"{size//1000}k" if size < 1_000_000 else f"{size//1_000_000}m"
        results[size_key] = {}

        # -------------------------------------------------------------
        # Strategy 1: Naive Pairwise Comparison O(N * M)
        # -------------------------------------------------------------
        if size <= 10_000:
            t0 = time.perf_counter()
            dupes_naive = 0
            for inc in incoming_batch[:500]: # only 500 to keep it manageable
                for ex in existing_pool:
                    if inc == ex:
                        dupes_naive += 1
                        break
            t1 = time.perf_counter()
            naive_scaled_time = (t1 - t0) * (5000 / 500) * 1000.0 # scale to 5000 rows
            results[size_key]["naive_pairwise"] = {
                "estimated_time_ms": round(naive_scaled_time, 2),
                "complexity": "O(N * M)"
            }
            print(f"  [1] Naive Pairwise O(N*M): ~{naive_scaled_time:.2f} ms")
        else:
            results[size_key]["naive_pairwise"] = {
                "estimated_time_ms": "O(N*M) Unfeasible (>100 seconds)",
                "complexity": "O(N * M)"
            }
            print(f"  [1] Naive Pairwise O(N*M): [SKIPPED - Impractically Slow]")

        # -------------------------------------------------------------
        # Strategy 2: In-Memory Tuple Hash-Set O(N + M)
        # -------------------------------------------------------------
        tracemalloc.start()
        t0 = time.perf_counter()
        # Startup / Set building cost
        hash_set = set(existing_pool)
        t_built = time.perf_counter()
        
        # Lookup latency
        dupes_set = 0
        for inc in incoming_batch:
            if inc in hash_set:
                dupes_set += 1
        t_done = time.perf_counter()
        _, peak_mem_set = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        set_build_ms = (t_built - t0) * 1000.0
        set_lookup_ms = (t_done - t_built) * 1000.0
        set_throughput = len(incoming_batch) / (t_done - t_built)

        results[size_key]["tuple_hash_set"] = {
            "build_time_ms": round(set_build_ms, 2),
            "lookup_time_ms": round(set_lookup_ms, 3),
            "throughput_rows_per_sec": round(set_throughput, 1),
            "peak_memory_mb": round(peak_mem_set / (1024 * 1024), 2),
            "duplicates_found": dupes_set
        }
        print(f"  [2] Tuple Hash-Set: Build = {set_build_ms:.2f} ms | Lookup (5k rows) = {set_lookup_ms:.2f} ms ({set_throughput:,.0f} rows/s) | RAM = {peak_mem_set/(1024*1024):.2f} MB")

        # -------------------------------------------------------------
        # Strategy 3: SHA-256 Fingerprint Index / Set
        # -------------------------------------------------------------
        tracemalloc.start()
        t0 = time.perf_counter()
        # Compute 64-bit/128-bit hex fingerprints
        fp_set = {compute_fingerprint(*row) for row in existing_pool}
        t_built_fp = time.perf_counter()

        dupes_fp = 0
        for inc in incoming_batch:
            if compute_fingerprint(*inc) in fp_set:
                dupes_fp += 1
        t_done_fp = time.perf_counter()
        _, peak_mem_fp = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        fp_build_ms = (t_built_fp - t0) * 1000.0
        fp_lookup_ms = (t_done_fp - t_built_fp) * 1000.0
        fp_throughput = len(incoming_batch) / (t_done_fp - t_built_fp)

        results[size_key]["fingerprint_set"] = {
            "build_time_ms": round(fp_build_ms, 2),
            "lookup_time_ms": round(fp_lookup_ms, 3),
            "throughput_rows_per_sec": round(fp_throughput, 1),
            "peak_memory_mb": round(peak_mem_fp / (1024 * 1024), 2),
            "duplicates_found": dupes_fp
        }
        print(f"  [3] Fingerprint Set (SHA-256): Build = {fp_build_ms:.2f} ms | Lookup (5k rows) = {fp_lookup_ms:.2f} ms ({fp_throughput:,.0f} rows/s) | RAM = {peak_mem_fp/(1024*1024):.2f} MB")

    return results

if __name__ == "__main__":
    res = benchmark_duplicate_strategies()
    with open("benchmarks/results/duplicate_detection_benchmark.json", "w") as f:
        json.dump(res, f, indent=2)
