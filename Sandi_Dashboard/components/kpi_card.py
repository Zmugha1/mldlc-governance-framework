"""Metric/KPI cards for dashboard."""
import streamlit as st
from utils.styles import CUSTOM_CSS


def render_kpi(label: str, value: str, delta: str = None):
    """Render a KPI metric card."""
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)
    st.metric(label=label, value=value, delta=delta)
