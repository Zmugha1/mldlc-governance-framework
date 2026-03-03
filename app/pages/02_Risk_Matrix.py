"""Risk Matrix Page - Interactive risk visualization"""

import streamlit as st
import plotly.graph_objects as go
import json
import pandas as pd
from pathlib import Path

st.set_page_config(page_title="Risk Matrix", page_icon="🎯", layout="wide")

st.title("🎯 Risk Matrix")
st.markdown("MLDLC Step Risk Classification and Decision Framework")

@st.cache_data
def load_process_map():
    process_path = Path(__file__).parent.parent.parent / "process" / "vtco_process_map.json"
    with open(process_path, 'r') as f:
        return json.load(f)

process_data = load_process_map()
all_steps = []
for phase in process_data["phases"]:
    for step in phase["steps"]:
        step = step.copy()
        step["phase_name"] = phase["name"]
        all_steps.append(step)

st.subheader("Risk Level Distribution")
risk_counts = {"RED": 0, "YELLOW": 0, "GREEN": 0}
for step in all_steps:
    risk_counts[step["risk_level"]] += 1

fig = go.Figure(data=[go.Pie(labels=list(risk_counts.keys()), values=list(risk_counts.values()), hole=0.4, marker_colors=["#8B2635", "#B8860B", "#2E7D4A"], textinfo="label+percent+value", textfont_size=14)])
fig.update_layout(title="Risk Distribution Across MLDLC Steps", annotations=[dict(text=f'Total<br>{len(all_steps)}', x=0.5, y=0.5, font_size=20, showarrow=False)], height=400)
st.plotly_chart(fig, use_container_width=True)

st.markdown("---")
st.subheader("Risk Level Definitions")
col1, col2, col3 = st.columns(3)
with col1:
    st.markdown("""
    <div style="background-color: #8B2635; color: white; padding: 20px; border-radius: 8px;">
        <h3 style="margin-top: 0;">🔴 RED</h3>
        <h4>Human-Only</h4>
        <p>High-stakes decisions requiring human judgment</p>
        <p><strong>Examples:</strong> Business problem definition, Ethical review, Final deployment approval</p>
    </div>
    """, unsafe_allow_html=True)
with col2:
    st.markdown("""
    <div style="background-color: #B8860B; color: white; padding: 20px; border-radius: 8px;">
        <h3 style="margin-top: 0;">🟡 YELLOW</h3>
        <h4>Human-AI Augmented</h4>
        <p>Human-AI collaboration with oversight</p>
        <p><strong>Examples:</strong> Feature engineering, Model selection, Hyperparameter tuning</p>
    </div>
    """, unsafe_allow_html=True)
with col3:
    st.markdown("""
    <div style="background-color: #2E7D4A; color: white; padding: 20px; border-radius: 8px;">
        <h3 style="margin-top: 0;">🟢 GREEN</h3>
        <h4>Fully Automated</h4>
        <p>Fully automated with monitoring</p>
        <p><strong>Examples:</strong> Data ingestion, ETL pipelines, Model retraining triggers</p>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")
st.subheader("Decision Support Matrix")
decision_data = {"Aspect": ["Approvers Required", "Documentation Level", "Audit Frequency", "Escalation Path", "Rollback Time"], "🔴 RED": ["Multiple + Executive", "Comprehensive", "Every decision", "Immediate to C-level", "< 1 hour"], "🟡 YELLOW": ["Team Lead + Reviewer", "Detailed", "Weekly summary", "Within 24 hours", "< 4 hours"], "🟢 GREEN": ["Automated + Alert", "Standard", "Monthly audit", "Auto-remediation", "Continuous"]}
st.dataframe(pd.DataFrame(decision_data), use_container_width=True, hide_index=True)

st.markdown("---")
st.subheader("Risk Distribution by Phase")
phase_risk = {}
for phase in process_data["phases"]:
    phase_risk[phase["name"]] = {"RED": 0, "YELLOW": 0, "GREEN": 0}
    for step in phase["steps"]:
        phase_risk[phase["name"]][step["risk_level"]] += 1

phases = list(phase_risk.keys())
fig2 = go.Figure()
fig2.add_trace(go.Bar(name='🔴 RED', x=phases, y=[phase_risk[p]["RED"] for p in phases], marker_color='#8B2635'))
fig2.add_trace(go.Bar(name='🟡 YELLOW', x=phases, y=[phase_risk[p]["YELLOW"] for p in phases], marker_color='#B8860B'))
fig2.add_trace(go.Bar(name='🟢 GREEN', x=phases, y=[phase_risk[p]["GREEN"] for p in phases], marker_color='#2E7D4A'))
fig2.update_layout(barmode='stack', title="Risk Distribution by MLDLC Phase", xaxis_title="Phase", yaxis_title="Number of Steps", height=400)
st.plotly_chart(fig2, use_container_width=True)
