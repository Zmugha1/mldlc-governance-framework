"""Page 4: Artifact Registry - Track artifacts with SHA-256."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.utils.session_store import get_artifacts_for_run, verify_artifact_session

init_governance_session()

st.title("Artifact Registry")
st.markdown("All artifacts for current run with SHA-256 hashes.")

if not st.session_state.run_id:
    st.warning("Create a run first")
else:
    artifacts = get_artifacts_for_run(st.session_state.run_id)
    if not artifacts:
        st.info("No artifacts in this run yet")
    else:
        for a in artifacts:
            col1, col2, col3, col4, col5 = st.columns([2, 3, 2, 1, 1])
            with col1:
                st.write(a.get("filename", ""))
            with col2:
                st.code(a.get("hash", "")[:32] + "...", language=None)
            with col3:
                st.write(a.get("timestamp", ""))
            with col4:
                st.write(f"{a.get('size', 0)} B")
            with col5:
                if st.button("Verify", key=f"v_{a.get('filename')}"):
                    ok = verify_artifact_session(st.session_state.run_id, a.get("filename", ""))
                    st.success("OK") if ok else st.error("Mismatch")

    if "explainability_bundle" in str([a.get("filename") for a in artifacts]):
        st.download_button(
            "Download explainability_bundle.json",
            data="{}",
            file_name="explainability_bundle.json",
            mime="application/json",
        )
