"""Page 3: Stage Gates Monitor - Gates 0-6."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.components.gate_timeline import gate_timeline

init_governance_session()

st.title("Stage Gates Monitor")
st.markdown("Vertical timeline of Gates 0-6. Run validation for each gate.")

GATE_CONFIG = [
    (0, "Business Intent", "VTCO completeness", "policies/00_business_intent/"),
    (1, "Data Contract", "Schema, missingness, PII", "policies/01_data_contracts/"),
    (2, "Feature Governance", "Dictionary, leakage", "policies/02_feature_governance/"),
    (3, "Model Governance", "Allowed models, hyperparams", "policies/03_model_governance/"),
    (4, "Validation Controls", "Baseline lift, 4/5ths rule", "policies/04_validation_controls/"),
    (5, "Deployment Controls", "Drift policy, rollback", "policies/05_deployment_controls/"),
    (6, "Decision Traceability", "Artifacts hashed", "policies/06_decision_traceability/"),
]

if not st.session_state.run_id:
    st.warning("Create a run first")
else:
    for gate_num, name, desc, policy_src in GATE_CONFIG:
        with st.expander(f"Gate {gate_num}: {name}", expanded=gate_num < 2):
            st.caption(f"Policy: {policy_src}")
            st.caption(desc)
            if st.button(f"Run Gate Check {gate_num}", key=f"gate_{gate_num}"):
                vtco = st.session_state.get("vtco", {})
                if gate_num == 0:
                    if vtco.get("verb") and vtco.get("task") and vtco.get("outcome"):
                        st.session_state.gates_status[f"Gate {gate_num}"] = "Pass"
                        st.success("Gate 0 passed: VTCO complete (Verb, Task, Outcome)")
                    else:
                        st.session_state.gates_status[f"Gate {gate_num}"] = "Fail"
                        st.error("Gate 0 failed: VTCO incomplete (verb, task, outcome required)")
                else:
                    st.session_state.gates_status[f"Gate {gate_num}"] = "Pass"
                    st.success(f"Gate {gate_num} passed (simulated)")
            status = st.session_state.gates_status.get(f"Gate {gate_num}", "Pending")
            st.write(f"Status: {status}")

    st.divider()
    st.subheader("Gate Timeline")
    gate_timeline(st.session_state.gates_status)
