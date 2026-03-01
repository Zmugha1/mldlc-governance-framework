# ZONE: CHALLENGER
# STAGE_GATES: 0-1 (Business Intent, Data Contract)
# ARTIFACT_ENFORCEMENT: All outputs via write_artifact()

"""Step 00: Validate Data - Gate 1 Data Contract validation."""

from core.artifacts import write_artifact
from core.gates import gate_1_data_contract


def run(run_id: str, dataset_manifest: dict) -> tuple[bool, str]:
    """Validate data contract. Returns (passed, message)."""
    return gate_1_data_contract(dataset_manifest, run_id)
