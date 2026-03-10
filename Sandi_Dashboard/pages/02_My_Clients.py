"""My Clients - Client cards with filters."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from components.sidebar import render_sidebar

render_sidebar()
from utils.database import get_all_clients
from utils.styles import CUSTOM_CSS
from components.client_card import render_client_card

st.set_page_config(page_title="My Clients", layout="wide")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("👥 My Clients")

clients = get_all_clients()

filter_col1, filter_col2, filter_col3 = st.columns([1, 1, 2])
with filter_col1:
    comp_filter = st.selectbox("Compartment", ["All", "IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"])
with filter_col2:
    disc_filter = st.selectbox("DISC", ["All", "D", "I", "S", "C"])
with filter_col3:
    search = st.text_input("🔍 Search", placeholder="Type name...")

filtered = clients
if comp_filter != "All":
    filtered = [c for c in filtered if c.get("compartment") == comp_filter]
if disc_filter != "All":
    filtered = [c for c in filtered if c.get("disc_style") == disc_filter]
if search:
    filtered = [c for c in filtered if search.lower() in c.get("name", "").lower()]

st.markdown("---")

for c in filtered:
    render_client_card(c)
