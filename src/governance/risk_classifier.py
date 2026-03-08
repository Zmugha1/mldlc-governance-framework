"""Risk Classification - EU AI Act compliant"""
from typing import Dict, List, Any
from dataclasses import dataclass


@dataclass
class RiskAssessment:
    system_name: str
    risk_tier: str
    risk_score: float
    mitigation_required: List[str]
    human_oversight_required: bool


class RiskClassifier:
    HIGH_RISK_USE_CASES = ["healthcare", "finance", "law_enforcement", "education", "employment"]

    def assess(self, system_name: str, use_case: str, data_types: List[str],
               decision_autonomy: str) -> RiskAssessment:
        score = 0.0

        if any(uc in use_case.lower() for uc in self.HIGH_RISK_USE_CASES):
            score += 0.4

        sensitive = ["biometric", "health", "financial", "criminal"]
        if any(dt.lower() in sensitive for dt in data_types):
            score += 0.3

        if decision_autonomy == "full":
            score += 0.3

        tier = "high" if score >= 0.6 else "limited" if score >= 0.3 else "minimal"

        mitigations = []
        if tier == "high":
            mitigations = ["Human oversight required", "Risk management system", "Audit logging"]

        return RiskAssessment(
            system_name=system_name,
            risk_tier=tier,
            risk_score=score,
            mitigation_required=mitigations,
            human_oversight_required=(tier == "high")
        )


_classifier = None


def get_risk_classifier():
    global _classifier
    if _classifier is None:
        _classifier = RiskClassifier()
    return _classifier
