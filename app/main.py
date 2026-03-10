"""
SandyStahl Bot - Coaching Intelligence Dashboard
For Sandy the Coach - Client management, pipeline, coaching guidance
"""

import streamlit as st

st.set_page_config(
    page_title="SandyStahl Bot",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Sandy's navigation only - no MLDLC
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))
from app.components.sidebar import render_sidebar

render_sidebar()

# Home content
st.title("Welcome to SandyStahl Bot!")
st.markdown("Your AI-powered coaching companion.")
st.markdown("**What you can do:**")
st.markdown("- **Dashboard** - See your day at a glance")
st.markdown("- **Clients** - View all clients")
st.markdown("- **Client Profile** - Full client info with DISC, I.L.W.E., flags")
st.markdown("- **Pipeline** - Visual funnel of where clients are")
st.markdown("- **Coaching Helper** - Get AI-powered coaching guidance")
st.markdown("- **Log Call** - Quick call logging")
