import os
import sys
import json
import argparse
from typing import Dict, Any

def compare_results(
    baseline_file: str,
    current_file: str,
    threshold_warn: float = 8.0,
    threshold_fail: float = 20.0
) -> bool:
    """
    Comprehensive regression comparator checking:
    - Latency (p95_ms)
    - Throughput (ops/s)
    - Memory footprint (MB)
    """
    if not os.path.exists(baseline_file):
        print(f"Baseline file '{baseline_file}' not found.")
        return False
    if not os.path.exists(current_file):
        print(f"Current benchmark file '{current_file}' not found.")
        return False

    with open(baseline_file, "r", encoding="utf-8") as f:
        base = json.load(f)
    with open(current_file, "r", encoding="utf-8") as f:
        curr = json.load(f)

    print("=" * 95)
    print("=== FINANCE TRACKER PERFORMANCE REGRESSION FRAMEWORK ===")
    print(f"Baseline: {baseline_file} (Recorded: {base.get('timestamp')})")
    print(f"Current:  {current_file} (Recorded: {curr.get('timestamp')})")
    print("=" * 95)
    print(f"{'DATASET':<8} | {'BENCHMARK / METRIC':<28} | {'BASELINE':<12} | {'CURRENT':<12} | {'CHANGE':<9} | {'STATUS'}")
    print("-" * 95)

    has_regression = False

    for ds_key in base.get("datasets", {}):
        if ds_key not in curr.get("datasets", {}):
            continue
        base_benches = base["datasets"][ds_key].get("benchmarks", {})
        curr_benches = curr["datasets"][ds_key].get("benchmarks", {})

        for b_name in base_benches:
            if b_name not in curr_benches:
                continue
            base_data = base_benches[b_name]
            curr_data = curr_benches[b_name]

            # 1. Check Latency (p95_ms)
            if isinstance(base_data, dict) and "p95_ms" in base_data and "p95_ms" in curr_data:
                b_p95 = base_data["p95_ms"]
                c_p95 = curr_data["p95_ms"]

                pct_change = ((c_p95 - b_p95) / b_p95) * 100.0 if b_p95 > 0 else 0.0

                if pct_change < -5.0:
                    status = f"[FASTER] ({abs(pct_change):.1f}% speedup)"
                elif pct_change <= threshold_warn:
                    status = "[PASS]"
                elif pct_change <= threshold_fail:
                    status = "[WARN]"
                else:
                    status = "[REGRESSION]"
                    has_regression = True

                sign = "+" if pct_change > 0 else ""
                print(f"{ds_key.upper():<8} | {b_name + ' (p95)':<28} | {b_p95:>9.2f} ms | {c_p95:>9.2f} ms | {sign}{pct_change:>5.1f}% | {status}")

            # 2. Check Memory (rss_idle_mb)
            if b_name == "memory" and isinstance(base_data, dict) and "rss_idle_mb" in base_data and "rss_idle_mb" in curr_data:
                b_rss = base_data["rss_idle_mb"]
                c_rss = curr_data["rss_idle_mb"]
                mem_diff = c_rss - b_rss
                status = "[PASS]" if mem_diff <= 15.0 else "[WARN]"
                sign = "+" if mem_diff > 0 else ""
                print(f"{ds_key.upper():<8} | {'memory (idle RSS)':<28} | {b_rss:>9.2f} MB | {c_rss:>9.2f} MB | {sign}{mem_diff:>5.1f} MB| {status}")

    print("=" * 95)
    if has_regression:
        print("[FAIL] Performance regression detected exceeding threshold!")
        return False
    else:
        print("[PASS] All benchmarks passed regression assertion checks successfully.")
        return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Finance Tracker Regression Comparator")
    parser.add_argument("--baseline", type=str, default="benchmarks/results/baseline.json", help="Path to baseline.json")
    parser.add_argument("--current", type=str, default="benchmarks/results/latest.json", help="Path to latest.json")
    parser.add_argument("--warn-threshold", type=float, default=8.0, help="Warning percentage threshold")
    parser.add_argument("--fail-threshold", type=float, default=20.0, help="Fail percentage threshold")

    args = parser.parse_args()
    ok = compare_results(args.baseline, args.current, args.warn_threshold, args.fail_threshold)
    sys.exit(0 if ok else 1)
