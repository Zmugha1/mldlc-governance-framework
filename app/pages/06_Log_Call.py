"""Quick call logging."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import json
from app.components.sidebar import render_sidebar

st.set_page_config(page_title="Log Call", layout="wide")
render_sidebar()

st.title("Log Call")

# Load clients
data_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_clients.json"
clients = []
if data_path.exists():
    with open(data_path) as f:
        clients = json.load(f)

client_names = [c["name"] for c in clients] if clients else ["Andrea Kelleher", "Jim Smith", "Lisa Wong"]
client_id_map = {c["name"]: c["id"] for c in clients}

client_name = st.selectbox("Client", client_names)
duration = st.number_input("Duration (minutes)", min_value=1, max_value=120, value=30)
notes = st.text_area("Notes", placeholder="Key points from the call...")

if st.button("Log Call"):
    try:
        from src.database import SandyDatabase
        db = SandyDatabase()
        cid = client_id_map.get(client_name, "unknown")
        db.add_call(cid, duration, notes)
        st.success(f"Call logged for {client_name} ({duration} min)")
    except Exception as e:
        st.error(f"Could not save: {e}")
        st.info("Call logged (demo mode - database may not be initialized)")
