"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (Orchestration agent)
"""

from __future__ import annotations

from agents.router import GateRouter
from agents.state import GovernanceState
from core.artifacts import write_artifact
from core.gates import _policy_hash
from core.lineage import emit_lineage_event
from core.run_id import generate_run_id


def initialize_run(
    vision: str = "",
    thesis: str = "",
    constraints: list[str] | None = None,
    outcomes: dict | None = None,
    risk_level: str = "med",
    zone: str = "challenger",
) -> GovernanceState:
    """
    Initialize a new governance run.
    Creates run_id, run_manifest.json, and VTCO.
    """
    run_id = generate_run_id(prefix="run")
    constraints = constraints or []
    outcomes = outcomes or {}

    state = GovernanceState(
        run_id=run_id,
        zone=zone,
        vtco={
            "vision": vision,
            "thesis": thesis,
            "constraints": constraints,
            "outcomes": outcomes,
            "risk_level": risk_level,
        },
    )

    # Write VTCO
    import json

    vtco_content = json.dumps(
        {
            "vision": vision,
            "thesis": thesis,
            "constraints": constraints,
            "outcomes": outcomes,
            "risk_level": risk_level,
        },
        indent=2,
    )
    write_artifact(
        run_id=run_id,
        content=vtco_content,
        filename="vtco.json",
        artifact_type="vtco",
        metadata={"zone": zone},
    )

    # Write run manifest
    manifest = {
        "run_id": run_id,
        "zone": zone,
        "policy_hash": _policy_hash(),
        "vtco": state.vtco,
        "gates_passed": [],
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
    }
    write_artifact(
        run_id=run_id,
        content=json.dumps(manifest, indent=2),
        filename="run_manifest.json",
        artifact_type="manifest",
    )

    emit_lineage_event(run_id, "run_initialized", {"zone": zone})
    return state
