"""Module 3: Pipeline Visualizer - 8-stage horizontal bar chart."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import plotly.graph_objects as go
from utils.database import get_all_clients
from utils.styles import CUSTOM_CSS, COMPARTMENT_COLORS
from utils.logger import log_activity
from components.sidebar import render_sidebar

st.set_page_config(page_title="Pipeline Visualizer", layout="wide")
render_sidebar()
log_activity("page_view", page="Pipeline")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("📈 Pipeline Visualizer")

clients = get_all_clients()
stages = ["IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"]
counts = [sum(1 for c in clients if c.get("compartment") == s) for s in stages]
colors = [COMPARTMENT_COLORS.get(s, "#85929E") for s in stages]

fig = go.Figure(go.Bar(
    y=stages,
    x=counts,
    orientation="h",
    marker_color=colors,
))
fig.update_layout(
    title="Client Pipeline by Stage",
    xaxis_title="Count",
    yaxis_title="Stage",
    height=400,
    margin=dict(l=0, r=0, t=40, b=0),
)
st.plotly_chart(fig, use_container_width=True)

# Summary stats
col1, col2, col3 = st.columns(3)
with col1:
    active = sum(1 for c in clients if c.get("compartment") not in ["CLOSED", None])
    st.metric("Active", active, "")
with col2:
    inactive = sum(1 for c in clients if c.get("last_contact", "") < "2026-03-01")
    st.metric("Inactive (30d)", inactive, "")
with col3:
    closed = sum(1 for c in clients if c.get("compartment") == "CLOSED")
    st.metric("Closed YTD", closed, "")

st.markdown("### Stage Definitions")
st.markdown("- **IC** = Initial Contact | **C1** = Education | **C1.1** = Deep Education")
st.markdown("- **C2** = Validation | **C3** = Decision | **C4** = Commitment | **C5** = Launch | **CLOSED** = Done")
