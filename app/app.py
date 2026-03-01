"""
MLDLC Governance Framework - Mission Control Dashboard
Main entry point for Streamlit Cloud deployment.
"""

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.components.zone_badge import zone_badge

st.set_page_config(
    page_title="MLDLC Governance Framework",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_governance_session()

st.title("MLDLC Governance Framework")
st.subheader("Machine Learning Development Lifecycle Governance Operating System")

st.sidebar.header("Run Control")

if st.session_state.run_id:
    st.sidebar.success(f"Current Run: {st.session_state.run_id}")
else:
    st.sidebar.warning("No active run")

col1, col2 = st.sidebar.columns(2)
with col1:
    if st.button("New Run"):
        import time
        st.session_state.run_id = hashlib.sha256(
            str(time.time()).encode()
        ).hexdigest()[:12]
        st.session_state.artifacts = {}
        st.session_state.artifacts_index = {}
        st.session_state.lineage = []
        st.session_state.gates_status = {f"Gate {i}": "Pending" for i in range(7)}
        st.rerun()

with col2:
    if st.button("Clear Run"):
        st.session_state.run_id = None
        st.session_state.artifacts = {}
        st.session_state.artifacts_index = {}
        st.session_state.lineage = []
        st.rerun()

st.sidebar.divider()
st.sidebar.markdown("### Zone Status")
st.sidebar.markdown(f"**Current:** {st.session_state.zone}")
zone_badge(st.session_state.zone)

st.sidebar.divider()
st.sidebar.markdown("### Navigation")
st.sidebar.markdown("""
- **Task Definition (JTA)** - Define Verb, Task, Constraint, Outcome
- **Zone Control** - Challenger / Contender / Champion
- **Stage Gates** - Enforce the 7 governance gates
- **Artifact Registry** - Track outputs with SHA-256 hashes
- **Explainability** - Executive summary bundles
- **The Lab** - Challenger zone playground
""")

st.markdown("""
### Welcome to the MLDLC Governance Dashboard

This application demonstrates the Machine Learning Development Lifecycle Governance Framework:

1. **Task Definition (JTA)**: Define Verb, Task, Constraint, and Outcome
2. **Zone Control**: Manage Challenger / Contender / Champion zones
3. **Stage Gates**: Enforce the 7 governance gates
4. **Artifact Registry**: Track all outputs with SHA-256 hashes
5. **Explainability**: Generate executive summary bundles
6. **The Lab**: Experimental sandbox (Challenger zone only)

**Current Status:**
""")

if st.session_state.run_id:
    artifact_count = len(
        [k for k in st.session_state.get("artifacts_index", {}) if k.startswith(f"{st.session_state.run_id}:")]
    )
    st.success(f"Active Run: {st.session_state.run_id}")
    st.info(f"Zone: {st.session_state.zone} | Artifacts: {artifact_count}")
else:
    st.error("No active run. Create a new run to begin.")
