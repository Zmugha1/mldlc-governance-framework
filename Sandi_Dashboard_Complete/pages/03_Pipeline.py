"""
Module 3: Pipeline Visualizer - FIXED (No Plotly)
"""
import sys
from pathlib import Path
from datetime import datetime

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from utils.styles import apply_custom_styles, COMPARTMENT_COLORS, get_compartment_name
from utils.database import get_pipeline_counts, get_clients_by_compartment, get_dashboard_stats
from utils.logger import log_activity
from components.sidebar import render_sidebar

render_sidebar()
try:
    log_activity("page_view", page="Pipeline")
except Exception:
    pass

apply_custom_styles()

st.markdown("<h1>📈 Your Coaching Pipeline</h1>", unsafe_allow_html=True)

# Get pipeline data
counts = get_pipeline_counts()

# Define stages with friendly names
stages = [
    ("IC", "Discovery", "First meeting"),
    ("C1", "Learning", "Education phase"),
    ("C1.1", "Exploring", "Narrowing options"),
    ("C2", "Researching", "Brand validation"),
    ("C3", "Deciding", "Serious consideration"),
    ("C4", "Committing", "Ready to sign"),
    ("C5", "Launching", "In training"),
]

# Create visual pipeline using HTML/CSS (no Plotly)
st.markdown("<div style='background-color: white; padding: 24px; border-radius: 12px;'>", unsafe_allow_html=True)

for code, name, desc in stages:
    count = counts.get(code, 0)
    color_info = COMPARTMENT_COLORS.get(code, {})
    color = color_info.get("bar", "#ccc") if isinstance(color_info, dict) else color_info
    max_count = max(counts.values()) if counts.values() else 1
    width_pct = (count / max_count) * 100 if max_count > 0 else 0
    width_pct = max(width_pct, 5)

    st.markdown(f"""
    <div style="margin: 12px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 600;">{name}</span>
            <span style="color: #6B7280;">{count} clients - {desc}</span>
        </div>
        <div style="background-color: #E5E7EB; height: 32px; border-radius: 8px; overflow: hidden;">
            <div style="background-color: {color}; width: {width_pct}%; height: 100%;
                        border-radius: 8px; display: flex; align-items: center; padding-left: 12px;">
                <span style="color: white; font-weight: 600;">{count}</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("</div>", unsafe_allow_html=True)

# Summary Stats
stats = get_dashboard_stats()

st.markdown("---")
st.markdown("### 📊 Pipeline Summary")

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Active Clients", stats["active_clients"])
with col2:
    st.metric("Inactive", stats.get("inactive_clients", 0))
with col3:
    st.metric("Closed YTD", stats.get("closed_ytd", 0))
with col4:
    st.metric("Pipeline Value", f"${stats['pipeline_value']/1000:.0f}K")

# Stage Breakdown
st.markdown("---")
st.markdown("### 🔍 Stage Breakdown")

stage_info = {
    "IC": {"desc": "First meeting with prospect. Building rapport and understanding goals.", "action": "Schedule discovery call"},
    "C1": {"desc": "Teaching about franchise opportunities and the coaching process.", "action": "Share educational materials"},
    "C1.1": {"desc": "Narrowing down options. Deeper dive into specific categories.", "action": "Schedule deep-dive session"},
    "C2": {"desc": "Researching specific franchise brands. Speaking with franchisors.", "action": "Connect with franchisors"},
    "C3": {"desc": "Serious consideration. Reviewing FDDs and financials.", "action": "Provide FDD support"},
    "C4": {"desc": "Ready to move forward. Finalizing franchise selection.", "action": "Support final decision"},
    "C5": {"desc": "Signed franchise agreement. Beginning training and setup.", "action": "Celebrate and support"},
}

stage_options = [f"{get_compartment_name(code)} ({code})" for code, _, _ in stages]
selected_stage = st.selectbox("Select stage to view clients", stage_options)

if selected_stage:
    code = selected_stage.split("(")[1].replace(")", "").strip()
    info = stage_info.get(code, {})
    color_info = COMPARTMENT_COLORS.get(code, {})
    color = color_info.get("bg", "#F8F9FA") if isinstance(color_info, dict) else "#F8F9FA"
    border = color_info.get("border", "#ccc") if isinstance(color_info, dict) else "#ccc"

    st.markdown(f"""
    <div style="background-color: {color}; border-left: 4px solid {border};
                padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div style="font-weight: 600; font-size: 1.1rem;">{get_compartment_name(code, full=True)}</div>
        <div style="margin-top: 8px; color: #4B5563;">{info.get('desc', '')}</div>
        <div style="margin-top: 12px; color: #6B7280; font-size: 0.9rem;">💡 {info.get('action', '')}</div>
    </div>
    """, unsafe_allow_html=True)

    clients = get_clients_by_compartment(code)

    if clients:
        st.markdown(f"**{len(clients)} client(s) in this stage:**")

        def days_since(d):
            s = d.get("last_contact") or ""
            if not s:
                return 0
            try:
                dt = datetime.strptime(s, "%Y-%m-%d")
                return (datetime.now() - dt).days
            except Exception:
                return 0

        for c in clients:
            stars = "⭐" * c.get("interest_level", 0) + "☆" * (5 - c.get("interest_level", 0))
            days = days_since(c)
            st.markdown(f"""
            <div style="background-color: white; padding: 12px 16px; border-radius: 8px;
                        margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">{c.get('name', '')}</div>
                    <div style="font-size: 0.8rem; color: #6B7280;">{stars} | {c.get('best_match', '')}</div>
                </div>
                <div style="font-size: 0.9rem; color: #6B7280;">{days} days ago</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("No clients in this stage currently.")
