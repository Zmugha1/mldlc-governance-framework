"""Tests for governance components."""
import pytest
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from src.governance.audit_logger import get_audit_logger
from src.governance.hitl_framework import get_hitl_framework, EscalationReason
from src.governance.risk_classifier import get_risk_classifier
from src.monitoring.cost_tracker import get_cost_tracker
from src.monitoring.drift_detector import get_drift_detector


class TestAuditLogger:
    def test_log_event(self):
        audit = get_audit_logger()
        event_hash = audit.log_event(
            event_type="test_event",
            user_id="test_user",
            session_id="test_session",
            input_data={"test": "input"},
            output_data={"test": "output"}
        )
        assert event_hash is not None
        assert len(event_hash) == 16

    def test_verify_integrity(self):
        audit = get_audit_logger()
        audit.log_event("event1", "user1", "session1", {"a": 1}, {"b": 2})
        result = audit.verify_integrity()
        assert result["integrity_intact"] is True


class TestCostTracker:
    def test_calculate_cost(self):
        tracker = get_cost_tracker()
        cost = tracker.calculate_cost("gpt-4o", 1000, 500)
        assert cost > 0
        assert tracker.calculate_cost("phi3:mini", 1000, 500) == 0

    def test_record_usage(self):
        tracker = get_cost_tracker()
        result = tracker.record_usage(
            model_id="gpt-4o", tokens_in=100, tokens_out=50,
            user_id="test_user", session_id="test_session"
        )
        assert "cost_usd" in result


class TestHITLFramework:
    def test_should_escalate_low_confidence(self):
        hitl = get_hitl_framework()
        should_escalate, _ = hitl.should_escalate(confidence_score=0.7, risk_score=0.3)
        assert should_escalate is True

    def test_should_not_escalate_high_confidence(self):
        hitl = get_hitl_framework()
        should_escalate, _ = hitl.should_escalate(confidence_score=0.9, risk_score=0.3)
        assert should_escalate is False

    def test_create_escalation(self):
        hitl = get_hitl_framework()
        escalation_id = hitl.create_escalation(
            session_id="test_session", user_id="test_user",
            ai_decision={"recommendation": "approve"},
            confidence_score=0.7, risk_score=0.6,
            reasons=[EscalationReason.LOW_CONFIDENCE]
        )
        assert escalation_id is not None
        assert len(escalation_id) == 8


class TestRiskClassifier:
    def test_high_risk_healthcare(self):
        classifier = get_risk_classifier()
        assessment = classifier.assess(
            system_name="medical-diagnosis",
            use_case="healthcare diagnosis support",
            data_types=["health_records", "patient_data"],
            decision_autonomy="full"
        )
        assert assessment.risk_tier == "high"
        assert assessment.human_oversight_required is True

    def test_minimal_risk_simple(self):
        classifier = get_risk_classifier()
        assessment = classifier.assess(
            system_name="spam-filter",
            use_case="email spam filtering",
            data_types=["email_content"],
            decision_autonomy="assisted"
        )
        assert assessment.risk_tier == "minimal"


class TestDriftDetector:
    def test_set_baseline(self):
        detector = get_drift_detector()
        detector.set_baseline("test_feature", [1.0, 2.0, 3.0, 4.0, 5.0])
        assert "test_feature" in detector._baselines

    def test_detect_drift_no_baseline(self):
        detector = get_drift_detector()
        result = detector.detect_drift("unknown_feature", [1.0, 2.0, 3.0])
        assert result["drift_detected"] is False
        assert "error" in result
