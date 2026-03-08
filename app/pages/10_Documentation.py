"""
Documentation - Complete MLDLC framework guide
"""
import streamlit as st
from pathlib import Path

st.set_page_config(page_title="Documentation", page_icon="📖", layout="wide")

st.title("📖 MLDLC Documentation")
st.markdown("Complete guide for the Machine Learning Development Lifecycle Governance Framework.")

tabs = st.tabs(["Overview", "VTCO", "Risk Matrix", "MCP Tools", "Quick Start", "FAQ"])

with tabs[0]:
    st.subheader("Framework Overview")
    st.markdown("""
    The **MLDLC Governance Framework** ensures all ML/data initiatives are:
    - **Transparent** - Every decision is explainable
    - **Explainable** - Clear reasoning for all actions
    - **Auditable** - Complete decision trail
    - **Traceable** - Full data lineage
    """)
    st.markdown("**Core components:** VTCO Process Map, Risk Matrix, MCP Server, Knowledge Graph, Artifact Validator, Lineage Tracker, Drift Monitor.")

with tabs[1]:
    st.subheader("VTCO Methodology")
    st.markdown("**V**erb → **T**ask → **C**onstraint → **O**utcome")
    st.markdown("Every MLDLC step is defined with these four elements. Use the **VTCO Process Map** page to explore all 36 steps.")

with tabs[2]:
    st.subheader("Risk Matrix")
    st.markdown("""
    | Level | Use Case |
    |-------|----------|
    | 🔴 **RED** | Production deployment, customer-facing, high financial impact |
    | 🟡 **YELLOW** | Staging, internal tools, medium impact |
    | 🟢 **GREEN** | Development, docs, tests, low impact |
    """)
    st.markdown("Use the **Risk Matrix** page for full classification criteria.")

with tabs[3]:
    st.subheader("MCP Tools")
    st.markdown("The MCP Server provides tools for Cursor and other AI assistants. Use the **MCP Server** page to explore available tools.")

with tabs[4]:
    st.subheader("Quick Start")
    st.code("streamlit run app/app.py", language="bash")
    st.markdown("Or from project root: `streamlit run app/main.py`")

with tabs[5]:
    st.subheader("FAQ")
    with st.expander("What is VTCO?"):
        st.markdown("Verb-Task-Constraint-Outcome: a structured way to define every MLDLC step.")
    with st.expander("How do I use the Risk Matrix?"):
        st.markdown("Go to the Risk Matrix page. Classify your change by scope, data sensitivity, and impact.")
    with st.expander("Where is the MCP server?"):
        st.markdown("The MCP Server page shows configuration. Run `python run_mcp.py` for stdio transport.")
