"""Dashboard - Overview + KPIs."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from components.sidebar import render_sidebar
from utils.logger import log_activity

render_sidebar()
log_activity("page_view", page="Dashboard")

from datetime import datetime
from utils.database import get_all_clients
from utils.styles import CUSTOM_CSS
from components.client_card import render_client_card

# set_page_config already called in app.py - do not call again
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("Good morning, Sandy! ☕")
st.caption(datetime.now().strftime("%A, %B %d, %Y"))

clients = get_all_clients()

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Active Clients", str(len(clients)), "+2 this week")
with col2:
    c4_count = sum(1 for c in clients if c.get("compartment") == "C4")
    st.metric("C4 Count", str(c4_count), "Ready")
with col3:
    follow_ups = sum(1 for c in clients if c.get("next_action"))
    st.metric("Follow-ups Due", str(follow_ups), "📞")
with col4:
    st.metric("Pipeline Value", "$450K", "est. closes")

st.markdown("---")

col_left, col_right = st.columns([1, 1])

with col_left:
    st.markdown("### 📅 Today's Priority Clients")
    priority = [c for c in clients if c.get("next_action")][:3]
    for c in priority:
        render_client_card(c, page="Dashboard")

with col_right:
    st.markdown("### 📋 Recent Activity")
    st.info("Andrea Kelleher - Health check-in completed")
    st.success("John Martinez - Moved to C3")
    st.info("Lisa Wong - Intro call scheduled")
