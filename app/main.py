"""
MLDLC Governance Framework - Streamlit Application
Main entry point for the interactive governance dashboard
"""

import streamlit as st
import json
from pathlib import Path

st.set_page_config(
    page_title="MLDLC Governance Framework",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main-header { font-size: 3rem; font-weight: bold; color: #1E3A5F; text-align: center; margin-bottom: 1rem; }
    .sub-header { font-size: 1.5rem; color: #4A90A4; text-align: center; margin-bottom: 2rem; }
    .risk-red { background-color: #8B2635; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
    .risk-yellow { background-color: #B8860B; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
    .risk-green { background-color: #2E7D4A; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

@st.cache_data
def load_vtco_process_map():
    process_path = Path(__file__).parent.parent / "process" / "vtco_process_map.json"
    with open(process_path, 'r') as f:
        return json.load(f)

def main():
    st.markdown('<div class="main-header">🛡️ MLDLC Governance Framework</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Machine Learning Development Lifecycle Governance</div>', unsafe_allow_html=True)
    st.markdown("""
    <div style="text-align: center; color: #7a7a8a; margin-bottom: 2rem;">
        Transparent | Explainable | Auditable | Traceable
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("📊 Framework Overview")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Steps", "36", help="Complete VTCO-mapped MLDLC steps")
    with col2:
        st.metric("Phases", "6", help="Problem Definition through Governance")
    with col3:
        st.metric("Schemas", "30+", help="JSON schemas for artifact validation")
    with col4:
        st.metric("Risk Levels", "3", help="RED/YELLOW/GREEN classification")

    st.markdown("---")
    st.subheader("🚀 Quick Navigation")

    nav_cols = st.columns(3)
    with nav_cols[0]:
        st.info("**📋 VTCO Process Map**\n\nExplore all 36 MLDLC steps with Verb-Task-Constraint-Outcome definitions")
        if st.button("Open Process Map", key="nav_process"):
            st.switch_page("pages/01_VTCO_Process_Map.py")
    with nav_cols[1]:
        st.info("**🎯 Risk Matrix**\n\nView RED/YELLOW/GREEN risk classification with decision criteria")
        if st.button("Open Risk Matrix", key="nav_risk"):
            st.switch_page("pages/02_Risk_Matrix.py")
    with nav_cols[2]:
        st.info("**📈 Metrics Dashboard**\n\nML-facing and Leadership-facing metrics with impact assessment")
        if st.button("Open Dashboard", key="nav_metrics"):
            st.switch_page("pages/03_ML_Metrics_Dashboard.py")

    st.markdown("---")
    st.subheader("🏗️ Framework Components")
    components = [
        ("📋", "VTCO Process Mapping", "Every MLDLC step defined with Verb, Task, Constraint, and Outcome"),
        ("🎯", "Risk Matrix", "Color-coded criticality assessment (RED/YELLOW/GREEN)"),
        ("🤖", "MCP Server", "LLM layer for transparent insight delivery"),
        ("🕸️", "Knowledge Graph", "Complete artifact taxonomy with validation metrics"),
        ("🛡️", "Guardrails", "Anti-hallucination, latency control, context preservation"),
    ]
    for emoji, title, description in components:
        with st.expander(f"{emoji} {title}"):
            st.write(description)

    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #7a7a8a; font-size: 0.8rem;">
        MLDLC Governance Framework v1.0 | Built with Streamlit
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
