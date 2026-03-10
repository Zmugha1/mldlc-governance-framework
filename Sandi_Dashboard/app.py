"""
Sandi's Coaching Intelligence Dashboard
Main entry - redirects to Dashboard.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

st.set_page_config(
    page_title="Sandi's Coaching Dashboard",
    page_icon="☕",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Redirect to Dashboard on load
st.switch_page("pages/01_Dashboard.py")
