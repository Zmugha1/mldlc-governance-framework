"""
SandyStahl Bot - Two-Dashboard System
Sandy's Coaching Dashboard + MLDLC Governance Framework
"""

import streamlit as st
import json
from pathlib import Path

st.set_page_config(
    page_title="SandyStahl Bot",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
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
    with open(process_path, "r") as f:
        return json.load(f)


# Sidebar - Dashboard selector
st.sidebar.title("SandyStahl Bot")

user_type = st.sidebar.radio(
    "Select Dashboard:",
    ["Sandy's Dashboard", "MLDLC Dashboard"],
)

if user_type == "Sandy's Dashboard":
    st.sidebar.markdown("---")
    st.sidebar.markdown("**Sandy's Tools**")
    st.sidebar.page_link("pages/01_Executive_Dashboard.py", label="📊 Executive Dashboard")
    st.sidebar.page_link("pages/18_Client_Profiles.py", label="👤 Client Profiles")
    st.sidebar.page_link("pages/19_Pipeline_Visualizer.py", label="📈 Pipeline")
    st.sidebar.page_link("pages/20_Coaching_Assistant.py", label="💬 Coaching Assistant")

    # Sandy's home content
    st.title("Welcome to SandyStahl Bot!")
    st.markdown("This is your AI-powered coaching companion.")
    st.markdown("**What you can do:**")
    st.markdown("- **Executive Dashboard** - See your day at a glance")
    st.markdown("- **Client Profiles** - Full client information in one place")
    st.markdown("- **Pipeline Visualizer** - Track where clients are")
    st.markdown("- **Coaching Assistant** - Get AI-powered coaching guidance")

else:
    st.sidebar.markdown("---")
    st.sidebar.markdown("**MLDLC Tools**")
    st.sidebar.page_link("pages/01_VTCO_Process_Map.py", label="📋 VTCO Process")
    st.sidebar.page_link("pages/04_Leadership_Dashboard.py", label="📈 MLDLC Metrics")
    st.sidebar.page_link("pages/14_Monitoring_Dashboard.py", label="📊 Monitoring")
    st.sidebar.page_link("pages/15_AIBOM_Generator.py", label="📋 AIBOM")

    # MLDLC home content
    st.markdown('<div class="main-header">🛡️ MLDLC Governance Dashboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Developer/consultant dashboard for tracking POC progress</div>', unsafe_allow_html=True)
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
    st.subheader("📖 Documentation & Search")
    doc_cols = st.columns(5)
    with doc_cols[0]:
        if st.button("Open Documentation", key="nav_docs"):
            st.switch_page("pages/10_Documentation.py")
    with doc_cols[1]:
        if st.button("Open RAG Knowledge Search", key="nav_rag"):
            st.switch_page("pages/11_RAG.py")
    with doc_cols[2]:
        if st.button("Open GraphRAG", key="nav_graphrag"):
            st.switch_page("pages/12_GraphRAG.py")
    with doc_cols[3]:
        if st.button("Open LLM Router", key="nav_llm"):
            st.switch_page("pages/13_LLM_Router.py")
    with doc_cols[4]:
        if st.button("Open Monitoring Dashboard", key="nav_monitoring"):
            st.switch_page("pages/14_Monitoring_Dashboard.py")

    st.markdown("---")
    st.subheader("🏭 MLOps & Compliance")
    mlops_cols = st.columns(3)
    with mlops_cols[0]:
        if st.button("Open AIBOM Generator", key="nav_aibom"):
            st.switch_page("pages/15_AIBOM_Generator.py")
    with mlops_cols[1]:
        if st.button("Open Feature Store", key="nav_feature_store"):
            st.switch_page("pages/16_Feature_Store.py")
    with mlops_cols[2]:
        if st.button("Open Model Registry", key="nav_model_registry"):
            st.switch_page("pages/17_Model_Registry.py")

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
        MLDLC Governance Framework v1.0 | SandyStahl Bot POC | Built with Streamlit
    </div>
    """, unsafe_allow_html=True)
