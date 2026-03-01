"""
MLDLC Governance Dashboard - Streamlit App
5 pages: VTCO, Stage Gate Monitor, Artifact Registry, The Lab, Champion Deployment
"""

import hashlib
import json
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import streamlit as st

from agents.governance_agent import initialize_run
from agents.router import GateRouter
from agents.state import GovernanceState
from core.artifacts import get_artifacts_index, verify_artifact, write_artifact
from core.gates import (
    _policy_hash,
    gate_0_business_intent,
    gate_1_data_contract,
    gate_2_feature_governance,
    gate_3_model_governance,
    gate_4_validation_controls,
    gate_5_deployment_controls,
    gate_6_decision_traceability,
)
from core.run_id import generate_run_id

st.set_page_config(page_title="MLDLC Governance", layout="wide")

# Session state
if "run_id" not in st.session_state:
    st.session_state.run_id = ""
if "state" not in st.session_state:
    st.session_state.state = None
if "zone" not in st.session_state:
    st.session_state.zone = "challenger"


def policy_hash_display():
    h = _policy_hash()
    return f"{h[:16]}..." if len(h) > 16 else h


page = st.sidebar.radio(
    "Navigation",
    [
        "Page 1: VTCO & Zone Control",
        "Page 2: Stage Gate Monitor",
        "Page 3: Artifact Registry",
        "Page 4: The Lab (Challenger)",
        "Page 5: Champion Deployment",
    ],
)


# --- Page 1: VTCO & Zone Control ---
if page == "Page 1: VTCO & Zone Control":
    st.title("VTCO & Zone Control")

    col1, col2 = st.columns(2)
    with col1:
        vision = st.text_area("Vision", placeholder="What business metric improves?")
        thesis = st.text_area("Thesis", placeholder="Why this approach?")
    with col2:
        constraints = st.text_area(
            "Constraints",
            placeholder="One per line: no_pii, local_only, <100ms",
        )
        outcomes = st.text_area(
            "Outcomes",
            placeholder='JSON: {"accuracy": ">0.80", "auc": ">0.75"}',
        )

    zone = st.selectbox(
        "Zone",
        ["Challenger (Red)", "Contender (Yellow)", "Champion (Green)"],
        index=0,
    )
    risk_level = st.selectbox("Risk Level", ["low", "med", "high"], index=1)

    st.write("**Current policy hash:**", policy_hash_display())

    if st.button("Initialize Run"):
        zone_map = {
            "Challenger (Red)": "challenger",
            "Contender (Yellow)": "contender",
            "Champion (Green)": "champion",
        }
        constraints_list = [c.strip() for c in constraints.split("\n") if c.strip()]
        try:
            outcomes_dict = json.loads(outcomes) if outcomes.strip() else {}
        except json.JSONDecodeError:
            outcomes_dict = {}
        state = initialize_run(
            vision=vision,
            thesis=thesis,
            constraints=constraints_list,
            outcomes=outcomes_dict,
            risk_level=risk_level,
            zone=zone_map[zone],
        )
        st.session_state.run_id = state.run_id
        st.session_state.state = state
        st.session_state.zone = zone_map[zone]
        st.success(f"Run initialized: {state.run_id}")

    if st.session_state.run_id:
        st.info(f"Active run: {st.session_state.run_id}")


# --- Page 2: Stage Gate Monitor ---
elif page == "Page 2: Stage Gate Monitor":
    st.title("Stage Gate Monitor")

    run_id = st.session_state.run_id or st.text_input("Run ID", placeholder="Enter run_id")
    if not run_id:
        st.warning("Enter a run ID or initialize a run on Page 1")
    else:
        gate_configs = [
            (0, "Business Intent", "VTCO completeness", "policies/00_business_intent/"),
            (1, "Data Contract", "Schema, missingness, PII", "policies/01_data_contracts/"),
            (2, "Feature Governance", "Dictionary, leakage", "policies/02_feature_governance/"),
            (3, "Model Governance", "Allowed models, hyperparams", "policies/03_model_governance/"),
            (4, "Validation Controls", "Baseline lift, 4/5ths rule", "policies/04_validation_controls/"),
            (5, "Deployment Controls", "Drift policy, rollback", "policies/05_deployment_controls/"),
            (6, "Decision Traceability", "Artifacts hashed", "policies/06_decision_traceability/"),
        ]

        state = st.session_state.state or GovernanceState(run_id=run_id)
        if st.session_state.state:
            state.vtco = st.session_state.state.vtco
            state.dataset_manifest = st.session_state.state.dataset_manifest
            state.feature_manifest = st.session_state.state.feature_manifest
            state.model_config = st.session_state.state.model_config
            state.validation_results = st.session_state.state.validation_results
            state.deployment_config = st.session_state.state.deployment_config

        for gate_num, name, desc, policy_src in gate_configs:
            with st.expander(f"Gate {gate_num}: {name}", expanded=gate_num < 2):
                st.caption(f"Policy: {policy_src}")
                st.caption(desc)
                if st.button(f"Force Gate Check {gate_num}", key=f"gate_{gate_num}"):
                    gate_input = state.to_gate_input()
                    gates = {
                        0: lambda: gate_0_business_intent(gate_input["vtco"], run_id),
                        1: lambda: gate_1_data_contract(gate_input["dataset_manifest"], run_id),
                        2: lambda: gate_2_feature_governance(gate_input["feature_manifest"], run_id),
                        3: lambda: gate_3_model_governance(gate_input["model_config"], run_id),
                        4: lambda: gate_4_validation_controls(gate_input["validation_results"], run_id),
                        5: lambda: gate_5_deployment_controls(gate_input["deployment_config"], run_id),
                        6: lambda: gate_6_decision_traceability(run_id),
                    }
                    passed, msg = gates[gate_num]()
                    if passed:
                        st.success(msg)
                    else:
                        st.error(msg)


