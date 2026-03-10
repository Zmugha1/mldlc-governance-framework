"""Individual client view with DISC, I.L.W.E., flags."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import json
from app.components.sidebar import render_sidebar

st.set_page_config(page_title="Client Profile", layout="wide")
render_sidebar()

st.title("Client Profile")

# Load sample clients
data_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_clients.json"
if data_path.exists():
    with open(data_path) as f:
        clients = json.load(f)
else:
    clients = []

client_names = [c["name"] for c in clients] if clients else ["Andrea Kelleher"]
preselect = st.session_state.get("profile_client_name")
if preselect and preselect in client_names:
    default_idx = client_names.index(preselect)
    selected = st.selectbox("Select Client", client_names, index=default_idx)
else:
    selected = st.selectbox("Select Client", client_names)

client = next((c for c in clients if c["name"] == selected), None)
if not client and clients:
    client = clients[0]

if client:
    col1, col2, col3 = st.columns([2, 1, 1])
    col1.header(client["name"])
    col2.metric("Compartment", client.get("compartment", "-"))
    col3.metric("Interest", f"{client.get('interest', 0)}/5")

    tab1, tab2, tab3, tab4 = st.tabs(["Overview", "DISC Profile", "I.L.W.E. Goals", "Flags"])

    with tab1:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### Overview")
            st.markdown(f"- Status: {client.get('status', 'Active')}")
            st.markdown(f"- Last Contact: {client.get('last_contact', '-')}")
            st.markdown(f"- Next Action: {client.get('next_action', '-')}")
        with col2:
            st.markdown("### Contact")
            st.markdown(f"- Email: {client.get('email', '-')}")
            st.markdown(f"- Phone: {client.get('phone', '-')}")

    with tab2:
        disc = client.get("disc", {})
        style = disc.get("style", "I")
        st.markdown(f"### DISC Profile: {style}-Style")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Scores**")
            st.markdown(f"- D: {disc.get('d_score', 0)}")
            st.markdown(f"- I: {disc.get('i_score', 0)}")
            st.markdown(f"- S: {disc.get('s_score', 0)}")
            st.markdown(f"- C: {disc.get('c_score', 0)}")
        with col2:
            from src.knowledge.foundation import DISC_STYLES
            tips = DISC_STYLES.get(style, DISC_STYLES["I"])
            st.markdown("**Coaching Tips**")
            for t in tips.get("coaching", []):
                st.markdown(f"- {t}")

    with tab3:
        ilwe = client.get("ilwe", {})
        st.markdown("### I.L.W.E. Goals")
        st.markdown(f"- **Income:** {ilwe.get('income', '-')}")
        st.markdown(f"- **Lifestyle:** {ilwe.get('lifestyle', '-')}")
        st.markdown(f"- **Wealth:** {ilwe.get('wealth', '-')}")
        st.markdown(f"- **Equity:** {ilwe.get('equity', '-')}")

    with tab4:
        st.markdown("### Red Flags")
        for f in client.get("red_flags", []):
            st.error(f)
        st.markdown("### Green Flags")
        for f in client.get("green_flags", []):
            st.success(f)
else:
    st.info("No client data. Add sample_clients.json to data/.")
