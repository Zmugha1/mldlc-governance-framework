"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: 6 (Explainability bundle generator)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from core.artifacts import write_artifact
from core.lineage import compute_lineage_hash


def generate_explainability_bundle(
    run_id: str,
    model_version: str = "0.1.0",
    top_global_drivers: list[str] | None = None,
    key_thresholds: dict[str, Any] | None = None,
    known_limitations: list[str] | None = None,
    stability_band: str = "medium",
    confidence_tier: str = "B",
    action_recommendations: list[str] | None = None,
) -> str:
    """
    Generate and write explainability_bundle.json.
    Thresholds must be sourced from policy files, not hardcoded.
    """
    top_global_drivers = top_global_drivers or []
    key_thresholds = key_thresholds or {"source": "policies/04_validation_controls/", "values": {}}
    known_limitations = known_limitations or []
    action_recommendations = action_recommendations or []

    audit_trail_hash = compute_lineage_hash(run_id)

    bundle = {
        "model_version": model_version,
        "top_global_drivers": top_global_drivers,
        "key_thresholds": key_thresholds,
        "known_limitations": known_limitations,
        "stability_band": stability_band,
        "confidence_tier": confidence_tier,
        "action_recommendations": action_recommendations,
        "audit_trail_hash": audit_trail_hash,
    }

    content = json.dumps(bundle, indent=2)
    return write_artifact(
        run_id=run_id,
        content=content,
        filename="explainability_bundle.json",
        artifact_type="explainability",
        metadata={"model_version": model_version},
    )
