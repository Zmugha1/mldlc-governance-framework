"""
Model Registry - Complete model lifecycle management
Versioning, staging, A/B testing, lineage tracking
"""
import json
import sqlite3
import hashlib
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path


class ModelStage(Enum):
    """Model lifecycle stages"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"


@dataclass
class ModelVersion:
    """Model version information"""
    name: str
    version: str
    stage: ModelStage
    metrics: Dict[str, float]
    parameters: Dict[str, Any]
    artifacts: List[str]
    created_by: str
    created_at: str
    description: str


class ModelRegistry:
    """
    Model Registry for ML model lifecycle
    Features: versioning, stage transitions, metrics, A/B testing
    """

    def __init__(self, db_path: str = "data/model_registry.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    metrics TEXT,
                    parameters TEXT,
                    artifacts TEXT,
                    created_by TEXT,
                    created_at TEXT,
                    description TEXT,
                    PRIMARY KEY (name, version)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS model_transitions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    from_stage TEXT,
                    to_stage TEXT NOT NULL,
                    transitioned_by TEXT,
                    transitioned_at TEXT,
                    reason TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ab_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    test_name TEXT NOT NULL,
                    model_a_name TEXT NOT NULL,
                    model_a_version TEXT NOT NULL,
                    model_b_name TEXT NOT NULL,
                    model_b_version TEXT NOT NULL,
                    traffic_split REAL NOT NULL,
                    status TEXT NOT NULL,
                    start_date TEXT,
                    end_date TEXT,
                    winner TEXT,
                    metrics TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS model_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL
                )
            """)

    def register_model(self, name: str, version: str,
                      metrics: Optional[Dict[str, float]] = None,
                      parameters: Optional[Dict[str, Any]] = None,
                      artifacts: Optional[List[str]] = None,
                      created_by: str = "unknown",
                      description: str = "") -> bool:
        """Register a new model version"""
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO models
                (name, version, stage, metrics, parameters, artifacts,
                 created_by, created_at, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, version, ModelStage.DEVELOPMENT.value,
                  json.dumps(metrics or {}), json.dumps(parameters or {}),
                  json.dumps(artifacts or []), created_by, now, description))
        return True

    def transition_stage(self, name: str, version: str,
                        to_stage: ModelStage, transitioned_by: str,
                        reason: str = "") -> bool:
        """Transition model to new stage"""
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT stage FROM models WHERE name = ? AND version = ?",
                (name, version)
            ).fetchone()
            if not row:
                return False
            from_stage = row[0]
            conn.execute(
                "UPDATE models SET stage = ? WHERE name = ? AND version = ?",
                (to_stage.value, name, version)
            )
            conn.execute("""
                INSERT INTO model_transitions
                (model_name, version, from_stage, to_stage, transitioned_by, transitioned_at, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, version, from_stage, to_stage.value, transitioned_by, now, reason))
        return True

    def get_model(self, name: str, version: Optional[str] = None,
                 stage: Optional[ModelStage] = None) -> Optional[Dict]:
        """Get model information"""
        with sqlite3.connect(self.db_path) as conn:
            if version:
                row = conn.execute(
                    "SELECT * FROM models WHERE name = ? AND version = ?",
                    (name, version)
                ).fetchone()
            elif stage:
                row = conn.execute(
                    "SELECT * FROM models WHERE name = ? AND stage = ? ORDER BY created_at DESC LIMIT 1",
                    (name, stage.value)
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT * FROM models WHERE name = ? ORDER BY created_at DESC LIMIT 1",
                    (name,)
                ).fetchone()

        if not row:
            return None

        return {
            "name": row[0], "version": row[1], "stage": row[2],
            "metrics": json.loads(row[3]) if row[3] else {},
            "parameters": json.loads(row[4]) if row[4] else {},
            "artifacts": json.loads(row[5]) if row[5] else [],
            "created_by": row[6], "created_at": row[7], "description": row[8]
        }

    def list_models(self, stage: Optional[ModelStage] = None) -> List[Dict]:
        """List all models"""
        with sqlite3.connect(self.db_path) as conn:
            if stage:
                rows = conn.execute(
                    "SELECT * FROM models WHERE stage = ? ORDER BY created_at DESC",
                    (stage.value,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM models ORDER BY created_at DESC").fetchall()

        return [{
            "name": row[0], "version": row[1], "stage": row[2],
            "metrics": json.loads(row[3]) if row[3] else {},
            "created_at": row[7]
        } for row in rows]

    def get_production_model(self, name: str) -> Optional[Dict]:
        """Get the current production version of a model"""
        return self.get_model(name, stage=ModelStage.PRODUCTION)

    def create_ab_test(self, test_name: str,
                      model_a_name: str, model_a_version: str,
                      model_b_name: str, model_b_version: str,
                      traffic_split: float = 0.5) -> bool:
        """Create A/B test between two models"""
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO ab_tests
                (test_name, model_a_name, model_a_version, model_b_name, model_b_version,
                 traffic_split, status, start_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (test_name, model_a_name, model_a_version,
                  model_b_name, model_b_version,
                  traffic_split, "running", now))
        return True

    def get_ab_test_assignment(self, test_name: str, user_id: str) -> Optional[Dict]:
        """Get model assignment for A/B test (consistent hash)"""
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT * FROM ab_tests WHERE test_name = ? AND status = ?",
                (test_name, "running")
            ).fetchone()

        if not row:
            return None

        traffic_split = row[6]
        hash_val = int(hashlib.md5(f"{test_name}:{user_id}".encode()).hexdigest(), 16)
        bucket = (hash_val % 100) / 100
        variant = "A" if bucket < traffic_split else "B"

        return {
            "variant": variant,
            "model_name": row[2] if variant == "A" else row[4],
            "model_version": row[3] if variant == "A" else row[5]
        }

    def end_ab_test(self, test_name: str, winner: Optional[str] = None) -> bool:
        """End A/B test and record winner"""
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE ab_tests SET status = ?, end_date = ?, winner = ?
                WHERE test_name = ?
            """, ("completed", now, winner, test_name))
        return True

    def record_performance(self, name: str, version: str,
                          metric_name: str, metric_value: float):
        """Record runtime performance metric"""
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO model_performance
                (model_name, version, timestamp, metric_name, metric_value)
                VALUES (?, ?, ?, ?, ?)
            """, (name, version, now, metric_name, metric_value))

    def get_performance_history(self, name: str, version: str,
                                metric_name: str, hours: int = 24) -> List[Dict]:
        """Get performance history for a model"""
        since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("""
                SELECT timestamp, metric_value
                FROM model_performance
                WHERE model_name = ? AND version = ? AND metric_name = ?
                AND timestamp >= ? ORDER BY timestamp
            """, (name, version, metric_name, since)).fetchall()
        return [{"timestamp": r[0], "value": r[1]} for r in rows]

    def compare_models(self, name_a: str, version_a: str,
                      name_b: str, version_b: str) -> Dict[str, Any]:
        """Compare two model versions"""
        model_a = self.get_model(name_a, version_a)
        model_b = self.get_model(name_b, version_b)
        if not model_a or not model_b:
            return {"error": "One or both models not found"}

        metrics_a = model_a.get("metrics", {})
        metrics_b = model_b.get("metrics", {})
        all_metrics = set(metrics_a.keys()) | set(metrics_b.keys())
        differences = {}
        for metric in all_metrics:
            val_a, val_b = metrics_a.get(metric), metrics_b.get(metric)
            if val_a is not None and val_b is not None:
                diff = val_b - val_a
                pct_diff = (diff / val_a * 100) if val_a != 0 else 0
                differences[metric] = {"model_a": val_a, "model_b": val_b,
                                       "absolute_diff": diff, "percent_diff": pct_diff}

        return {
            "model_a": {"name": name_a, "version": version_a, "metrics": metrics_a},
            "model_b": {"name": name_b, "version": version_b, "metrics": metrics_b},
            "differences": differences
        }


_registry = None


def get_model_registry() -> ModelRegistry:
    """Get or create model registry"""
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
    return _registry
