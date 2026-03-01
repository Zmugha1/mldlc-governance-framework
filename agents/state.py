"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (State management)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class VTCO:
    """Vision, Thesis, Constraints, Outcomes."""

    vision: str = ""
    thesis: str = ""
    constraints: list[str] = field(default_factory=list)
    outcomes: dict[str, Any] = field(default_factory=dict)
    risk_level: str = "med"


@dataclass
class GovernanceState:
    """State machine state for MLDLC pipeline."""

    run_id: str = ""
    zone: str = "challenger"  # challenger | contender | champion
    current_gate: int = 0
    vtco: dict[str, Any] = field(default_factory=dict)
    dataset_manifest: dict[str, Any] = field(default_factory=dict)
    feature_manifest: dict[str, Any] = field(default_factory=dict)
    model_config: dict[str, Any] = field(default_factory=dict)
    validation_results: dict[str, Any] = field(default_factory=dict)
    deployment_config: dict[str, Any] = field(default_factory=dict)
    gate_results: list[tuple[int, str]] = field(default_factory=list)
    all_gates_passed: bool = False

    def to_gate_input(self) -> dict[str, Any]:
        """Convert to dict for gate validation."""
        return {
            "run_id": self.run_id,
            "vtco": self.vtco,
            "dataset_manifest": self.dataset_manifest,
            "feature_manifest": self.feature_manifest,
            "model_config": self.model_config,
            "validation_results": self.validation_results,
            "deployment_config": self.deployment_config,
        }
