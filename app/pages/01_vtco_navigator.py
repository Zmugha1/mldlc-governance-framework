"""Page 1: VTCO Navigator - Vision, Thesis, Constraints, Outcomes."""

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.utils.session_store import write_artifact_session

init_governance_session()

st.title("VTCO Navigator")
st.markdown("Define Vision, Thesis, Constraints, and Outcomes before proceeding.")

col1, col2 = st.columns(2)
with col1:
    vision = st.text_area("Vision", value=st.session_state.vtco.get("vision", ""),
        placeholder="What business metric improves?")
    thesis = st.text_area("Thesis", value=st.session_state.vtco.get("thesis", ""),
        placeholder="Why this approach?")
with col2:
    constraints_raw = st.text_area("Constraints",
        value="\n".join(st.session_state.vtco.get("constraints", [])),
        placeholder="One per line: no_pii, local_only, <100ms")
    outcomes_raw = st.text_area("Outcomes",
        value=json.dumps(st.session_state.vtco.get("outcomes", {}), indent=2),
        placeholder='{"accuracy": ">0.80", "auc": ">0.75"}')

risk_level = st.selectbox("Risk Level", ["low", "med", "high"],
    index=["low", "med", "high"].index(st.session_state.vtco.get("risk_level", "med")))

try:
    outcomes = json.loads(outcomes_raw) if outcomes_raw.strip() else {}
except json.JSONDecodeError:
    outcomes = {}
    st.warning("Outcomes must be valid JSON")

constraints = [c.strip() for c in constraints_raw.split("\n") if c.strip()]

policy_hash = hashlib.sha256(b"policies").hexdigest()[:16]
st.caption(f"Policy hash: {policy_hash}...")

if st.button("Save VTCO"):
    vtco = {
        "vision": vision,
        "thesis": thesis,
        "constraints": constraints,
        "outcomes": outcomes,
        "risk_level": risk_level,
    }
    st.session_state.vtco = vtco
    if st.session_state.run_id:
        write_artifact_session(
            run_id=st.session_state.run_id,
            content=json.dumps(vtco, indent=2),
            filename="vtco.json",
            artifact_type="vtco",
            metadata={"risk_level": risk_level},
        )
    st.success("VTCO saved to session and artifact registry")
