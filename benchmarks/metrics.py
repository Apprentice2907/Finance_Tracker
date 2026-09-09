import time
import math
import statistics
import tracemalloc
import os
import psutil
from typing import List, Dict, Any, Callable

class BenchmarkMetrics:
    """
    High-resolution benchmark timer and statistical metrics aggregator.
    Computes min, max, mean, median, p50, p95, p99, stddev, and throughput.
    """
    def __init__(self, name: str, iterations: int = 100, warmups: int = 10):
        self.name = name
        self.iterations = iterations
        self.warmups = warmups
        self.latencies_ms: List[float] = []
        self.memory_start_mb: float = 0.0
        self.memory_peak_mb: float = 0.0
        self.memory_diff_mb: float = 0.0

    @staticmethod
    def get_process_memory_mb() -> float:
        try:
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / (1024 * 1024)
        except Exception:
            return 0.0

    def time_operation(self, func: Callable, *args, **kwargs) -> Dict[str, Any]:
        """Runs warmup iterations followed by timed benchmark iterations."""
        # 1. Warm-up phase (ensures JIT, disk cache, and SQLite caches are populated)
        for _ in range(self.warmups):
            func(*args, **kwargs)

        # 2. Memory snapshot before
        tracemalloc.start()
        mem_start = self.get_process_memory_mb()
        self.latencies_ms = []

        # 3. Measurement phase with monotonic timer
        for _ in range(self.iterations):
            t0 = time.perf_counter_ns()
            func(*args, **kwargs)
            t1 = time.perf_counter_ns()
            latency_ms = (t1 - t0) / 1_000_000.0
            self.latencies_ms.append(latency_ms)

        # 4. Memory snapshot after
        current_trace, peak_trace = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        mem_end = self.get_process_memory_mb()

        return self.compute_summary(mem_start, mem_end, peak_trace / (1024 * 1024))

    def compute_summary(self, mem_start: float = 0.0, mem_end: float = 0.0, peak_trace_mb: float = 0.0) -> Dict[str, Any]:
        if not self.latencies_ms:
            return {}

        sorted_latencies = sorted(self.latencies_ms)
        n = len(sorted_latencies)

        def percentile(p: float) -> float:
            k = (n - 1) * p
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return sorted_latencies[int(k)]
            d0 = sorted_latencies[int(f)] * (c - k)
            d1 = sorted_latencies[int(c)] * (k - f)
            return d0 + d1

        total_time_ms = sum(sorted_latencies)
        mean_ms = statistics.mean(sorted_latencies)
        stddev_ms = statistics.stdev(sorted_latencies) if n > 1 else 0.0
        throughput = (n / (total_time_ms / 1000.0)) if total_time_ms > 0 else 0.0

        return {
            "name": self.name,
            "iterations": n,
            "warmups": self.warmups,
            "min_ms": round(min(sorted_latencies), 4),
            "max_ms": round(max(sorted_latencies), 4),
            "mean_ms": round(mean_ms, 4),
            "median_ms": round(statistics.median(sorted_latencies), 4),
            "p50_ms": round(percentile(0.50), 4),
            "p95_ms": round(percentile(0.95), 4),
            "p99_ms": round(percentile(0.99), 4),
            "stddev_ms": round(stddev_ms, 4),
            "throughput_ops_per_sec": round(throughput, 2),
            "memory_start_mb": round(mem_start, 2),
            "memory_end_mb": round(mem_end, 2),
            "memory_peak_traced_mb": round(peak_trace_mb, 2),
        }
