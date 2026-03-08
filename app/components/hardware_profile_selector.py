"""Hardware Profile Selector for MLDLC."""
import streamlit as st
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

try:
    from src.llm.llm_router import HARDWARE_PROFILES
except ImportError:
    HARDWARE_PROFILES = {}


def render_hardware_profile_selector():
    """Render hardware profile selection UI."""
    st.subheader("Hardware Profile")
    if not HARDWARE_PROFILES:
        st.warning("LLM router not available. Install dependencies.")
        return
    with st.expander("View Deployment Profiles"):
        for key, profile in HARDWARE_PROFILES.items():
            st.markdown(f"**{profile['name']}**")
            st.write(f"- Hardware: {profile['hardware']}")
            st.write(f"- Concurrent Users: {profile['concurrent_users']}")
            st.write(f"- Max Customers: {profile['max_customers']}")
            st.write(f"- Storage/Year: {profile['storage_per_year']}")
            st.write(f"- Recommended Models: {', '.join(profile['recommended_models'])}")
            st.divider()
