"""Knowledge Graph Page - Interactive entity exploration"""

import streamlit as st
import networkx as nx
from pathlib import Path

st.set_page_config(page_title="Knowledge Graph", page_icon="🕸️", layout="wide")

st.title("🕸️ MLDLC Knowledge Graph")
st.markdown("Interactive exploration of entities, relationships, and lineage")

entity_types = {
    "MLDLC_Step": {"color": "#1E3A5F", "icon": "📋"},
    "Artifact": {"color": "#4A90A4", "icon": "📎"},
    "Metric": {"color": "#2E7D4A", "icon": "📊"},
    "Model": {"color": "#8B2635", "icon": "🤖"},
    "Dataset": {"color": "#B8860B", "icon": "💾"},
    "Validation_Gate": {"color": "#6B4C9A", "icon": "✅"},
}

@st.cache_data
def build_sample_graph():
    G = nx.DiGraph()
    nodes = [
        ("step_1.1", {"type": "MLDLC_Step", "label": "DEFINE Business Problem", "phase": "P1"}),
        ("step_2.1", {"type": "MLDLC_Step", "label": "INGEST Raw Data", "phase": "P2"}),
        ("step_3.1", {"type": "MLDLC_Step", "label": "SELECT Algorithm", "phase": "P3"}),
        ("charter_001", {"type": "Artifact", "label": "Problem Charter", "status": "approved"}),
        ("dataset_001", {"type": "Dataset", "label": "Customer Data", "quality": "high"}),
        ("model_001", {"type": "Model", "label": "Churn Predictor v1", "status": "production"}),
        ("metric_accuracy", {"type": "Metric", "label": "Accuracy", "value": "0.92"}),
        ("gate_approval", {"type": "Validation_Gate", "label": "Production Gate", "status": "passed"}),
    ]
    for node_id, attrs in nodes:
        G.add_node(node_id, **attrs)
    edges = [
        ("step_1.1", "charter_001", "PRODUCES"),
        ("step_2.1", "dataset_001", "PRODUCES"),
        ("step_3.1", "model_001", "PRODUCES"),
        ("model_001", "metric_accuracy", "GENERATES"),
        ("gate_approval", "model_001", "VALIDATES"),
        ("step_1.1", "step_2.1", "PRECEDES"),
        ("step_2.1", "step_3.1", "PRECEDES"),
    ]
    for source, target, rel_type in edges:
        G.add_edge(source, target, relationship=rel_type)
    return G

G = build_sample_graph()

st.sidebar.header("🔍 Graph Controls")
selected_types = st.sidebar.multiselect("Entity Types", options=list(entity_types.keys()), default=list(entity_types.keys()))
filtered_nodes = [n for n, attr in G.nodes(data=True) if attr.get("type") in selected_types]
subgraph = G.subgraph(filtered_nodes)

st.subheader("Graph Summary")
st.write(f"**Nodes:** {subgraph.number_of_nodes()} | **Edges:** {subgraph.number_of_edges()}")

st.markdown("---")
st.subheader("Entity Relationships")
for source, target, data in subgraph.edges(data=True):
    rel = data.get("relationship", "")
    st.markdown(f"`{source}` → **{rel}** → `{target}`")

st.markdown("---")
st.subheader("Entity Types Legend")
cols = st.columns(3)
for i, (entity_type, style) in enumerate(entity_types.items()):
    with cols[i % 3]:
        st.markdown(f"**{style['icon']} {entity_type}** - {style['color']}")
