"""VTCO Process Map Page - Interactive exploration of all 36 MLDLC steps"""

import streamlit as st
import json
import pandas as pd
from pathlib import Path

st.set_page_config(page_title="VTCO Process Map", page_icon="📋", layout="wide")

st.title("📋 VTCO Process Map")
st.markdown("Complete Verb-Task-Constraint-Outcome mapping for all MLDLC steps")

@st.cache_data
def load_process_map():
    process_path = Path(__file__).parent.parent.parent / "process" / "vtco_process_map.json"
    with open(process_path, 'r') as f:
        return json.load(f)

def get_risk_color(risk_level: str) -> str:
    return {"RED": "🔴", "YELLOW": "🟡", "GREEN": "🟢"}.get(risk_level, "⚪")

def get_risk_badge_html(risk_level: str) -> str:
    colors = {"RED": "#8B2635", "YELLOW": "#B8860B", "GREEN": "#2E7D4A"}
    return f'<span style="background-color: {colors.get(risk_level, "#666")}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">{risk_level}</span>'

process_data = load_process_map()

st.sidebar.header("🔍 Filters")
selected_phases = st.sidebar.multiselect("Select Phases", options=[p["name"] for p in process_data["phases"]], default=[p["name"] for p in process_data["phases"]])
selected_risks = st.sidebar.multiselect("Risk Level", options=["RED", "YELLOW", "GREEN"], default=["RED", "YELLOW", "GREEN"])
automation_filter = st.sidebar.selectbox("Automation Level", options=["All", "Human Only", "Human Augmented", "Fully Automated"], index=0)

all_steps = []
for phase in process_data["phases"]:
    for step in phase["steps"]:
        step = step.copy()
        step["phase_name"] = phase["name"]
        all_steps.append(step)

red_count = sum(1 for s in all_steps if s["risk_level"] == "RED")
yellow_count = sum(1 for s in all_steps if s["risk_level"] == "YELLOW")
green_count = sum(1 for s in all_steps if s["risk_level"] == "GREEN")

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Total Steps", len(all_steps))
with col2:
    st.metric("🔴 RED (Human Only)", red_count)
with col3:
    st.metric("🟡 YELLOW (Augmented)", yellow_count)
with col4:
    st.metric("🟢 GREEN (Automated)", green_count)

filtered_steps = []
for step in all_steps:
    if step["phase_name"] in selected_phases and step["risk_level"] in selected_risks:
        if automation_filter == "All":
            filtered_steps.append(step)
        elif automation_filter == "Human Only" and step["automation_level"] == "human_only":
            filtered_steps.append(step)
        elif automation_filter == "Human Augmented" and step["automation_level"] == "human_augmented":
            filtered_steps.append(step)
        elif automation_filter == "Fully Automated" and step["automation_level"] == "fully_automated":
            filtered_steps.append(step)

st.markdown("---")
st.subheader(f"Showing {len(filtered_steps)} Steps")

for step in filtered_steps:
    with st.expander(f"{get_risk_color(step['risk_level'])} **{step['step_id']}** | {step['verb']} | {step['task']}"):
        col1, col2 = st.columns([1, 2])
        with col1:
            st.markdown(f"**Phase:** {step['phase_name']}")
            st.markdown(f"**Risk Level:** {get_risk_badge_html(step['risk_level'])}", unsafe_allow_html=True)
            st.markdown(f"**Automation:** {step['automation_level'].replace('_', ' ').title()}")
            st.markdown(f"**Confidence:** {step['confidence']}")
            st.markdown(f"**Decision Risk:** {step['decision_risk']}")
        with col2:
            st.markdown("**📋 Constraints:**")
            for constraint in step["constraints"]:
                st.markdown(f"- {constraint}")
            st.markdown("**🎯 Outcome:**")
            st.markdown(step["outcome"]["description"])
            st.markdown("**✅ Validation Criteria:**")
            for criterion in step["outcome"]["validation_criteria"]:
                st.markdown(f"- {criterion}")
            st.markdown("**📎 Artifacts:**")
            st.code(f"Schema: {step['artifacts']['schema']}\nLog: {step['artifacts']['log']}\nHash: {step['artifacts']['hash_algorithm']}")
            st.markdown("**🔍 Triangulation Facts:**")
            for fact in step["triangulation_facts"]:
                st.markdown(f"- {fact}")

st.markdown("---")
if st.button("📥 Export Process Map to CSV"):
    df = pd.DataFrame([{"Step ID": s["step_id"], "Phase": s["phase_name"], "Verb": s["verb"], "Task": s["task"], "Risk Level": s["risk_level"], "Automation": s["automation_level"], "Confidence": s["confidence"], "Decision Risk": s["decision_risk"]} for s in all_steps])
    csv = df.to_csv(index=False)
    st.download_button(label="Download CSV", data=csv, file_name="mldlc_process_map.csv", mime="text/csv")
