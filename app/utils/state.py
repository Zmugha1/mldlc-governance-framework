"""Session state utilities for Streamlit app"""

import streamlit as st

def init_session_state():
    """Initialize session state keys"""
    if "vtco_loaded" not in st.session_state:
        st.session_state.vtco_loaded = False
