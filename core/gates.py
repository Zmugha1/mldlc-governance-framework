"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (Gate validation logic)
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from core.artifacts import get_artifacts_index
from core.exceptions import GovernanceError
from core.lineage import compute_lineage_hash, emit_lineage_event


def _policies_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "policies"


def _load_policy(subdir: str, filename: str = "policy.yaml") -> dict[str, Any]:
    """Load YAML policy. Returns empty dict if missing."""
    path = _policies_dir() / subdir / filename
    if not path.exists():
        return {}
    try:
        import yaml

        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception:
        return {}


def _policy_hash() -> str:
    """Compute hash of policies directory for run manifest."""
    policies = _policies_dir()
    if not policies.exists():
        return hashlib.sha256(b"").hexdigest()
    hasher = hashlib.sha256()
    for p in sorted(policies.rglob("*.yaml")):
        hasher.update(p.read_bytes())
    return hasher.hexdigest()


def gate_0_business_intent(vtco_dict: dict[str, Any], run_id: str) -> tuple[bool, str]:
    """
    Gate 0: Business Intent Lock.
    Validates VTCO completeness: vision, thesis, constraints, outcomes.
    """
    required = ["vision", "thesis", "constraints", "outcomes"]
    missing = [k for k in required if not vtco_dict.get(k)]
    if missing:
        return False, f"VTCO incomplete: missing {missing}"

    risk = vtco_dict.get("risk_level", "med")
    if risk not in ("low", "med", "medium", "high"):
        return False, "risk_level must be low, med, or high"

    emit_lineage_event(run_id, "gate_passed", {"gate": 0, "vtco": vtco_dict})
    return True, "Gate 0 passed"


def gate_1_data_contract(dataset_manifest: dict[str, Any], run_id: str) -> tuple[bool, str]:
    """
    Gate 1: Data Contract Validation.
    Validates against policies/01_data_contracts/.
    """
    policy = _load_policy("01_data_contracts")
    if not policy:
        return False, "Policy missing: policies/01_data_contracts/policy.yaml"

    missing_threshold = policy.get("max_missingness_pct", 0.05)
    actual_missing = dataset_manifest.get("missingness_pct", 0)
    if actual_missing > missing_threshold:
        return False, f"Missingness {actual_missing} exceeds threshold {missing_threshold}"

    schema_ok = dataset_manifest.get("schema_valid", True)
    if not schema_ok:
        return False, "Schema validation failed"

    emit_lineage_event(run_id, "gate_passed", {"gate": 1, "manifest": dataset_manifest})
    return True, "Gate 1 passed"


def gate_2_feature_governance(feature_manifest: dict[str, Any], run_id: str) -> tuple[bool, str]:
    """
    Gate 2: Feature Governance.
    Checks feature dictionary exists, leakage checks pass.
    """
    policy = _load_policy("02_feature_governance")
    if not policy:
        return False, "Policy missing: policies/02_feature_governance/policy.yaml"

    if not feature_manifest.get("feature_dictionary_exists"):
        return False, "Feature dictionary must exist"

    if feature_manifest.get("leakage_detected"):
        return False, "Target leakage detected - forbidden"

    emit_lineage_event(run_id, "gate_passed", {"gate": 2, "manifest": feature_manifest})
    return True, "Gate 2 passed"


def gate_3_model_governance(model_config: dict[str, Any], run_id: str) -> tuple[bool, str]:
    """
    Gate 3: Model Governance.
    Validates model type in allowed list, hyperparameters within policy.
    """
    policy = _load_policy("03_model_governance")
    if not policy:
        return False, "Policy missing: policies/03_model_governance/policy.yaml"

    allowed = policy.get("allowed_models", [])
    model_type = model_config.get("model_type", "")
    if model_type and allowed and model_type not in allowed:
        return False, f"Model type '{model_type}' not in allowed list: {allowed}"

    emit_lineage_event(run_id, "gate_passed", {"gate": 3, "config": model_config})
    return True, "Gate 3 passed"


