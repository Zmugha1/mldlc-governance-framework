"""
Human-in-the-Loop (HITL) Framework
Implements human oversight for AI decisions with confidence-based escalation
"""
import json
import sqlite3
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass
from pathlib import Path
import uuid


class EscalationReason(Enum):
    """Reasons for escalating to human review"""
    LOW_CONFIDENCE = "low_confidence"
    HIGH_RISK = "high_risk"
    NOVEL_SCENARIO = "novel_scenario"
    FINANCIAL_IMPACT = "financial_impact"
    POLICY_VIOLATION = "policy_violation"
    EXPLICIT_REQUEST = "explicit_request"


class ReviewStatus(Enum):
    """Status of human review"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    OVERRIDDEN = "overridden"
    EXPIRED = "expired"


@dataclass
class EscalationEvent:
    """An event escalated for human review"""
    escalation_id: str
    timestamp: str
    session_id: str
    user_id: str
    ai_decision: Dict[str, Any]
    confidence_score: float
    risk_score: float
    reason: EscalationReason
    context: Dict[str, Any]
    status: ReviewStatus
    reviewer_id: Optional[str] = None
    review_timestamp: Optional[str] = None
    review_notes: Optional[str] = None
    override_decision: Optional[Dict] = None


class HITLFramework:
    """
    Human-in-the-Loop oversight system

    Features:
    - Confidence-based escalation (default: 85%)
    - Risk-based escalation
    - Synchronous and asynchronous review modes
    - Audit trail for all human decisions
    - Escalation rate tracking (target: 10-15%)
    """

    DEFAULT_CONFIDENCE_THRESHOLD = 0.85
    DEFAULT_RISK_THRESHOLD = 0.7

    def __init__(self, db_path: str = "data/hitl_reviews.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._review_callbacks: List[Callable] = []
        self._confidence_threshold = self.DEFAULT_CONFIDENCE_THRESHOLD
        self._risk_threshold = self.DEFAULT_RISK_THRESHOLD

    def _init_db(self):
        """Initialize HITL database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS escalations (
                    escalation_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    ai_decision TEXT NOT NULL,
                    confidence_score REAL NOT NULL,
                    risk_score REAL NOT NULL,
                    reason TEXT NOT NULL,
                    context TEXT,
                    status TEXT NOT NULL,
                    reviewer_id TEXT,
                    review_timestamp TEXT,
                    review_notes TEXT,
                    override_decision TEXT
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_esc_status ON escalations(status)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_esc_session ON escalations(session_id)
            """)

    def should_escalate(self, confidence_score: float, risk_score: float,
                       context: Optional[Dict] = None) -> tuple:
        """
        Determine if a decision should be escalated to human review

        Args:
            confidence_score: AI confidence (0.0-1.0)
            risk_score: Risk assessment (0.0-1.0)
            context: Additional context for decision

        Returns:
            (should_escalate, list_of_reasons)
        """
        reasons = []

        if confidence_score < self._confidence_threshold:
            reasons.append(EscalationReason.LOW_CONFIDENCE)

        if risk_score > self._risk_threshold:
            reasons.append(EscalationReason.HIGH_RISK)

        # Check for novel scenarios (out-of-distribution)
        if context and context.get("is_novel_scenario", False):
            reasons.append(EscalationReason.NOVEL_SCENARIO)

        # Check financial impact
        if context and context.get("financial_impact", 0) > 1000:
            reasons.append(EscalationReason.FINANCIAL_IMPACT)

        return len(reasons) > 0, reasons

    def create_escalation(self, session_id: str, user_id: str,
                         ai_decision: Dict[str, Any], confidence_score: float,
                         risk_score: float, reasons: List[EscalationReason],
                         context: Optional[Dict] = None) -> str:
        """
        Create a new escalation event

        Returns:
            escalation_id: Unique ID for tracking
        """
        escalation_id = str(uuid.uuid4())[:8]

        event = EscalationEvent(
            escalation_id=escalation_id,
            timestamp=datetime.utcnow().isoformat(),
            session_id=session_id,
            user_id=user_id,
            ai_decision=ai_decision,
            confidence_score=confidence_score,
            risk_score=risk_score,
            reason=reasons[0] if reasons else EscalationReason.EXPLICIT_REQUEST,
            context=context or {},
            status=ReviewStatus.PENDING
        )

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO escalations
                (escalation_id, timestamp, session_id, user_id, ai_decision,
                 confidence_score, risk_score, reason, context, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.escalation_id, event.timestamp, event.session_id,
                event.user_id, json.dumps(event.ai_decision),
                event.confidence_score, event.risk_score, event.reason.value,
                json.dumps(event.context), event.status.value
            ))

        # Notify reviewers
        self._notify_reviewers(event)

        return escalation_id

    def get_pending_reviews(self, limit: int = 50) -> List[Dict]:
        """Get list of pending reviews for human reviewers"""
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("""
                SELECT * FROM escalations
                WHERE status = ?
                ORDER BY risk_score DESC, timestamp ASC
                LIMIT ?
            """, (ReviewStatus.PENDING.value, limit)).fetchall()

        return [self._row_to_dict(row) for row in rows]

    def submit_review(self, escalation_id: str, reviewer_id: str,
                     decision: str, notes: Optional[str] = None,
                     override_decision: Optional[Dict] = None) -> Dict:
        """
        Submit human review decision

        Args:
            escalation_id: ID of the escalation
            reviewer_id: ID of the human reviewer
            decision: 'approved', 'rejected', or 'overridden'
            notes: Reviewer notes
            override_decision: New decision if overriding
        """
        status = ReviewStatus(decision)
        timestamp = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE escalations
                SET status = ?, reviewer_id = ?, review_timestamp = ?,
                    review_notes = ?, override_decision = ?
                WHERE escalation_id = ?
            """, (
                status.value, reviewer_id, timestamp, notes,
                json.dumps(override_decision) if override_decision else None,
                escalation_id
            ))

            # Fetch row for audit (inside conn block)
            row = conn.execute(
                "SELECT * FROM escalations WHERE escalation_id = ?",
                (escalation_id,)
            ).fetchone()

        # Log to audit trail
        if row:
            from .audit_logger import get_audit_logger
            audit = get_audit_logger()
            audit.log_human_override(
                user_id=reviewer_id,
                session_id=row[2],  # session_id
                original_decision=json.dumps(row[4]) if row[4] else "",
                override_decision=json.dumps(override_decision) if override_decision else decision,
                reason=notes or f"Review decision: {decision}"
            )

        return {"status": "success", "escalation_id": escalation_id}

    def get_escalation_rate(self, window_hours: int = 24) -> Dict:
        """
        Calculate escalation rate metrics

        Target: 10-15% for sustainable operations
        """
        since = (datetime.utcnow() - timedelta(hours=window_hours)).isoformat()

        with sqlite3.connect(self.db_path) as conn:
            total = conn.execute(
                "SELECT COUNT(*) FROM escalations WHERE timestamp >= ?",
                (since,)
            ).fetchone()[0]

            pending = conn.execute(
                "SELECT COUNT(*) FROM escalations WHERE timestamp >= ? AND status = ?",
                (since, ReviewStatus.PENDING.value)
            ).fetchone()[0]

            approved = conn.execute(
                "SELECT COUNT(*) FROM escalations WHERE timestamp >= ? AND status = ?",
                (since, ReviewStatus.APPROVED.value)
            ).fetchone()[0]

            rejected = conn.execute(
                "SELECT COUNT(*) FROM escalations WHERE timestamp >= ? AND status = ?",
                (since, ReviewStatus.REJECTED.value)
            ).fetchone()[0]

            overridden = conn.execute(
                "SELECT COUNT(*) FROM escalations WHERE timestamp >= ? AND status = ?",
                (since, ReviewStatus.OVERRIDDEN.value)
            ).fetchone()[0]

        reviewed = approved + rejected + overridden

        return {
            "total_escalations": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "overridden": overridden,
            "reviewed": reviewed,
            "escalation_rate": "N/A (need total decisions)",
            "approval_rate": approved / reviewed if reviewed > 0 else 0,
            "override_rate": overridden / reviewed if reviewed > 0 else 0,
            "target_range": "10-15%",
            "recommendation": self._get_recommendation(total, reviewed)
        }

    def _get_recommendation(self, total: int, reviewed: int) -> str:
        """Get recommendation based on metrics"""
        if total == 0:
            return "No escalations in window"

        pending_ratio = (total - reviewed) / total if total > 0 else 0

        if pending_ratio > 0.5:
            return "High backlog - consider adding reviewers or adjusting thresholds"
        elif pending_ratio > 0.2:
            return "Moderate backlog - monitor closely"
        else:
            return "Healthy review flow"

    def set_thresholds(self, confidence: Optional[float] = None,
                      risk: Optional[float] = None):
        """Adjust escalation thresholds"""
        if confidence is not None:
            self._confidence_threshold = confidence
        if risk is not None:
            self._risk_threshold = risk

    def register_review_callback(self, callback: Callable):
        """Register callback for new escalation notifications"""
        self._review_callbacks.append(callback)

    def _notify_reviewers(self, event: EscalationEvent):
        """Notify all registered reviewers"""
        for callback in self._review_callbacks:
            try:
                callback(event)
            except Exception as e:
                print(f"Review callback failed: {e}")

    def _row_to_dict(self, row) -> Dict:
        """Convert database row to dictionary"""
        return {
            "escalation_id": row[0],
            "timestamp": row[1],
            "session_id": row[2],
            "user_id": row[3],
            "ai_decision": json.loads(row[4]) if row[4] else {},
            "confidence_score": row[5],
            "risk_score": row[6],
            "reason": row[7],
            "context": json.loads(row[8]) if row[8] else {},
            "status": row[9],
            "reviewer_id": row[10],
            "review_timestamp": row[11],
            "review_notes": row[12],
            "override_decision": json.loads(row[13]) if row[13] else None
        }


# Singleton instance
_hitl_framework: Optional[HITLFramework] = None


def get_hitl_framework() -> HITLFramework:
    """Get or create singleton HITL framework"""
    global _hitl_framework
    if _hitl_framework is None:
        _hitl_framework = HITLFramework()
    return _hitl_framework
