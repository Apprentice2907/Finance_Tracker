import time
import logging
import json
import sys
import os
import psutil
from typing import Dict, Any, Optional
from contextlib import contextmanager

# Configure structured application logger
_OBS_LOGGER = logging.getLogger("finance_tracker.observability")
_OBS_LOGGER.setLevel(logging.INFO)

# In-Memory Metric Counters for diagnostics screen
class MetricsRegistry:
    def __init__(self):
        self.operation_counts: Dict[str, int] = {}
        self.operation_total_ms: Dict[str, float] = {}
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self.cache_invalidations: int = 0
        self.import_stats: Dict[str, int] = {"imported": 0, "skipped_duplicates": 0, "invalid": 0}
        self.export_stats: Dict[str, int] = {"exported_rows": 0, "export_count": 0}
        self.startup_timings: Dict[str, float] = {}
        self.recent_errors: list = []

    def record_op(self, op: str, duration_ms: float, status: str = "success"):
        self.operation_counts[op] = self.operation_counts.get(op, 0) + 1
        self.operation_total_ms[op] = self.operation_total_ms.get(op, 0.0) + duration_ms

    def record_cache_hit(self):
        self.cache_hits += 1

    def record_cache_miss(self):
        self.cache_misses += 1

    def record_cache_invalidation(self):
        self.cache_invalidations += 1

    def record_error(self, op: str, error_msg: str):
        self.recent_errors.append({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "operation": op,
            "error": error_msg[:200] # Safe truncated summary without sensitive data
        })
        if len(self.recent_errors) > 50:
            self.recent_errors.pop(0)

    def get_summary(self) -> Dict[str, Any]:
        total_cache = self.cache_hits + self.cache_misses
        hit_rate = (self.cache_hits / total_cache * 100.0) if total_cache > 0 else 0.0
        
        proc = psutil.Process(os.getpid())
        rss_mb = proc.memory_info().rss / (1024 * 1024)

        avg_latencies = {}
        for op, cnt in self.operation_counts.items():
            avg_latencies[op] = round(self.operation_total_ms[op] / cnt, 3) if cnt > 0 else 0.0

        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "memory_rss_mb": round(rss_mb, 2),
            "cache": {
                "hits": self.cache_hits,
                "misses": self.cache_misses,
                "invalidations": self.cache_invalidations,
                "hit_rate_percent": round(hit_rate, 2)
            },
            "average_latencies_ms": avg_latencies,
            "import_stats": self.import_stats,
            "export_stats": self.export_stats,
            "recent_errors_count": len(self.recent_errors)
        }

METRICS = MetricsRegistry()

@contextmanager
def trace_operation(operation_name: str, extra_meta: Optional[Dict[str, Any]] = None):
    """
    Lightweight context manager for structured operation tracing.
    Emits JSON structured logs and records in-memory aggregates without PII.
    """
    t0 = time.perf_counter()
    status = "success"
    err_str = None
    try:
        yield
    except Exception as exc:
        status = "error"
        err_str = str(exc)
        METRICS.record_error(operation_name, err_str)
        raise
    finally:
        t1 = time.perf_counter()
        dur_ms = (t1 - t0) * 1000.0
        METRICS.record_op(operation_name, dur_ms, status)
        
        record = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "operation": operation_name,
            "duration_ms": round(dur_ms, 3),
            "status": status
        }
        if extra_meta:
            # Filter out sensitive fields
            sanitized_meta = {
                k: v for k, v in extra_meta.items() 
                if k not in ("password", "note", "personal_info", "description")
            }
            record["meta"] = sanitized_meta
        if err_str:
            record["error"] = err_str[:150]

        _OBS_LOGGER.info(json.dumps(record))
