"""Coaching Helper - AI coaching guidance."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import json
from app.components.sidebar import render_sidebar

st.set_page_config(page_title="Coaching Helper", layout="wide")
render_sidebar()

st.title("Coaching Helper")

# Load clients for selector
data_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_clients.json"
clients = []
if data_path.exists():
    with open(data_path) as f:
        clients = json.load(f)

client_names = [c["name"] for c in clients] if clients else ["Andrea Kelleher", "Jim Smith", "Lisa Wong"]
client = st.selectbox("Select Client", client_names)
question = st.text_input("Ask a coaching question:", placeholder="e.g., How should I coach Andrea?")

if question:
    st.markdown("### Suggested Response")
    # Use knowledge base for DISC-based guidance
    from src.knowledge.foundation import DISC_STYLES

    c = next((x for x in clients if x["name"] == client), clients[0] if clients else None)
    style = c.get("disc", {}).get("style", "I") if c else "I"
    tips = DISC_STYLES.get(style, DISC_STYLES["I"])

    st.markdown(f"Based on **{client}**'s DISC profile ({style}-Style):")
    st.markdown("")
    for i, t in enumerate(tips.get("coaching", []), 1):
        st.markdown(f"{i}. **{t.upper()}**")
    st.markdown("")
    st.markdown("**Questions to ask:**")
    for q in tips.get("questions", []):
        st.markdown(f"- {q}")
