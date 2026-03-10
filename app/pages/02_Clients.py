"""All clients list."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import json
from app.components.sidebar import render_sidebar

st.set_page_config(page_title="Clients", layout="wide")
render_sidebar()

st.title("All Clients")

# Load sample clients (from JSON - DB may be empty)
data_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_clients.json"
if data_path.exists():
    with open(data_path) as f:
        clients = json.load(f)
else:
    clients = []

if clients:
    for c in clients:
        with st.container():
            cols = st.columns([2, 1, 1, 2, 1])
            cols[0].markdown(f"**{c['name']}**")
            cols[1].metric("Compartment", c.get("compartment", "-"))
            cols[2].metric("Interest", f"{c.get('interest', 0)}/5")
            cols[3].markdown(f"Next: {c.get('next_action', '-')}")
            if cols[4].button("View Profile", key=c["id"]):
                st.session_state["profile_client_name"] = c["name"]
                st.switch_page("pages/03_Client_Profile.py")
            st.divider()
else:
    st.info("No clients yet. Add sample data or import clients.")
