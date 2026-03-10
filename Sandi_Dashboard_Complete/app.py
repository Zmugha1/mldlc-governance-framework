"""
Sandy's Complete 6-Module Coaching Dashboard
Main entry - redirects to Executive Dashboard.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

st.set_page_config(
    page_title="Sandy's Coaching Dashboard",
    page_icon="☕",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.switch_page("pages/01_Dashboard.py")