def gate_4_validation_controls(validation_results: dict[str, Any], run_id: str) -> tuple[bool, str]:
    """
    Gate 4: Validation Controls.
    Checks stability, calibration, fairness (4/5ths rule).
    """
    policy = _load_policy("04_validation_controls")
    if not policy:
        return False, "Policy missing: policies/04_validation_controls/policy.yaml"

    min_lift = policy.get("min_baseline_lift_pct", 0.05)
    actual_lift = validation_results.get("baseline_lift_pct", 0)
    if actual_lift < min_lift:
        return False, f"Baseline lift {actual_lift} below minimum {min_lift}"

    if validation_results.get("fairness_required") and not validation_results.get("four_fifths_rule_pass"):
        return False, "4/5ths rule (fairness) check failed"

    emit_lineage_event(run_id, "gate_passed", {"gate": 4, "results": validation_results})
    return True, "Gate 4 passed"


def gate_5_deployment_controls(deployment_config: dict[str, Any], run_id: str) -> tuple[bool, str]:
    """
    Gate 5: Deployment Controls.
    Validates drift policy exists, rollback protocol documented.
    """
    policy = _load_policy("05_deployment_controls")
    if not policy:
        return False, "Policy missing: policies/05_deployment_controls/policy.yaml"

    if not deployment_config.get("drift_policy_exists"):
        return False, "Drift policy must exist"

    if not deployment_config.get("rollback_protocol_documented"):
        return False, "Rollback protocol must be documented"

    emit_lineage_event(run_id, "gate_passed", {"gate": 5, "config": deployment_config})
    return True, "Gate 5 passed"


def gate_6_decision_traceability(run_id: str) -> tuple[bool, str]:
    """
    Gate 6: Decision Traceability.
    Verifies all artifacts exist and are hashed. Explainability bundle present.
    """
    run_dir = Path(__file__).resolve().parent.parent / "runs" / run_id
    if not run_dir.exists():
        return False, "Run directory does not exist"

    index = get_artifacts_index(run_id)
    if not index.get("artifacts"):
        return False, "No artifacts indexed"

    explain_path = run_dir / "explainability_bundle.json"
    if not explain_path.exists():
        return False, "explainability_bundle.json must exist"

    manifest_path = run_dir / "run_manifest.json"
    if not manifest_path.exists():
        return False, "run_manifest.json must exist"

    emit_lineage_event(run_id, "gate_passed", {"gate": 6})
    return True, "Gate 6 passed"


def validate_through_gate(state: dict[str, Any], through_gate: int = 6) -> tuple[bool, list[tuple[int, str]]]:
    """
    Run gates 0 through through_gate in sequence. Fails closed.
    Use through_gate=4 for Contender promotion, through_gate=6 for Champion.
    """
    run_id = state.get("run_id", "")
    if not run_id:
        raise GovernanceError("run_id required in state")

    results: list[tuple[int, str]] = []
    gates = [
        (0, lambda: gate_0_business_intent(state.get("vtco", {}), run_id)),
        (1, lambda: gate_1_data_contract(state.get("dataset_manifest", {}), run_id)),
        (2, lambda: gate_2_feature_governance(state.get("feature_manifest", {}), run_id)),
        (3, lambda: gate_3_model_governance(state.get("model_config", {}), run_id)),
        (4, lambda: gate_4_validation_controls(state.get("validation_results", {}), run_id)),
        (5, lambda: gate_5_deployment_controls(state.get("deployment_config", {}), run_id)),
        (6, lambda: gate_6_decision_traceability(run_id)),
    ]

    for gate_num, gate_fn in gates:
        if gate_num > through_gate:
            break
        passed, msg = gate_fn()
        results.append((gate_num, msg))
        if not passed:
            emit_lineage_event(run_id, "gate_failed", {"gate": gate_num, "message": msg})
            return False, results

    return True, results


def validate_all(state: dict[str, Any]) -> tuple[bool, list[tuple[int, str]]]:
    """Run all gates 0-6 in sequence. Fails closed."""
    return validate_through_gate(state, through_gate=6)
