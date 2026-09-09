import time
import heapq
import random
import tracemalloc
import json
from typing import List, Tuple, Dict, Any

def benchmark_top_k():
    print("\n=======================================================")
    print("=== EXPERIMENT 1: TOP-K ALGORITHMS (SORT vs HEAP) ===")
    print("=======================================================")

    results = {}
    k_values = [3, 5, 10]
    
    # 1. Realistic domain size: N = 15 categories (what Finance Tracker actually has)
    print("\n--- Scenario A: Category Totals Array (N = 15 categories) ---")
    categories_data = [(f"Category_{i}", round(random.uniform(500, 50000), 2)) for i in range(15)]
    results["category_domain_N15"] = {}

    for k in k_values:
        # Full Sort
        t0 = time.perf_counter()
        for _ in range(10000):
            res_sort = sorted(categories_data, key=lambda x: x[1], reverse=True)[:k]
        t_sort = (time.perf_counter() - t0) / 10000 * 1000.0 # ms

        # Heap Top-K
        t0 = time.perf_counter()
        for _ in range(10000):
            res_heap = heapq.nlargest(k, categories_data, key=lambda x: x[1])
        t_heap = (time.perf_counter() - t0) / 10000 * 1000.0 # ms

        results["category_domain_N15"][f"K={k}"] = {
            "full_sort_ms": round(t_sort, 6),
            "heap_top_k_ms": round(t_heap, 6),
            "ratio_sort_to_heap": round(t_sort / t_heap, 3) if t_heap > 0 else 1.0,
            "faster": "Full Sort" if t_sort < t_heap else "Heap Top-K"
        }
        print(f"  K={k}: Sort = {t_sort*1000:.2f} µs | Heap = {t_heap*1000:.2f} µs | Winner: {results['category_domain_N15'][f'K={k}']['faster']}")

    # 2. High Cardinality Datasets (Raw transactions: 100K, 1M, 5M)
    dataset_sizes = [100_000, 1_000_000, 5_000_000]
    results["high_cardinality"] = {}

    for size in dataset_sizes:
        print(f"\n--- Scenario B: High Cardinality Raw Amounts (N = {size:,}) ---")
        raw_items = [random.uniform(1.0, 10000.0) for _ in range(size)]
        results["high_cardinality"][f"N={size}"] = {}

        for k in k_values:
            # Full Sort
            t0 = time.perf_counter()
            res_sort = sorted(raw_items, reverse=True)[:k]
            t_sort = (time.perf_counter() - t0) * 1000.0 # ms

            # Heap Top-K
            t0 = time.perf_counter()
            res_heap = heapq.nlargest(k, raw_items)
            t_heap = (time.perf_counter() - t0) * 1000.0 # ms

            speedup = t_sort / t_heap if t_heap > 0 else 0
            results["high_cardinality"][f"N={size}"][f"K={k}"] = {
                "full_sort_ms": round(t_sort, 3),
                "heap_top_k_ms": round(t_heap, 3),
                "speedup_factor": round(speedup, 2)
            }
            print(f"  N={size:,}, K={k}: Sort = {t_sort:.2f} ms | Heap = {t_heap:.2f} ms | Heap Speedup = {speedup:.2f}x")

    return results

def benchmark_aggregation_strategies():
    print("\n=======================================================")
    print("=== EXPERIMENT 2: AGGREGATION ALGORITHMS ===")
    print("=======================================================")

    N = 1_000_000
    print(f"Simulating 1,000,000 transactions across 10 categories...")

    categories = [f"Cat_{i}" for i in range(10)]
    transactions = [(random.choice(categories), round(random.uniform(5.0, 500.0), 2)) for _ in range(N)]

    # Algorithm 1: Python Standard Dict Aggregation O(N)
    tracemalloc.start()
    t0 = time.perf_counter()
    agg_dict = {}
    for cat, amt in transactions:
        agg_dict[cat] = agg_dict.get(cat, 0.0) + amt
    t1 = time.perf_counter()
    _, peak_mem_dict = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    py_dict_time = (t1 - t0) * 1000.0

    # Algorithm 2: Python Sort + Group Aggregation O(N log N)
    tracemalloc.start()
    t0 = time.perf_counter()
    sorted_tx = sorted(transactions, key=lambda x: x[0])
    agg_sort = {}
    curr_cat = None
    curr_sum = 0.0
    for cat, amt in sorted_tx:
        if cat != curr_cat:
            if curr_cat is not None:
                agg_sort[curr_cat] = curr_sum
            curr_cat = cat
            curr_sum = amt
        else:
            curr_sum += amt
    if curr_cat is not None:
        agg_sort[curr_cat] = curr_sum
    t1 = time.perf_counter()
    _, peak_mem_sort = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    py_sort_time = (t1 - t0) * 1000.0

    print(f"  Python Dict Aggregation O(N): Time = {py_dict_time:.2f} ms | Peak RAM Delta = {peak_mem_dict/1024:.2f} KB")
    print(f"  Python Sort + Scan O(N log N): Time = {py_sort_time:.2f} ms | Peak RAM Delta = {peak_mem_sort/1024:.2f} KB")

    return {
        "dict_aggregation_ms": round(py_dict_time, 2),
        "sort_scan_aggregation_ms": round(py_sort_time, 2),
    }

if __name__ == "__main__":
    top_k_res = benchmark_top_k()
    agg_res = benchmark_aggregation_strategies()
    
    with open("benchmarks/results/algorithm_experiments.json", "w") as f:
        json.dump({"top_k": top_k_res, "aggregation": agg_res}, f, indent=2)
    print("\nSaved algorithm benchmark results to: benchmarks/results/algorithm_experiments.json")
