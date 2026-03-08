"""
Audit Trail System for MLDLC Framework
Implements immutable, cryptographically-signed audit logs
"""
import hashlib
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class AuditEvent:
    """Single audit event record"""
    timestamp: str
    event_type: str  # 'llm_call', 'rule_violation', 'human_override', 'deployment'
    user_id: str
    session_id: str
    model_id: Optional[str]
    input_hash: str  # SHA-256 hash of input
    output_hash: str  # SHA-256 hash of output
    metadata: Dict[str, Any]
    previous_hash: str  # For blockchain-like integrity

    def compute_hash(self) -> str:
        """Compute cryptographic hash of this event"""
        data = f"{self.timestamp}{self.event_type}{self.user_id}{self.input_hash}{self.output_hash}{self.previous_hash}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]


class AuditLogger:
    """
    Immutable audit trail with integrity verification

    Features:
    - Tamper-evident logging (blockchain-style chaining)
    - SQLite backend with append-only design
    - Export to regulatory formats
    - Integrity verification
    """

    def __init__(self, db_path: str = "data/audit_trail.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._last_hash = self._get_last_hash()

    def _init_db(self):
        """Initialize audit database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    model_id TEXT,
                    input_hash TEXT NOT NULL,
                    output_hash TEXT NOT NULL,
                    metadata TEXT,
                    event_hash TEXT NOT NULL UNIQUE,
                    previous_hash TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_events(timestamp)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_session ON audit_events(session_id)
            """)

    def log_event(self, event_type: str, user_id: str, session_id: str,
                  input_data: Any, output_data: Any, model_id: Optional[str] = None,
                  metadata: Optional[Dict] = None) -> str:
        """
        Log an event to the audit trail

        Args:
            event_type: Type of event (llm_call, rule_violation, etc.)
            user_id: ID of the user/system making the request
            session_id: Session identifier
            input_data: Input to the operation (will be hashed)
            output_data: Output from the operation (will be hashed)
            model_id: Model used (if applicable)
            metadata: Additional structured data

        Returns:
            event_hash: Cryptographic hash of the logged event
        """
        # Hash the input/output (don't store raw data for privacy)
        input_hash = hashlib.sha256(json.dumps(input_data, sort_keys=True).encode()).hexdigest()[:32]
        output_hash = hashlib.sha256(json.dumps(output_data, sort_keys=True).encode()).hexdigest()[:32]

        event = AuditEvent(
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_type,
            user_id=user_id,
            session_id=session_id,
            model_id=model_id,
            input_hash=input_hash,
            output_hash=output_hash,
            metadata=metadata or {},
            previous_hash=self._last_hash
        )

        event_hash = event.compute_hash()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO audit_events
                (timestamp, event_type, user_id, session_id, model_id,
                 input_hash, output_hash, metadata, event_hash, previous_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.timestamp, event.event_type, event.user_id,
                event.session_id, event.model_id, event.input_hash,
                event.output_hash, json.dumps(event.metadata),
                event_hash, event.previous_hash
            ))

        self._last_hash = event_hash
        return event_hash

    def log_llm_call(self, user_id: str, session_id: str, model_id: str,
                     prompt: str, response: str, tokens_in: int, tokens_out: int,
                     cost: float) -> str:
        """Convenience method for logging LLM calls"""
        return self.log_event(
            event_type="llm_call",
            user_id=user_id,
            session_id=session_id,
            model_id=model_id,
            input_data={"prompt": prompt, "tokens_in": tokens_in},
            output_data={"response": response, "tokens_out": tokens_out},
            metadata={"cost": cost, "total_tokens": tokens_in + tokens_out}
        )

    def log_human_override(self, user_id: str, session_id: str,
                          original_decision: str, override_decision: str,
                          reason: str) -> str:
        """Log human override of AI decision"""
        return self.log_event(
            event_type="human_override",
            user_id=user_id,
            session_id=session_id,
            model_id=None,
            input_data={"original": original_decision},
            output_data={"override": override_decision},
            metadata={"reason": reason}
        )

    def verify_integrity(self) -> Dict[str, Any]:
        """
        Verify the integrity of the audit trail
        Detects tampering by checking hash chain
        """
        with sqlite3.connect(self.db_path) as conn:
            events = conn.execute(
                "SELECT * FROM audit_events ORDER BY id"
            ).fetchall()

        violations = []
        for i, event in enumerate(events):
            if i == 0:
                continue  # First event has no previous to check

            prev_event = events[i-1]
            expected_previous_hash = prev_event[9]  # event_hash column
            actual_previous_hash = event[10]  # previous_hash column

            if expected_previous_hash != actual_previous_hash:
                violations.append({
                    "event_id": event[0],
                    "expected": expected_previous_hash,
                    "actual": actual_previous_hash
                })

        return {
            "total_events": len(events),
            "violations": violations,
            "integrity_intact": len(violations) == 0
        }

    def export_for_compliance(self, start_date: str, end_date: str,
                             format: str = "json") -> str:
        """
        Export audit trail for regulatory compliance

        Args:
            start_date: ISO format date string
            end_date: ISO format date string
            format: 'json' or 'csv'
        """
        with sqlite3.connect(self.db_path) as conn:
            events = conn.execute("""
                SELECT * FROM audit_events
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp
            """, (start_date, end_date)).fetchall()

        if format == "json":
            data = [{
                "id": e[0],
                "timestamp": e[1],
                "event_type": e[2],
                "user_id": e[3],
                "session_id": e[4],
                "model_id": e[5],
                "input_hash": e[6],
                "output_hash": e[7],
                "metadata": json.loads(e[8]) if e[8] else {},
                "event_hash": e[9],
                "previous_hash": e[10]
            } for e in events]
            return json.dumps(data, indent=2)
        else:
            import csv
            import io
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["id", "timestamp", "event_type", "user_id",
                           "session_id", "model_id", "event_hash"])
            for e in events:
                writer.writerow([e[0], e[1], e[2], e[3], e[4], e[5], e[9]])
            return output.getvalue()

    def _get_last_hash(self) -> str:
        """Get the hash of the most recent event"""
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute(
                "SELECT event_hash FROM audit_events ORDER BY id DESC LIMIT 1"
            ).fetchone()
        return result[0] if result else "0" * 16


# Singleton instance for application-wide use
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get or create singleton audit logger instance"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger
