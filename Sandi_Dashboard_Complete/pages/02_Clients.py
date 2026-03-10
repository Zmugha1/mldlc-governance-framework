"""Module 2: Client Intelligence - Deep profiles with DISC, I.L.W.E., flags, next steps."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import plotly.graph_objects as go
from utils.database import get_all_clients
from utils.styles import CUSTOM_CSS, DISC_COLORS
from utils.logger import log_activity
from components.sidebar import render_sidebar

st.set_page_config(page_title="Client Intelligence", layout="wide")
render_sidebar()
log_activity("page_view", page="Clients")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("👥 Client Intelligence")

clients = get_all_clients()
names = [c["name"] for c in clients]
selected = st.selectbox("Select Client", names)
client = next(c for c in clients if c["name"] == selected)

if client:
    col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
    with col1:
        st.metric("Conversion", f"{client.get('conversion_probability', 0)}%", "")
    with col2:
        st.metric("Best Match", client.get("best_match", "-"), "")
    with col3:
        st.metric("Blocker", client.get("blocker", "-") or "None", "")
    with col4:
        st.metric("Compartment", client.get("compartment", "-"), "")

    # I.L.W.E. Goals (green gradient)
    st.markdown("### I.L.W.E. Goals")
    st.markdown(f"""
    <div class="ilwe-card">
        <strong>Income:</strong> {client.get('ilwe_income', '-')}<br>
        <strong>Lifestyle:</strong> {client.get('ilwe_lifestyle', '-')}<br>
        <strong>Wealth:</strong> {client.get('ilwe_wealth', '-')}<br>
        <strong>Equity:</strong> {client.get('ilwe_equity', '-')}
    </div>
    """, unsafe_allow_html=True)

    # DISC Profile
    st.markdown("### DISC Profile")
    fig = go.Figure(go.Bar(
        x=["D", "I", "S", "C"],
        y=[client.get("disc_drive", 0), client.get("disc_influence", 0), client.get("disc_steadiness", 0), client.get("disc_compliance", 0)],
        marker_color=[DISC_COLORS["D"], DISC_COLORS["I"], DISC_COLORS["S"], DISC_COLORS["C"]],
    ))
    fig.update_layout(xaxis_title="DISC", yaxis_title="Score", height=250, margin=dict(l=0, r=0, t=0, b=0))
    st.plotly_chart(fig, use_container_width=True)

    # Red/Green Flags
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### 🚩 Red Flags")
        for f in client.get("red_flags", []):
            st.error(f)
    with col2:
        st.markdown("### ✅ Green Flags")
        for f in client.get("green_flags", []):
            st.success(f)

    # Next Steps
    st.markdown("### Next Steps")
    for step in client.get("next_steps", []):
        st.markdown(f"- {step}")

    # Action buttons
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.button("📞 Log Call", key="log_call")
    with col2:
        st.button("✉️ Send Email", key="send_email")
    with col3:
        st.button("➡️ Move Stage", key="move_stage")
    with col4:
        st.button("📊 View Analysis", key="view_analysis")
