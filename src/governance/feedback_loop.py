"""
Feedback Loop - Human corrections feed back to models
Continuous learning from human feedback
"""
import json
import sqlite3
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path


class FeedbackLoop:
    """
    Feedback Loop for continuous learning
    Features: capture corrections, track patterns, generate few-shot examples, trigger retraining
    """

    def __init__(self, db_path: str = "data/feedback.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    model_name TEXT,
                    model_version TEXT,
                    original_output TEXT,
                    corrected_output TEXT,
                    correction_type TEXT,
                    context TEXT,
                    user_id TEXT,
                    session_id TEXT,
                    approved INTEGER DEFAULT 0
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_feedback_model ON feedback(model_name, model_version)")

    def record_correction(self, original_output: str, corrected_output: str,
                         model_name: Optional[str] = None, model_version: Optional[str] = None,
                         correction_type: str = "minor", context: Optional[Dict] = None,
                         user_id: str = "unknown", session_id: str = "unknown") -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO feedback
                (timestamp, model_name, model_version, original_output, corrected_output,
                 correction_type, context, user_id, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (datetime.utcnow().isoformat(), model_name, model_version,
                  original_output, corrected_output, correction_type,
                  json.dumps(context or {}), user_id, session_id))
            return cursor.lastrowid

    def approve_correction(self, feedback_id: int):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE feedback SET approved = 1 WHERE id = ?", (feedback_id,))

    def get_corrections(self, model_name: Optional[str] = None,
                       approved_only: bool = True, limit: int = 100) -> List[Dict]:
        query, params = "SELECT * FROM feedback WHERE 1=1", []
        if model_name:
            query += " AND model_name = ?"
            params.append(model_name)
        if approved_only:
            query += " AND approved = 1"
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(query, params).fetchall()
        return [{"id": row[0], "timestamp": row[1], "model_name": row[2], "model_version": row[3],
                "original_output": row[4], "corrected_output": row[5], "correction_type": row[6],
                "context": json.loads(row[7]) if row[7] else {}, "user_id": row[8], "approved": row[10]}
                for row in rows]

    def generate_few_shot_examples(self, model_name: str, n: int = 5) -> List[Dict]:
        corrections = self.get_corrections(model_name, approved_only=True, limit=n * 2)
        good_examples = [c for c in corrections if c["correction_type"] in ["minor", "major"]][:n]
        return [{"input": c["context"].get("input", ""), "original": c["original_output"],
                 "corrected": c["corrected_output"]} for c in good_examples]

    def get_correction_stats(self, model_name: Optional[str] = None) -> Dict:
        with sqlite3.connect(self.db_path) as conn:
            if model_name:
                total = conn.execute("SELECT COUNT(*) FROM feedback WHERE model_name = ?", (model_name,)).fetchone()[0]
                by_type = conn.execute("SELECT correction_type, COUNT(*) FROM feedback WHERE model_name = ? GROUP BY correction_type",
                                       (model_name,)).fetchall()
            else:
                total = conn.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
                by_type = conn.execute("SELECT correction_type, COUNT(*) FROM feedback GROUP BY correction_type").fetchall()
        return {"total_corrections": total, "by_type": {row[0]: row[1] for row in by_type}}

    def should_retrain(self, model_name: str, threshold: int = 50) -> bool:
        return self.get_correction_stats(model_name)["total_corrections"] >= threshold


_feedback = None

def get_feedback_loop() -> FeedbackLoop:
    global _feedback
    if _feedback is None:
        _feedback = FeedbackLoop()
    return _feedback
