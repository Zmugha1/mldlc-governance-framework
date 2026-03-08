"""
Data Versioning - Track dataset versions and lineage
Lightweight DVC alternative using SQLite
"""
import json
import sqlite3
import hashlib
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import os


class DataVersioning:
    """Data Version Control: versioning with content hashing, lineage, reproducible pipelines"""

    def __init__(self, db_path: str = "data/data_versioning.db", data_dir: str = "data/datasets"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    dataset_id TEXT PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL,
                    file_path TEXT NOT NULL, content_hash TEXT NOT NULL, size_bytes INTEGER,
                    row_count INTEGER, columns TEXT, created_at TEXT, created_by TEXT,
                    description TEXT, tags TEXT, parent_version INTEGER)
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS dataset_lineage (
                    dataset_id TEXT NOT NULL, source_dataset_id TEXT NOT NULL,
                    transformation TEXT, created_at TEXT,
                    PRIMARY KEY (dataset_id, source_dataset_id))
            """)

    def _compute_hash(self, file_path: str) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def register_dataset(self, name: str, file_path: str, description: str = "",
                         created_by: str = "unknown", tags: Optional[List[str]] = None,
                         parent_version: Optional[int] = None) -> Dict[str, Any]:
        content_hash = self._compute_hash(file_path)
        size_bytes = os.path.getsize(file_path)
        row_count, columns = None, None
        if file_path.endswith('.csv'):
            try:
                import pandas as pd
                df = pd.read_csv(file_path, nrows=0)
                columns = list(df.columns)
                row_count = len(pd.read_csv(file_path))
            except Exception:
                pass
        dataset_id = f"{name}_{datetime.utcnow().timestamp()}"
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT MAX(version) FROM datasets WHERE name = ?", (name,)).fetchone()
            version = (row[0] or 0) + 1
            conn.execute("""
                INSERT INTO datasets (dataset_id, name, version, file_path, content_hash, size_bytes,
                 row_count, columns, created_at, created_by, description, tags, parent_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (dataset_id, name, version, file_path, content_hash, size_bytes,
                  row_count, json.dumps(columns) if columns else None,
                  datetime.utcnow().isoformat(), created_by, description,
                  json.dumps(tags or []), parent_version))
            if parent_version:
                parent_row = conn.execute("SELECT dataset_id FROM datasets WHERE name = ? AND version = ?",
                                          (name, parent_version)).fetchone()
                if parent_row:
                    conn.execute("""
                        INSERT INTO dataset_lineage (dataset_id, source_dataset_id, transformation, created_at)
                        VALUES (?, ?, ?, ?)
                    """, (dataset_id, parent_row[0], "version_increment", datetime.utcnow().isoformat()))
        return {"dataset_id": dataset_id, "name": name, "version": version,
                "content_hash": content_hash, "size_bytes": size_bytes, "row_count": row_count}

    def get_dataset(self, name: str, version: Optional[int] = None) -> Optional[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            if version:
                row = conn.execute("SELECT * FROM datasets WHERE name = ? AND version = ?", (name, version)).fetchone()
            else:
                row = conn.execute("SELECT * FROM datasets WHERE name = ? ORDER BY version DESC LIMIT 1", (name,)).fetchone()
        if not row:
            return None
        return {"dataset_id": row[0], "name": row[1], "version": row[2], "file_path": row[3],
                "content_hash": row[4], "size_bytes": row[5], "row_count": row[6],
                "columns": json.loads(row[7]) if row[7] else None, "created_at": row[8],
                "description": row[10], "tags": json.loads(row[11]) if row[11] else []}

    def verify_integrity(self, name: str, version: Optional[int] = None) -> bool:
        dataset = self.get_dataset(name, version)
        return dataset and self._compute_hash(dataset["file_path"]) == dataset["content_hash"]

    def list_versions(self, name: str) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT version, content_hash, created_at, description FROM datasets WHERE name = ? ORDER BY version DESC",
                (name,)).fetchall()
        return [{"version": row[0], "content_hash": row[1], "created_at": row[2], "description": row[3]} for row in rows]

    def get_lineage(self, dataset_id: str) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT source_dataset_id, transformation, created_at FROM dataset_lineage WHERE dataset_id = ?",
                (dataset_id,)).fetchall()
        return [{"source_dataset_id": row[0], "transformation": row[1], "created_at": row[2]} for row in rows]


_dvc = None

def get_data_versioning() -> DataVersioning:
    global _dvc
    if _dvc is None:
        _dvc = DataVersioning()
    return _dvc
