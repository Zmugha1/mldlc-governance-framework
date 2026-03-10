"""Pipeline - 8-stage funnel visualization."""
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
from components.pipeline_funnel import render_pipeline_funnel

st.set_page_config(page_title="Pipeline", layout="wide")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("📈 Pipeline")

clients = get_all_clients()
counts = {}
for c in clients:
    comp = c.get("compartment", "IC")
    counts[comp] = counts.get(comp, 0) + 1

stages = ["IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"]
for s in stages:
    if s not in counts:
        counts[s] = 0

render_pipeline_funnel(counts)

st.markdown("### Stage Definitions")
st.markdown("- **IC** = Initial Contact (first meeting)")
st.markdown("- **C1** = Education (learning about franchises)")
st.markdown("- **C1.1** = Deep Education (narrowing down)")
st.markdown("- **C2** = Validation (researching specific brands)")
st.markdown("- **C3** = Decision (serious consideration)")
st.markdown("- **C4** = Commitment (ready to move forward)")
st.markdown("- **C5** = Launch (signed, starting up)")
st.markdown("- **CLOSED** = Completed (deal done or lost)")
