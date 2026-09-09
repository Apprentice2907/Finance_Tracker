import os
import sys
import json
import time
import argparse
from typing import Dict, Any

from benchmarks.generate_dataset import generate_dataset
from benchmarks.database_benchmark import (
    benchmark_single_inserts, benchmark_batch_inserts,
    benchmark_date_range_query, benchmark_category_aggregation
)
from benchmarks.dashboard_benchmark import benchmark_dashboard_generation
from benchmarks.search_benchmark import benchmark_text_search, benchmark_filtered_sort
from benchmarks.memory_benchmark import benchmark_memory_usage

def run_all_benchmarks(
    dataset_sizes=[10_000, 100_000, 1_000_000],
    output_json: str = "benchmarks/results/baseline.json"
) -> Dict[str, Any]:
    """
    Executes the comprehensive benchmark suite across multiple dataset sizes.
    """
    import sqlite3
    import platform
    results: Dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "environment": {
            "os": sys.platform,
            "platform": platform.platform(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": sys.version.split()[0],
            "sqlite_version": sqlite3.sqlite_version,
        },
        "datasets": {}
    }

    base_dir = os.path.dirname(os.path.abspath(__file__))
    datasets_dir = os.path.join(base_dir, "datasets")
    os.makedirs(datasets_dir, exist_ok=True)
    os.makedirs(os.path.dirname(output_json), exist_ok=True)

    print("=" * 75)
    print("=== FINANCE TRACKER PERFORMANCE BENCHMARK SUITE ===")
    print("=" * 75)

    for size in dataset_sizes:
        size_label = f"{size//1000}k" if size < 1_000_000 else f"{size//1_000_000}m"
        db_path = os.path.join(datasets_dir, f"transactions_{size_label}.db")

        if not os.path.exists(db_path):
            print(f"\n[GENERATING] Deterministic synthetic dataset ({size:,} rows)...")
            generate_dataset(db_path, row_count=size, seed=42)
        
        db_size_mb = os.path.getsize(db_path) / (1024 * 1024)
        print(f"\n[BENCHMARKING DATASET] {size:,} transactions ({size_label.upper()}) · DB Size: {db_size_mb:.2f} MB")
        print("-" * 75)

        ds_results = {
            "row_count": size,
            "db_size_mb": round(db_size_mb, 2),
            "benchmarks": {}
        }

        # 1. Dashboard Generation Benchmark
        print("  Running Dashboard full-computation benchmark...")
        dash_res = benchmark_dashboard_generation(db_path, iterations=40 if size <= 100_000 else 15)
        ds_results["benchmarks"]["dashboard"] = dash_res
        print(f"    -> Dashboard p50: {dash_res['p50_ms']} ms | p95: {dash_res['p95_ms']} ms | p99: {dash_res['p99_ms']} ms | Throughput: {dash_res['throughput_ops_per_sec']} ops/s")

        # 2. Date Range Query
        print("  Running Date Range scan (1 month)...")
        date_res = benchmark_date_range_query(db_path, iterations=50 if size <= 100_000 else 20)
        ds_results["benchmarks"]["date_range"] = date_res
        print(f"    -> Date Range p50: {date_res['p50_ms']} ms | p95: {date_res['p95_ms']} ms | Throughput: {date_res['throughput_ops_per_sec']} ops/s")

        # 3. Category Aggregation (JOIN + GROUP BY)
        print("  Running Category Aggregation (1 year)...")
        cat_res = benchmark_category_aggregation(db_path, iterations=40 if size <= 100_000 else 15)
        ds_results["benchmarks"]["category_aggregation"] = cat_res
        print(f"    -> Category Agg p50: {cat_res['p50_ms']} ms | p95: {cat_res['p95_ms']} ms")

        # 4. Search & Filter
        print("  Running Text Search (LIKE '%cafe%')...")
        search_res = benchmark_text_search(db_path, term="cafe", iterations=20 if size <= 100_000 else 10)
        ds_results["benchmarks"]["text_search"] = search_res
        print(f"    -> Text Search p50: {search_res['p50_ms']} ms | p95: {search_res['p95_ms']} ms")

        # 5. Insertions (Single & Batched)
        if size <= 100_000:
            print("  Running Single Insert vs Batch Insert (100, 1000, 10000)...")
            single_ins = benchmark_single_inserts(db_path, count=50)
            batch_100 = benchmark_batch_inserts(db_path, batch_size=100, batches=10)
            batch_1000 = benchmark_batch_inserts(db_path, batch_size=1000, batches=5)
            ds_results["benchmarks"]["single_insert"] = single_ins
            ds_results["benchmarks"]["batch_insert_100"] = batch_100
            ds_results["benchmarks"]["batch_insert_1000"] = batch_1000
            print(f"    -> Single Insert p50: {single_ins['p50_ms']} ms/tx ({single_ins['throughput_ops_per_sec']} tx/s)")
            print(f"    -> Batch 100 p50: {batch_100['p50_ms']} ms ({batch_100['throughput_ops_per_sec'] * 100:.0f} tx/s)")
            print(f"    -> Batch 1000 p50: {batch_1000['p50_ms']} ms ({batch_1000['throughput_ops_per_sec'] * 1000:.0f} tx/s)")

        # 6. Memory Profile
        print("  Running Memory Profile...")
        mem_res = benchmark_memory_usage(db_path)
        ds_results["benchmarks"]["memory"] = mem_res
        print(f"    -> Idle RSS: {mem_res['rss_idle_mb']} MB | Delta Load: {mem_res['memory_delta_load_mb']} MB")

        results["datasets"][size_label] = ds_results

    # Save to JSON
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 75)
    print(f"[DONE] Benchmark suite completed. Results saved to: {output_json}")
    print("=" * 75)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Finance Tracker Benchmark Runner")
    parser.add_argument("--sizes", nargs="+", type=int, default=[10000, 100000, 1000000], help="Dataset sizes to benchmark")
    parser.add_argument("--output", type=str, default="benchmarks/results/baseline.json", help="Output JSON results path")
    args = parser.parse_args()

    run_all_benchmarks(dataset_sizes=args.sizes, output_json=args.output)
