"""
Performance Monitoring - Track latency, throughput, errors
"""
import json
import sqlite3
import time
import statistics
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps


class PerformanceMonitor:
    """
    Performance monitoring for ML systems
    Tracks: latency (p50, p95, p99), throughput, error rates
    """

    def __init__(self, db_path: str = "data/performance.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    operation_type TEXT NOT NULL,
                    latency_ms REAL,
                    success INTEGER,
                    error_type TEXT,
                    model_id TEXT,
                    metadata TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_perf_time ON performance_metrics(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_perf_op ON performance_metrics(operation_type)")

    def record_request(self, operation_type: str, latency_ms: float,
                      success: bool, model_id: Optional[str] = None,
                      error_type: Optional[str] = None,
                      metadata: Optional[Dict] = None):
        """Record a request metric"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO performance_metrics
                (timestamp, operation_type, latency_ms, success, error_type, model_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (datetime.utcnow().isoformat(), operation_type, latency_ms,
                  int(success), error_type, model_id, json.dumps(metadata or {})))

    def get_latency_stats(self, operation_type: str, minutes: int = 60) -> Dict[str, float]:
        """Get latency statistics for an operation"""
        since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("""
                SELECT latency_ms FROM performance_metrics
                WHERE operation_type = ? AND timestamp >= ? AND success = 1
            """, (operation_type, since)).fetchall()

        latencies = [r[0] for r in rows if r[0] is not None]
        if not latencies:
            return {"count": 0}

        latencies.sort()
        return {
            "count": len(latencies),
            "p50": statistics.median(latencies),
            "p95": latencies[int(len(latencies) * 0.95)] if len(latencies) > 1 else latencies[0],
            "p99": latencies[int(len(latencies) * 0.99)] if len(latencies) > 1 else latencies[0],
            "min": min(latencies),
            "max": max(latencies),
            "mean": statistics.mean(latencies)
        }

    def get_error_rate(self, operation_type: str, minutes: int = 60) -> Dict[str, Any]:
        """Get error rate for an operation"""
        since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            total = conn.execute("""
                SELECT COUNT(*) FROM performance_metrics
                WHERE operation_type = ? AND timestamp >= ?
            """, (operation_type, since)).fetchone()[0]
            errors = conn.execute("""
                SELECT COUNT(*) FROM performance_metrics
                WHERE operation_type = ? AND timestamp >= ? AND success = 0
            """, (operation_type, since)).fetchone()[0]

        error_rate = errors / total if total > 0 else 0
        return {"total_requests": total, "errors": errors, "error_rate": error_rate, "success_rate": 1 - error_rate}

    def get_throughput(self, operation_type: str, minutes: int = 60) -> Dict[str, float]:
        """Get throughput (requests per minute)"""
        since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            count = conn.execute("""
                SELECT COUNT(*) FROM performance_metrics
                WHERE operation_type = ? AND timestamp >= ?
            """, (operation_type, since)).fetchone()[0]
        return {"total_requests": count, "requests_per_minute": count / minutes}

    def timed_operation(self, operation_type: str, model_id: Optional[str] = None):
        """Decorator to time an operation"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    self.record_request(operation_type, (time.time() - start) * 1000, True, model_id)
                    return result
                except Exception as e:
                    self.record_request(operation_type, (time.time() - start) * 1000, False, model_id, type(e).__name__)
                    raise
            return wrapper
        return decorator


_monitor = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get or create performance monitor"""
    global _monitor
    if _monitor is None:
        _monitor = PerformanceMonitor()
    return _monitor
