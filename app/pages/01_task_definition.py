"""Page 1: Job Task Analysis (JTA) - VTCO Definition."""

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.utils.session_store import write_artifact_session

init_governance_session()

st.title("Job Task Analysis (JTA) Definition")
st.subheader("Define VTCO before any ML operation")

st.info("""
**VTCO Framework (Job Task Analysis):**
- **V**erb: What action are you performing?
- **T**ask: What specific ML operation?
- **C**onstraint: What governance/technical limits apply?
- **O**utcome: What measurable deliverable must be produced?
""")

if "run_id" not in st.session_state or not st.session_state.run_id:
    st.error("Create a new run first on the Home page")
    st.stop()

col1, col2 = st.columns(2)

with col1:
    st.markdown("### Action Definition")

    verb = st.selectbox(
        "Verb (Action)",
        [
            "Define",
            "Ingest",
            "Engineer",
            "Train",
            "Evaluate",
            "Deploy",
            "Monitor",
            "Audit",
            "Experiment",
            "Validate",
        ],
        help="What is the human/agent doing?",
    )

    task = st.selectbox(
        "Task (ML Operation)",
        [
            "Binary Classification",
            "Multiclass Classification",
            "Regression",
            "Cohort Segmentation",
            "Anomaly Detection",
            "Feature Engineering",
            "Feature Selection",
            "Hyperparameter Tuning",
            "Model Validation",
            "Drift Detection",
            "Business Problem Scoping",
        ],
        help="What specific ML task is being executed?",
    )

    zone_mapping = {
        "Experiment": "CHALLENGER",
        "Define": "CHALLENGER",
        "Ingest": "CHALLENGER",
        "Engineer": "CHALLENGER",
        "Train": "CONTENDER",
        "Evaluate": "CONTENDER",
        "Validate": "CONTENDER",
        "Deploy": "CHAMPION",
        "Monitor": "CHAMPION",
        "Audit": "CHAMPION",
    }

    suggested_zone = zone_mapping.get(verb, "CHALLENGER")
    st.info(f"Suggested Zone: {suggested_zone}")

with col2:
    st.markdown("### Governance & Deliverables")

    constraints = st.multiselect(
        "Constraints (Governance Limits)",
        [
            "No PII in features",
            "Air-gapped environment",
            "Inference latency <50ms",
            "Model size <100MB",
            "4/5ths Rule compliance required",
            "95% Confidence interval required",
            "Missingness <5%",
            "CPU-only inference",
            "Audit trail mandatory",
            "Explainability (SHAP) required",
            "Monotonic constraints",
            "Schema registry compliance",
        ],
        help="What limitations must be respected?",
    )

    st.caption("Active Policies:")
    st.caption("- Data Contract Policy")
    st.caption("- Model Governance Policy")
    st.caption("- Fairness (4/5ths) Policy")

    outcome = st.text_input(
        "Outcome (Measurable Deliverable)",
        placeholder="e.g., Trained RandomForest with AUC ≥0.85, 4/5ths ratio >0.80",
        help="What specific artifact and metrics must be produced?",
    )

gate_mapping = {
    "Define": 0,
    "Ingest": 1,
    "Engineer": 2,
    "Train": 3,
    "Evaluate": 4,
    "Validate": 4,
    "Deploy": 5,
    "Monitor": 5,
    "Audit": 6,
}

target_gate = gate_mapping.get(verb, 0)

st.divider()

col3, col4, col5 = st.columns(3)

with col3:
    st.markdown(f"**Target Gate:** Gate {target_gate}")
    st.progress(target_gate / 6)

with col4:
    st.markdown("**Risk Level:**")
    if any(c in ["No PII in features", "Air-gapped environment"] for c in constraints):
        st.error("HIGH")
    elif any(c in ["4/5ths Rule compliance required", "Audit trail mandatory"] for c in constraints):
        st.warning("MEDIUM")
    else:
        st.success("LOW")

with col5:
    if outcome:
        if "≥" in outcome or ">" in outcome or "=" in outcome:
            st.success("Outcome: Quantifiable")
        else:
            st.warning("Outcome: Add measurable threshold")

if st.button("Lock VTCO Definition", type="primary"):
    if not outcome:
        st.error("Outcome is required")
    else:
        vtco_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "run_id": st.session_state.run_id,
            "verb": verb,
            "task": task,
            "constraints": constraints,
            "outcome": outcome,
            "target_gate": target_gate,
            "zone": suggested_zone,
            "policy_hash": hashlib.sha256(b"policies_v1").hexdigest()[:8],
        }

        st.session_state.vtco = vtco_record
        st.session_state.zone = suggested_zone

        if st.session_state.run_id:
            write_artifact_session(
                run_id=st.session_state.run_id,
                content=json.dumps(vtco_record, indent=2),
                filename="vtco.json",
                artifact_type="vtco",
                metadata={"verb": verb, "task": task, "zone": suggested_zone},
            )

        st.success(f"VTCO Locked: {verb} {task} -> {suggested_zone}")
        st.json(vtco_record)

        st.info("""
        **Next Steps:**
        1. Go to Zone Control to manage artifacts
        2. Navigate to Stage Gates to validate constraints
        3. Execute in The Lab if Challenger zone
        """)