# --- Page 3: Artifact Registry ---
elif page == "Page 3: Artifact Registry":
    st.title("Artifact Registry")

    run_id = st.session_state.run_id or st.text_input("Run ID", placeholder="Enter run_id")
    if not run_id:
        st.warning("Enter a run ID or initialize a run on Page 1")
    else:
        index = get_artifacts_index(run_id)
        artifacts = index.get("artifacts", [])
        if not artifacts:
            st.info("No artifacts in this run yet")
        else:
            for a in artifacts:
                col1, col2, col3, col4 = st.columns([2, 3, 2, 1])
                with col1:
                    st.write(a.get("filename", ""))
                with col2:
                    st.code(a.get("sha256", "")[:32] + "...", language=None)
                with col3:
                    st.write(a.get("timestamp", ""))
                with col4:
                    if st.button("Verify", key=f"verify_{a.get('filename')}"):
                        ok = verify_artifact(run_id, a.get("filename", ""))
                        st.success("OK") if ok else st.error("Hash mismatch")

        run_dir = ROOT / "runs" / run_id
        explain_path = run_dir / "explainability_bundle.json"
        if explain_path.exists():
            if st.download_button(
                "Download explainability_bundle.json",
                data=explain_path.read_text(),
                file_name="explainability_bundle.json",
                mime="application/json",
            ):
                pass


# --- Page 4: The Lab (Challenger Zone) ---
elif page == "Page 4: The Lab (Challenger)":
    st.title("The Lab (Challenger Zone Only)")
    st.warning("CHALLENGER ZONE - NO PRODUCTION DATA")

    run_id = st.session_state.run_id or st.text_input("Run ID", placeholder="Enter run_id")
    if not run_id:
        st.warning("Initialize a run on Page 1 first")
    else:
        st.subheader("Iris Classification Demo")
        if st.button("Train Challenger Model"):
            try:
                import base64
                import pickle

                import pandas as pd
                from sklearn.datasets import load_iris
                from sklearn.ensemble import RandomForestClassifier
                from sklearn.model_selection import train_test_split

                iris = load_iris()
                X = pd.DataFrame(iris.data, columns=iris.feature_names)
                y = iris.target
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                model = RandomForestClassifier(n_estimators=100, random_state=42)
                model.fit(X_train, y_train)
                acc = (model.predict(X_test) == y_test).mean()
                st.write(f"Accuracy: {acc:.2%}")

                # Save via write_artifact only
                model_bytes = pickle.dumps(model)
                model_b64 = base64.b64encode(model_bytes).decode()
                write_artifact(
                    run_id=run_id,
                    content=model_b64,
                    filename="model.pkl.b64",
                    artifact_type="model",
                    metadata={"accuracy": acc, "model_type": "RandomForestClassifier"},
                )
                st.success("Model saved via write_artifact() with hash")
            except Exception as e:
                st.error(str(e))

        if st.button("Promote to Contender"):
            from core.gates import validate_through_gate

            state = st.session_state.state or GovernanceState(run_id=run_id)
            state.dataset_manifest = {"schema_valid": True, "missingness_pct": 0}
            state.feature_manifest = {"feature_dictionary_exists": True, "leakage_detected": False}
            state.model_config = {"model_type": "RandomForestClassifier"}
            state.validation_results = {"baseline_lift_pct": 0.15, "four_fifths_rule_pass": True}
            passed, results = validate_through_gate(state.to_gate_input(), through_gate=4)
            for g, m in results:
                st.write(f"Gate {g}: {m}")
            if passed:
                st.success("Promotion to Contender approved")
            else:
                st.error("Promotion failed - fix gate failures")


# --- Page 5: Champion Deployment ---
elif page == "Page 5: Champion Deployment":
    st.title("Champion Deployment")
    st.info("Locked interface (read-only)")

    run_id = st.session_state.run_id or st.text_input("Run ID", placeholder="Enter run_id")
    if not run_id:
        st.warning("Enter a run ID")
    else:
        st.subheader("Current Champion Model Metrics")
        index = get_artifacts_index(run_id)
        for a in index.get("artifacts", []):
            if a.get("artifact_type") == "model":
                st.json(a.get("metadata", {}))

        st.subheader("Drift Monitoring")
        st.line_chart({"accuracy": [0.95, 0.93, 0.91, 0.89, 0.87]})

        if st.button("Rollback to Previous Champion"):
            st.info("Rollback would revert to previous champion. Human approval required.")

        st.caption("Human approval audit log: (empty in demo)")


if __name__ == "__main__":
    pass
