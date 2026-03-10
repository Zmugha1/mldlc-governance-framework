"""Module 1: Executive Dashboard - Today's schedule, pipeline health, goals, hot prospects, alerts."""
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

st.set_page_config(page_title="Executive Dashboard", layout="wide")
render_sidebar()
log_activity("page_view", page="Dashboard")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("Good morning, Sandy! ☕")
st.caption(datetime.now().strftime("%A, %B %d, %Y"))

clients = get_all_clients()

# Today's Schedule
st.markdown("### 📅 Today's Schedule")
schedule = [
    {"time": "10:00 AM", "client": "Andrea Bartlett", "compartment": "C1", "topic": "U 2.0 follow-up"},
    {"time": "2:00 PM", "client": "Mike Chen", "compartment": "C3", "topic": "Franchisor intro"},
    {"time": "4:00 PM", "client": "Lisa Wong", "compartment": "C2", "topic": "Education session"},
]
for s in schedule:
    st.markdown(f"**{s['time']}** — {s['client']} ({s['compartment']}) — {s['topic']}")

st.markdown("---")

# Pipeline Health
st.markdown("### 📊 Pipeline Health")
col1, col2, col3, col4, col5, col6 = st.columns(6)
stages = ["IC", "C1", "C2", "C3", "C4", "C5"]
counts = {s: sum(1 for c in clients if c.get("compartment") == s) for s in stages}
for i, s in enumerate(stages):
    with [col1, col2, col3, col4, col5, col6][i]:
        st.metric(s, counts.get(s, 0))

st.markdown("---")

# This Week's Goals
st.markdown("### 🎯 This Week's Goals")
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Calls Completed", "8", "of 12")
    st.progress(8/12)
with col2:
    st.metric("Follow-ups Due", "5", "this week")
    st.progress(0.6)
with col3:
    st.metric("Pipeline Value", "$450K", "est. closes")

st.markdown("---")

# Hot Prospects
st.markdown("### 🔥 Hot Prospects")
hot = sorted(clients, key=lambda c: c.get("interest_level", 0), reverse=True)[:3]
for c in hot:
    st.markdown(f"**{c['name']}** — {c['compartment']} — {'⭐' * c.get('interest_level', 0)} — {c.get('best_match', '')}")

st.markdown("---")

# Alert Banner
overdue = [c for c in clients if c.get("next_followup") and "2026-03-08" in str(c.get("last_contact", ""))]
if overdue:
    st.warning("⚠️ 3 clients haven't been contacted in 7+ days")
else:
    st.info("📋 All clients contacted within 7 days")
