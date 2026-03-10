"""Plotly funnel chart for 8-stage pipeline."""
import streamlit as st
import plotly.graph_objects as go
from utils.styles import COMPARTMENTS


def render_pipeline_funnel(counts: dict = None):
    """Render 8-stage funnel: IC, C1, C1.1, C2, C3, C4, C5, CLOSED."""
    stages = ["IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"]
    if counts:
        x = [counts.get(s, 0) for s in stages]
    else:
        x = [2, 1, 1, 1, 1, 1, 0, 0]

    colors = [COMPARTMENTS.get(s, "#718096") for s in stages]

    fig = go.Figure(
        go.Funnel(
            y=stages,
            x=x,
            textinfo="value+percent initial",
            marker={"color": colors},
        )
    )
    fig.update_layout(
        title="Client Pipeline",
        funnelmode="stack",
        height=400,
        margin=dict(l=0, r=0, t=40, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)
