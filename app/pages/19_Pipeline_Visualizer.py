"""Pipeline Visualizer - Funnel chart of client stages."""
import streamlit as st
import plotly.graph_objects as go

st.set_page_config(page_title="Pipeline Visualizer", layout="wide")

st.title("Pipeline Visualizer")

stages = ["IC", "C1", "C2", "C3", "C4", "C5"]
counts = [12, 8, 4, 3, 2, 5]

fig = go.Figure(
    go.Funnel(
        y=stages,
        x=counts,
        textinfo="value+percent initial",
        marker={
            "color": ["#3498db", "#9b59b6", "#2ecc71", "#f39c12", "#e67e22", "#e74c3c"]
        },
    )
)

fig.update_layout(title="Client Pipeline", funnelmode="stack")
st.plotly_chart(fig, use_container_width=True)
