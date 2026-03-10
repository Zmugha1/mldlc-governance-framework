"""Coaching Helper - DISC tips + I.L.W.E."""
import sys
import json
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from components.sidebar import render_sidebar

render_sidebar()
from utils.styles import CUSTOM_CSS

st.set_page_config(page_title="Coaching Helper", layout="wide")
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.title("💡 Coaching Helper")

disc_path = Path(__file__).resolve().parent.parent / "data" / "disc_profiles.json"
with open(disc_path) as f:
    disc_profiles = json.load(f)

selected_style = st.selectbox("Select DISC Style", ["D", "I", "S", "C"])
profile = disc_profiles.get(selected_style, {})

col1, col2 = st.columns([1, 1])

with col1:
    st.markdown(f"### {selected_style}-Style: {profile.get('name', '')}")
    st.markdown(f"**Traits:** {profile.get('traits', '')}")
    st.markdown("**✅ DO:**")
    for item in profile.get("do", []):
        st.markdown(f"- {item}")
    st.markdown("**❌ DON'T:**")
    for item in profile.get("dont", []):
        st.markdown(f"- {item}")

with col2:
    st.markdown("**Great questions to ask:**")
    for q in profile.get("questions", []):
        st.markdown(f"- {q}")
    st.markdown("**Approach:**")
    st.info(profile.get("approach", ""))

st.markdown("---")
st.markdown("### I.L.W.E. Conversation Starters")
st.markdown("- **Income:** What would financial freedom look like for you?")
st.markdown("- **Lifestyle:** How many hours do you want to work per week?")
st.markdown("- **Wealth:** What legacy do you want to leave?")
st.markdown("- **Equity:** What does owning your business mean to you?")
