# ZONE: CHAMPION
# STAGE_GATES: 6 (Decision Traceability)
# ARTIFACT_ENFORCEMENT: Immutable - explainability_bundle via write_artifact()

"""Step 05: Score and Trace - Gate 6 Decision Traceability."""

from core.artifacts import write_artifact
from core.explainability import generate_explainability_bundle
from core.gates import gate_6_decision_traceability


def run(run_id: str, **explainability_kwargs) -> tuple[bool, str]:
    """Generate explainability bundle and validate traceability. Returns (passed, message)."""
    generate_explainability_bundle(run_id, **explainability_kwargs)
    return gate_6_decision_traceability(run_id)
