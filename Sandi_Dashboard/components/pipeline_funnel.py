"""HTML/CSS pipeline funnel for 8-stage pipeline (no Plotly)."""
import streamlit as st
from utils.styles import COMPARTMENTS


def render_pipeline_funnel(counts: dict = None):
    """Render 8-stage pipeline using HTML/CSS bar chart: IC, C1, C1.1, C2, C3, C4, C5, CLOSED."""
    stages = ["IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"]
    if counts:
        stage_counts = {s: counts.get(s, 0) for s in stages}
    else:
        stage_counts = {s: 0 for s in stages}
        stage_counts["IC"] = 2
        stage_counts["C1"] = 1

    max_count = max(stage_counts.values()) if stage_counts.values() else 1

    st.markdown("<div style='background-color: white; padding: 24px; border-radius: 12px;'>", unsafe_allow_html=True)

    for code in stages:
        count = stage_counts.get(code, 0)
        color = COMPARTMENTS.get(code, "#718096")
        width_pct = (count / max_count) * 100 if max_count > 0 else 0
        width_pct = max(width_pct, 5)

        st.markdown(f"""
        <div style="margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 600;">{code}</span>
                <span style="color: #6B7280;">{count} clients</span>
            </div>
            <div style="background-color: #E5E7EB; height: 28px; border-radius: 8px; overflow: hidden;">
                <div style="background-color: {color}; width: {width_pct}%; height: 100%;
                            border-radius: 8px; display: flex; align-items: center; padding-left: 12px;">
                    <span style="color: white; font-weight: 600;">{count}</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)
