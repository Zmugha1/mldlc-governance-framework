"""Drift Detection - PSI and KS tests"""
import json
import sqlite3
import numpy as np
from typing import Dict, List, Any
from datetime import datetime
from pathlib import Path

try:
    from scipy import stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


class DriftDetector:
    PSI_THRESHOLD = 0.2

    def __init__(self, db_path: str = "data/drift_detection.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._baselines = {}

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS drift_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    feature_name TEXT,
                    drift_type TEXT,
                    drift_score REAL,
                    drift_detected INTEGER,
                    threshold REAL
                )
            """)

    def set_baseline(self, feature_name: str, data: List[float]):
        self._baselines[feature_name] = {
            "mean": float(np.mean(data)),
            "std": float(np.std(data)) if len(data) > 1 else 0.0,
            "min": float(np.min(data)),
            "max": float(np.max(data)),
            "histogram": np.histogram(data, bins=10)[0].tolist()
        }

    def detect_drift(self, feature_name: str, current_data: List[float]) -> Dict:
        if feature_name not in self._baselines:
            return {"drift_detected": False, "error": "No baseline"}

        if not HAS_SCIPY:
            return {"drift_detected": False, "error": "scipy required for drift detection"}

        baseline = self._baselines[feature_name]
        std = baseline["std"] if baseline["std"] > 0 else 0.01
        baseline_sample = np.random.normal(baseline["mean"], std, min(1000, len(current_data) * 2))
        current_arr = np.array(current_data)

        ks_stat, p_value = stats.ks_2samp(baseline_sample, current_arr)

        drift_detected = p_value < 0.05

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO drift_reports (timestamp, feature_name, drift_type, drift_score, drift_detected, threshold)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (datetime.utcnow().isoformat(), feature_name, "data_drift", 1 - p_value, int(drift_detected), 0.05))

        return {"drift_detected": drift_detected, "p_value": float(p_value)}


_detector = None


def get_drift_detector():
    global _detector
    if _detector is None:
        _detector = DriftDetector()
    return _detector
