# ZONE: CHALLENGER
# STAGE_GATES: 2 (Feature Governance)
# ARTIFACT_ENFORCEMENT: All outputs via write_artifact()

"""Step 01: Build Features - Gate 2 Feature Governance."""

from core.artifacts import write_artifact
from core.gates import gate_2_feature_governance


def run(run_id: str, feature_manifest: dict) -> tuple[bool, str]:
    """Validate feature governance. Returns (passed, message)."""
    return gate_2_feature_governance(feature_manifest, run_id)
