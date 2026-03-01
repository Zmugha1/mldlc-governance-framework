# ZONE: CONTENDER
# STAGE_GATES: 3 (Model Governance)
# ARTIFACT_ENFORCEMENT: Model artifacts via write_artifact() only

"""Step 02: Train Model - Gate 3 Model Governance."""

from core.artifacts import write_artifact
from core.gates import gate_3_model_governance


def run(run_id: str, model_config: dict) -> tuple[bool, str]:
    """Validate model governance. Returns (passed, message)."""
    return gate_3_model_governance(model_config, run_id)
