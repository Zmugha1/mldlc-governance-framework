"""Initialize session state for governance dashboard."""


def init_governance_session():
    """Ensure all required session state keys exist."""
    import streamlit as st

    defaults = {
        "run_id": None,
        "zone": "CHALLENGER",
        "artifacts": {},
        "artifacts_index": {},
        "lineage": [],
        "gates_status": {f"Gate {i}": "Pending" for i in range(7)},
        "vtco": {},
        "policy_hash": None,
        "random_seed": 42,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val
