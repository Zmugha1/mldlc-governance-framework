"""Sandy's Dashboard - Morning briefing."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from datetime import datetime
from app.components.sidebar import render_sidebar

st.set_page_config(page_title="Sandy Bot - Dashboard", layout="wide")
render_sidebar()

st.title("Good Morning, Sandy!")
st.subheader(f"{datetime.now().strftime('%A, %B %d, %Y')}")

# Today's schedule
col1, col2 = st.columns(2)

with col1:
    st.markdown("### Today's Schedule")
    today_calls = [
        {"time": "10:00 AM", "client": "Andrea Kelleher", "compartment": "C4", "topic": "Health check-in"},
        {"time": "2:00 PM", "client": "Jim Smith", "compartment": "C3", "topic": "Franchise presentation"},
    ]
    for call in today_calls:
        with st.container():
            st.markdown(f"**{call['time']}** - {call['client']}")
            st.markdown(f"_{call['compartment']}: {call['topic']}_")
            st.divider()

with col2:
    st.markdown("### Pipeline Health")
    pipeline = {
        "IC": {"count": 12, "target": 15},
        "C1": {"count": 8, "target": 10},
        "C2": {"count": 4, "target": 3},
        "C3": {"count": 3, "target": 2},
        "C4": {"count": 2, "target": 1},
        "C5": {"count": 5, "target": None},
    }
    for stage, data in pipeline.items():
        target_str = f"/{data['target']}" if data["target"] else ""
        status = "OK" if data["target"] and data["count"] >= data["target"] else "!"
        st.markdown(f"{status} **{stage}**: {data['count']}{target_str}")

# Hot prospects
st.markdown("### Hot Prospects (Interest 4-5)")
hot_prospects = [
    {"name": "Mike Chen", "compartment": "C3", "interest": 5, "notes": "Ready to move forward"},
    {"name": "Lisa Wong", "compartment": "C2", "interest": 4, "notes": "Spouse meeting scheduled"},
]
for prospect in hot_prospects:
    with st.container():
        cols = st.columns([2, 1, 1, 3])
        cols[0].markdown(f"**{prospect['name']}**")
        cols[1].markdown(f"{prospect['compartment']}")
        cols[2].markdown(f"{'★' * prospect['interest']}")
        cols[3].markdown(f"_{prospect['notes']}_")

# Alerts
st.markdown("### Action Needed")
st.info("3 clients haven't been contacted in 7+ days")
