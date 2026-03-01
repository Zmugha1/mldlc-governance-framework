"""Page 2: Zone Control Center - Challenger, Contender, Champion."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.components.zone_badge import zone_badge

init_governance_session()

st.title("Zone Control Center")
st.markdown("Manage zone transitions with gate validation.")

if not st.session_state.run_id:
    st.warning("Create a run first (sidebar) to use Zone Control")
else:
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("### Challenger (Red)")
        st.markdown("Local dev, no production data")
        zone_badge("CHALLENGER")
        if st.button("Set Challenger", key="challenger"):
            st.session_state.zone = "CHALLENGER"
            st.rerun()

    with col2:
        st.markdown("### Contender (Yellow)")
        st.markdown("Staging, full test coverage")
        zone_badge("CONTENDER")
        if st.button("Set Contender", key="contender"):
            st.session_state.zone = "CONTENDER"
            st.rerun()

    with col3:
        st.markdown("### Champion (Green)")
        st.markdown("Production, immutable")
        zone_badge("CHAMPION")
        if st.button("Set Champion", key="champion"):
            st.session_state.zone = "CHAMPION"
            st.rerun()

    st.divider()
    st.subheader("Zone Transition Log")
    lineage = st.session_state.get("lineage", [])
    for e in reversed(lineage[-10:]):
        st.caption(f"{e.get('timestamp', '')} - {e.get('event', '')} - {e.get('artifact', '')}")
