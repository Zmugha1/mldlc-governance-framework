"""Module 6: Admin Streamliner - Follow-ups, templates, quick logging."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from datetime import datetime
from utils.database import get_all_clients
from utils.styles import CUSTOM_CSS
from utils.logger import log_activity
from components.sidebar import render_sidebar

st.set_page_config(page_title="Admin Streamliner", layout="wide")
render_sidebar()
log_activity("page_view", page="Admin")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("⚙️ Admin Streamliner")

# Overdue Follow-ups
st.markdown("### ⚠️ Overdue Follow-ups")
overdue = [c for c in get_all_clients() if c.get("next_followup") and c.get("next_followup", "") < "2026-03-10"]
if overdue:
    for c in overdue[:5]:
        st.error(f"**{c['name']}** — Due {c.get('next_followup')} — {c.get('next_steps', [''])[0]}")
else:
    st.success("No overdue follow-ups")

st.markdown("---")

# Email Templates
st.markdown("### ✉️ Email Templates")
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.button("📧 Follow-up", key="tpl_followup")
with col2:
    st.button("📧 Spouse Invite", key="tpl_spouse")
with col3:
    st.button("📧 Resources", key="tpl_resources")
with col4:
    st.button("📧 Congrats", key="tpl_congrats")

st.markdown("---")

# Resources
st.markdown("### 📚 Resources")
col1, col2, col3 = st.columns(3)
with col1:
    st.button("📄 U 2.0 Form", key="res_u2")
with col2:
    st.button("📄 2May Document", key="res_2may")
with col3:
    st.button("📄 Franchise Guide", key="res_guide")

st.markdown("---")

# Quick Log form
st.markdown("### 📝 Quick Log")
with st.form("quick_log"):
    clients = get_all_clients()
    client_sel = st.selectbox("Client", [c["name"] for c in clients])
    comp_sel = st.selectbox("Compartment", ["IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"])
    interest = st.slider("Interest", 1, 5, 3)
    follow_through = st.checkbox("Follow-through")
    spouse = st.checkbox("Spouse involved")
    red_flag = st.checkbox("Red flag noted")
    next_action = st.text_input("Next action")
    due_date = st.date_input("Due date")

    if st.form_submit_button("Log & Continue"):
        log_activity("quick_log", details={"client": client_sel, "compartment": comp_sel}, page="Admin")
        st.success("Logged!")

st.markdown("---")

# Recent Activity
st.markdown("### 📋 Recent Activity")
st.info("Andrea Bartlett — Call logged — Mar 10, 2026")
st.info("Mike Chen — Moved to C3 — Mar 10, 2026")
st.info("Lisa Wong — Email sent — Mar 9, 2026")
