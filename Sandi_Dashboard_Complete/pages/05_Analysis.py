"""Module 5: Post-Call Analysis - CLEAR method scoring."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from utils.database import get_all_clients
from utils.styles import CUSTOM_CSS
from utils.logger import log_activity
from components.sidebar import render_sidebar

st.set_page_config(page_title="Post-Call Analysis", layout="wide")
render_sidebar()
log_activity("page_view", page="Analysis")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("📊 Post-Call Analysis")

clients = get_all_clients()
selected = st.selectbox("Select Client", [c["name"] for c in clients])
client = next(c for c in clients if c["name"] == selected)

if client:
    # Overall Coaching Score
    st.markdown("### Overall Coaching Score")
    st.metric("Score", "7.5", "/ 10")

    # Strengths & Improvements
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### ✅ Strengths")
        st.success("Asked open-ended questions")
        st.success("Acknowledged client concerns")
        st.success("Used DISC-appropriate language")
    with col2:
        st.markdown("### 📈 Improvements")
        st.error("Could have asked more about timeline")
        st.error("Talk/Listen ratio was 55/45")

    # CLEAR Method Scores
    st.markdown("### CLEAR Method Scores")
    clear_scores = [
        ("Curiosity", 0.8),
        ("Locating", 0.7),
        ("Accountability", 0.8),
        ("Reflection", 0.6),
        ("Engagement", 0.9),
    ]
    for name, score in clear_scores:
        st.markdown(f"**{name}**")
        st.progress(score)

    # Next Call Actions
    st.markdown("### Next Call Actions")
    st.markdown("1. Follow up on U 2.0 completion")
    st.markdown("2. Schedule spouse meeting")
    st.markdown("3. Address health concerns before business")

    if st.button("💾 Save Analysis"):
        log_activity("analysis_saved", client_id=client.get("id"), page="Analysis")
        st.success("Analysis saved!")
