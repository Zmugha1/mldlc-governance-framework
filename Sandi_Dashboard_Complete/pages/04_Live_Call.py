"""Module 4: Live Coaching Assistant - Real-time call guidance."""
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

st.set_page_config(page_title="Live Coaching Assistant", layout="wide")
render_sidebar()
log_activity("page_view", page="Live Call")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("🎙️ Live Coaching Assistant")

clients = get_all_clients()
selected = st.selectbox("Select Client", [c["name"] for c in clients])
client = next(c for c in clients if c["name"] == selected)

if client:
    # Live call timer
    st.markdown("### ⏱️ Call Timer")
    st.markdown('<div style="background: #E74C3C; color: white; padding: 20px; border-radius: 12px; font-size: 24px; text-align: center;">00:00:00 — Live</div>', unsafe_allow_html=True)
    st.warning("Talk/Listen ratio: 60/40 — Aim for 40/60")

    # Topics Discussed
    st.markdown("### Topics Discussed")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.checkbox("U 2.0 follow-up", key="t1")
        st.checkbox("I.L.W.E. goals", key="t2")
    with col2:
        st.checkbox("Franchise options", key="t3")
        st.checkbox("Spouse/family", key="t4")
    with col3:
        st.checkbox("Funding", key="t5")
        st.checkbox("Other", key="t6")

    # Suggested Questions (DISC-based)
    st.markdown("### Suggested Questions")
    if client.get("disc_style") == "I":
        st.markdown("- How do you feel about what we discussed?")
        st.markdown("- What excites you most?")
        st.markdown("- Who else is involved in this decision?")
    elif client.get("disc_style") == "D":
        st.markdown("- What results are you looking for?")
        st.markdown("- What's your timeline?")
        st.markdown("- What challenges excite you?")
    elif client.get("disc_style") == "S":
        st.markdown("- What concerns you about this change?")
        st.markdown("- How will this affect your family?")
        st.markdown("- What support do you need?")
    else:
        st.markdown("- What data do you need to make this decision?")
        st.markdown("- What are your concerns?")
        st.markdown("- What research have you done?")

    # Coaching Tips (4 cards)
    st.markdown("### Coaching Tips")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.info("**Curiosity**\nAsk open-ended questions")
    with col2:
        st.info("**Locating**\nUnderstand where they are")
    with col3:
        st.info("**Accountability**\nHold to commitments")
    with col4:
        st.info("**Engagement**\nKeep them involved")

    # Action buttons
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.button("📝 Log Notes", key="log_notes")
    with col2:
        st.button("📞 End Call", key="end_call")
    with col3:
        st.button("⭐ Rate Call", key="rate_call")
    with col4:
        st.button("➡️ Move Stage", key="move_stage")
