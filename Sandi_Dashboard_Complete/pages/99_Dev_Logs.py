"""Hidden Developer Logs - Password: sandydev2026"""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from utils.logger import get_recent_activities, get_recent_errors, clear_logs
from components.sidebar import render_sidebar

DEV_PASSWORD = "sandydev2026"

st.set_page_config(page_title="Developer Logs", layout="wide")

if "dev_authenticated" not in st.session_state:
    st.session_state.dev_authenticated = False

if not st.session_state.dev_authenticated:
    st.title("🔒 Developer Logs")
    pwd = st.text_input("Enter password", type="password")
    if st.button("Unlock"):
        if pwd == DEV_PASSWORD:
            st.session_state.dev_authenticated = True
            st.rerun()
        else:
            st.error("Incorrect password")
    st.stop()

render_sidebar()
st.title("🔒 Developer Logs")

tab1, tab2, tab3 = st.tabs(["Activity", "Errors", "Debug"])

with tab1:
    st.subheader("Activity Log")
    if st.button("🗑️ Clear Activity", key="clear_act"):
        clear_logs("activity")
        st.success("Cleared")
        st.rerun()
    for row in get_recent_activities(50):
        st.markdown(f"**{row[0]}** | {row[1]} | {row[2]} | {row[4]}")

with tab2:
    st.subheader("Error Log")
    if st.button("🗑️ Clear Errors", key="clear_err"):
        clear_logs("error")
        st.success("Cleared")
        st.rerun()
    for row in get_recent_errors(50):
        with st.expander(f"{row[0]} | {row[1]} | {row[2]}"):
            st.code(row[4] or "")

with tab3:
    st.subheader("Debug")
    st.json(list(st.session_state.keys()))
    if st.button("🗑️ Clear All Logs"):
        clear_logs("all")
        st.success("All cleared")
        st.rerun()
