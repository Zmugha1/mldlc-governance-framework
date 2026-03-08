"""
Feature Store - Centralized feature management for ML pipelines
Online (real-time) and offline (batch) feature serving
"""
import json
import sqlite3
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np


@dataclass
class FeatureDefinition:
    """Definition of a feature"""
    name: str
    description: str
    feature_type: str  # 'numeric', 'categorical', 'embedding', 'datetime', 'boolean'
    entity_type: str   # 'customer', 'product', 'transaction', 'session', etc.
    transformation: Optional[str]
    dependencies: List[str]
    owner: str
    tags: List[str]
    version: int = 1


class FeatureStore:
    """
    Feature Store for ML pipelines

    Features:
    - Feature registration and versioning
    - Online (low-latency) serving for real-time inference
    - Offline (batch) serving for training
    - Feature lineage tracking
    - Point-in-time correctness (prevent data leakage)
    """

    def __init__(self, db_path: str = "data/feature_store.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._feature_cache: Dict[str, Any] = {}

    def _init_db(self):
        """Initialize feature store database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS feature_definitions (
                    name TEXT PRIMARY KEY,
                    version INTEGER DEFAULT 1,
                    description TEXT,
                    feature_type TEXT,
                    entity_type TEXT,
                    transformation TEXT,
                    dependencies TEXT,
                    owner TEXT,
                    tags TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS feature_values (
                    entity_id TEXT NOT NULL,
                    feature_name TEXT NOT NULL,
                    feature_value TEXT,
                    timestamp TEXT NOT NULL,
                    version INTEGER DEFAULT 1,
                    PRIMARY KEY (entity_id, feature_name)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS feature_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT NOT NULL,
                    feature_name TEXT NOT NULL,
                    feature_value TEXT,
                    timestamp TEXT NOT NULL,
                    version INTEGER DEFAULT 1
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS feature_lineage (
                    feature_name TEXT NOT NULL,
                    source_feature TEXT NOT NULL,
                    transformation TEXT,
                    created_at TEXT,
                    PRIMARY KEY (feature_name, source_feature)
                )
            """)

            conn.execute("CREATE INDEX IF NOT EXISTS idx_feat_hist_entity ON feature_history(entity_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_feat_hist_feature ON feature_history(feature_name)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_feat_hist_time ON feature_history(timestamp)")

    def register_feature(self, name: str, description: str,
                        feature_type: str, entity_type: str,
                        transformation: Optional[str] = None,
                        dependencies: Optional[List[str]] = None,
                        owner: str = "unknown",
                        tags: Optional[List[str]] = None) -> int:
        """Register a new feature or update existing. Returns version number."""
        now = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            existing = conn.execute(
                "SELECT version FROM feature_definitions WHERE name = ?",
                (name,)
            ).fetchone()

            if existing:
                version = existing[0] + 1
                conn.execute("""
                    UPDATE feature_definitions
                    SET version = ?, description = ?, feature_type = ?,
                        entity_type = ?, transformation = ?, dependencies = ?,
                        owner = ?, tags = ?, updated_at = ?
                    WHERE name = ?
                """, (version, description, feature_type, entity_type,
                      transformation, json.dumps(dependencies or []),
                      owner, json.dumps(tags or []), now, name))
            else:
                version = 1
                conn.execute("""
                    INSERT INTO feature_definitions
                    (name, version, description, feature_type, entity_type,
                     transformation, dependencies, owner, tags, created_at, updated_at)
                    VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (name, description, feature_type, entity_type,
                      transformation, json.dumps(dependencies or []),
                      owner, json.dumps(tags or []), now, now))

            for dep in (dependencies or []):
                conn.execute("""
                    INSERT OR REPLACE INTO feature_lineage
                    (feature_name, source_feature, transformation, created_at)
                    VALUES (?, ?, ?, ?)
                """, (name, dep, transformation, now))

        return version

    def ingest_feature(self, entity_id: str, feature_name: str,
                      value: Any, timestamp: Optional[str] = None):
        """Ingest a feature value"""
        if timestamp is None:
            timestamp = datetime.utcnow().isoformat()

        if isinstance(value, (np.integer, np.floating)):
            value = float(value)
        elif isinstance(value, np.ndarray):
            value = value.tolist()

        value_str = json.dumps(value)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO feature_values
                (entity_id, feature_name, feature_value, timestamp)
                VALUES (?, ?, ?, ?)
            """, (str(entity_id), feature_name, value_str, timestamp))

            conn.execute("""
                INSERT INTO feature_history
                (entity_id, feature_name, feature_value, timestamp)
                VALUES (?, ?, ?, ?)
            """, (str(entity_id), feature_name, value_str, timestamp))

    def ingest_features_batch(self, entity_ids: List[str], feature_name: str,
                             values: List[Any], timestamps: Optional[List[str]] = None):
        """Batch ingest feature values"""
        if timestamps is None:
            timestamps = [datetime.utcnow().isoformat()] * len(entity_ids)

        with sqlite3.connect(self.db_path) as conn:
            for entity_id, value, timestamp in zip(entity_ids, values, timestamps):
                value_str = json.dumps(value)
                conn.execute("""
                    INSERT OR REPLACE INTO feature_values
                    (entity_id, feature_name, feature_value, timestamp)
                    VALUES (?, ?, ?, ?)
                """, (str(entity_id), feature_name, value_str, timestamp))
                conn.execute("""
                    INSERT INTO feature_history
                    (entity_id, feature_name, feature_value, timestamp)
                    VALUES (?, ?, ?, ?)
                """, (str(entity_id), feature_name, value_str, timestamp))

    def get_online_features(self, entity_ids: Union[str, List[str]],
                           feature_names: List[str]) -> pd.DataFrame:
        """Get latest feature values (online serving)"""
        if isinstance(entity_ids, str):
            entity_ids = [entity_ids]

        placeholders = ','.join(['?' for _ in entity_ids])
        feature_placeholders = ','.join(['?' for _ in feature_names])

        with sqlite3.connect(self.db_path) as conn:
            query = f"""
                SELECT entity_id, feature_name, feature_value, timestamp
                FROM feature_values
                WHERE entity_id IN ({placeholders})
                AND feature_name IN ({feature_placeholders})
            """
            rows = conn.execute(query, entity_ids + feature_names).fetchall()

        data = {}
        for entity_id, feature_name, value, timestamp in rows:
            if entity_id not in data:
                data[entity_id] = {"entity_id": entity_id}
            data[entity_id][feature_name] = json.loads(value)

        df = pd.DataFrame(list(data.values()))
        if not df.empty:
            df.set_index('entity_id', inplace=True)

        return df

    def get_offline_features(self, entity_ids: List[str],
                            feature_names: List[str],
                            start_time: str, end_time: str) -> pd.DataFrame:
        """Get historical feature values (offline serving)"""
        placeholders = ','.join(['?' for _ in entity_ids])
        feature_placeholders = ','.join(['?' for _ in feature_names])

        with sqlite3.connect(self.db_path) as conn:
            query = f"""
                SELECT entity_id, feature_name, feature_value, timestamp
                FROM feature_history
                WHERE entity_id IN ({placeholders})
                AND feature_name IN ({feature_placeholders})
                AND timestamp BETWEEN ? AND ?
                ORDER BY timestamp
            """
            rows = conn.execute(query,
                              entity_ids + feature_names + [start_time, end_time]
                              ).fetchall()

        data = [{"entity_id": row[0], "feature_name": row[1], "value": json.loads(row[2]), "timestamp": row[3]}
                for row in rows]
        return pd.DataFrame(data)

    def get_features_at_time(self, entity_ids: List[str],
                            feature_names: List[str],
                            timestamp: str) -> pd.DataFrame:
        """Get feature values at a specific point in time (prevents data leakage)"""
        results = []

        with sqlite3.connect(self.db_path) as conn:
            for entity_id in entity_ids:
                row_data = {"entity_id": entity_id}
                for feature_name in feature_names:
                    row = conn.execute("""
                        SELECT feature_value, timestamp
                        FROM feature_history
                        WHERE entity_id = ? AND feature_name = ?
                        AND timestamp <= ?
                        ORDER BY timestamp DESC
                        LIMIT 1
                    """, (entity_id, feature_name, timestamp)).fetchone()
                    row_data[feature_name] = json.loads(row[0]) if row else None
                results.append(row_data)

        df = pd.DataFrame(results)
        if not df.empty:
            df.set_index('entity_id', inplace=True)
        return df

    def create_training_set(self, entity_ids: List[str],
                           feature_names: List[str],
                           labels: Dict[str, Any],
                           as_of_date: str) -> pd.DataFrame:
        """Create a training set with point-in-time correctness"""
        features_df = self.get_features_at_time(entity_ids, feature_names, as_of_date)
        features_df['label'] = features_df.index.map(labels)
        return features_df

    def list_features(self, entity_type: Optional[str] = None) -> List[Dict]:
        """List all registered features"""
        with sqlite3.connect(self.db_path) as conn:
            if entity_type:
                rows = conn.execute(
                    "SELECT * FROM feature_definitions WHERE entity_type = ?",
                    (entity_type,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM feature_definitions").fetchall()

        return [{
            "name": row[0], "version": row[1], "description": row[2],
            "feature_type": row[3], "entity_type": row[4], "transformation": row[5],
            "dependencies": json.loads(row[6]) if row[6] else [],
            "owner": row[7], "tags": json.loads(row[8]) if row[8] else []
        } for row in rows]

    def get_feature_lineage(self, feature_name: str) -> Dict[str, Any]:
        """Get lineage information for a feature"""
        with sqlite3.connect(self.db_path) as conn:
            def_row = conn.execute(
                "SELECT * FROM feature_definitions WHERE name = ?",
                (feature_name,)
            ).fetchone()
            lineage_rows = conn.execute(
                "SELECT * FROM feature_lineage WHERE feature_name = ?",
                (feature_name,)
            ).fetchall()

        if not def_row:
            return {"error": "Feature not found"}

        return {
            "feature": {"name": def_row[0], "version": def_row[1], "description": def_row[2], "feature_type": def_row[3]},
            "dependencies": [{"source": row[1], "transformation": row[2]} for row in lineage_rows]
        }

    def get_feature_stats(self, feature_name: str) -> Dict[str, Any]:
        """Get statistics for a feature"""
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT feature_value FROM feature_history WHERE feature_name = ?",
                (feature_name,)
            ).fetchall()

        if not rows:
            return {"error": "No data for feature"}

        values = [json.loads(r[0]) for r in rows]
        numeric_values = [v for v in values if isinstance(v, (int, float))]

        if numeric_values:
            return {
                "count": len(values),
                "numeric_count": len(numeric_values),
                "mean": float(np.mean(numeric_values)),
                "std": float(np.std(numeric_values)),
                "min": float(np.min(numeric_values)),
                "max": float(np.max(numeric_values)),
                "missing_rate": (len(values) - len(numeric_values)) / len(values)
            }
        return {
            "count": len(values),
            "unique_values": len(set(values)),
            "most_common": max(set(values), key=values.count) if values else None
        }


_feature_store = None


def get_feature_store() -> FeatureStore:
    """Get or create feature store"""
    global _feature_store
    if _feature_store is None:
        _feature_store = FeatureStore()
    return _feature_store
