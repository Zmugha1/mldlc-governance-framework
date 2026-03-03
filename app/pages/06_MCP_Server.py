"""MCP Server Page - Model Context Protocol interface and documentation"""

import streamlit as st

st.set_page_config(page_title="MCP Server", page_icon="🤖", layout="wide")

st.title("🤖 MLDLC MCP Server")
st.markdown("Model Context Protocol for Transparent ML Insights")

st.markdown("""
The **Model Context Protocol (MCP) Server** acts as the intelligent layer between users and the MLDLC 
knowledge base. It guides LLM behavior to provide transparent, explainable, and contextually accurate 
responses about any ML output or process step.
""")

col1, col2 = st.columns(2)
with col1:
    st.subheader("🎯 Core Functions")
    functions = [
        ("Context Retrieval", "Fetches relevant artifacts, logs, and metadata"),
        ("Lineage Traversal", "Traces data and model lineage from output to source"),
        ("Confidence Scoring", "Attaches confidence levels based on evidence quality"),
        ("Source Attribution", "Cites specific files, schemas, and log entries"),
        ("Drift Detection", "Flags when outputs may be affected by detected drift"),
    ]
    for name, desc in functions:
        with st.expander(f"**{name}**"):
            st.write(desc)

with col2:
    st.subheader("🛡️ Guardrails")
    guardrails = [
        ("Source Grounding", "Every claim cites specific files with hash verification"),
        ("Confidence Scoring", "Responses include confidence based on evidence"),
        ("Triangulation", "High-stakes claims require 3+ sources"),
        ("Human Escalation", "Auto-escalation when confidence <70%"),
    ]
    for name, desc in guardrails:
        with st.expander(f"**{name}**"):
            st.write(desc)

st.markdown("---")
st.subheader("🔧 MCP Tools")
tools = [
    {"name": "get_lineage", "description": "Trace data/model lineage from output back to source", "params": "entity_id, direction, depth"},
    {"name": "validate_artifact", "description": "Validate artifact against schema", "params": "artifact_type, artifact_data"},
    {"name": "check_drift", "description": "Check if model has experienced drift", "params": "model_id, metric, time_range"},
    {"name": "get_confidence", "description": "Get confidence score for a claim", "params": "claim_type, entity_id"},
]
for tool in tools:
    with st.expander(f"**{tool['name']}** - {tool['description']}"):
        st.write(f"**Parameters:** {tool['params']}")

st.markdown("---")
st.subheader("📊 Confidence Levels")
st.dataframe([
    {"Level": "Very High (95-100%)", "Behavior": "Direct answer with full citation"},
    {"Level": "High (80-94%)", "Behavior": "Direct answer with minor qualification"},
    {"Level": "Medium (60-79%)", "Behavior": "Answer with explicit confidence statement"},
    {"Level": "Low (<60%)", "Behavior": "Decline to answer, escalate to human"},
], use_container_width=True, hide_index=True)
