"""Pipeline - Visual funnel."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import plotly.graph_objects as go
from app.components.sidebar import render_sidebar

st.set_page_config(page_title="Pipeline", layout="wide")
render_sidebar()

st.title("Pipeline Visualizer")

stages = ["IC", "C1", "C2", "C3", "C4", "C5"]
counts = [12, 8, 4, 3, 2, 5]

fig = go.Figure(
    go.Funnel(
        y=stages,
        x=counts,
        textinfo="value+percent initial",
        marker={"color": ["#3498db", "#9b59b6", "#2ecc71", "#f39c12", "#e67e22", "#e74c3c"]},
    )
)
fig.update_layout(title="Client Pipeline", funnelmode="stack")
st.plotly_chart(fig, use_container_width=True)
